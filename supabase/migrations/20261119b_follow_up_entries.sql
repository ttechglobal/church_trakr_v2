-- Follow-ups: move from two JSONB blobs on churches to one row per entry.
--   churches.follow_up_data           -> kind 'absentee'  (also holds reserved keys __team__, __assignments__)
--   churches.attendee_followup_data   -> kind 'attendee'
-- Entry `data` keeps the exact shape the UI already uses, so readers rebuild the same object.
-- The old columns are left in place (no longer written) until the new path is verified.

CREATE TABLE IF NOT EXISTS public.follow_up_entries (
  church_id  uuid        NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  kind       text        NOT NULL CHECK (kind IN ('absentee', 'attendee')),
  key        text        NOT NULL CHECK (length(key) BETWEEN 1 AND 200),
  data       jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, kind, key)
);

-- Server-only table: all access goes through the service role.
ALTER TABLE public.follow_up_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.follow_up_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.follow_up_entries TO service_role;

-- Fast "reached" lookups for the sidebar badge / reports
CREATE INDEX IF NOT EXISTS follow_up_entries_reached_idx
  ON public.follow_up_entries (church_id, kind) WHERE (data->>'reached') = 'true';

-- ── Safe timestamp parse (bad/missing -> fallback) ───────────────────────────
CREATE OR REPLACE FUNCTION public.follow_up_ts(p jsonb, p_fallback timestamptz)
RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF jsonb_typeof(p) = 'object' AND (p->>'updatedAt') ~ '^\d{4}-\d{2}-\d{2}' THEN
    RETURN (p->>'updatedAt')::timestamptz;
  END IF;
  RETURN p_fallback;
EXCEPTION WHEN others THEN
  RETURN p_fallback;
END $$;

-- ── Idempotent backfill / delta-sync from the legacy blobs ───────────────────
-- Safe to re-run: never overwrites a row that is newer than the blob entry.
CREATE OR REPLACE FUNCTION public.backfill_follow_up_entries()
RETURNS integer LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n integer := 0; m integer;
BEGIN
  INSERT INTO follow_up_entries (church_id, kind, key, data, updated_at)
  SELECT c.id, 'absentee', e.key, e.value, public.follow_up_ts(e.value, c.created_at)
  FROM churches c, jsonb_each(CASE WHEN jsonb_typeof(c.follow_up_data) = 'object' THEN c.follow_up_data ELSE '{}'::jsonb END) e
  WHERE length(e.key) BETWEEN 1 AND 200
  ON CONFLICT (church_id, kind, key) DO UPDATE
    SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    WHERE follow_up_entries.updated_at < EXCLUDED.updated_at;
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;

  INSERT INTO follow_up_entries (church_id, kind, key, data, updated_at)
  SELECT c.id, 'attendee', e.key, e.value, public.follow_up_ts(e.value, c.created_at)
  FROM churches c, jsonb_each(CASE WHEN jsonb_typeof(c.attendee_followup_data) = 'object' THEN c.attendee_followup_data ELSE '{}'::jsonb END) e
  WHERE length(e.key) BETWEEN 1 AND 200
  ON CONFLICT (church_id, kind, key) DO UPDATE
    SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    WHERE follow_up_entries.updated_at < EXCLUDED.updated_at;
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;
  RETURN n;
END $$;

-- ── Bulk upsert, newest-wins per key (stale clients can't clobber fresh data) ─
CREATE OR REPLACE FUNCTION public.upsert_follow_up_entries(p_church uuid, p_kind text, p_entries jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF p_kind NOT IN ('absentee', 'attendee') THEN RAISE EXCEPTION 'bad kind'; END IF;
  IF jsonb_typeof(p_entries) <> 'object' THEN RAISE EXCEPTION 'entries must be an object'; END IF;

  INSERT INTO follow_up_entries (church_id, kind, key, data, updated_at)
  SELECT p_church, p_kind, e.key, e.value,
         -- clamp client clocks so a skewed device can't win forever
         LEAST(public.follow_up_ts(e.value, now()), now() + interval '5 minutes')
  FROM jsonb_each(p_entries) e
  WHERE jsonb_typeof(e.value) = 'object'
    AND e.key NOT LIKE '\_\_%'                       -- reserved keys have dedicated routes
    AND length(e.key) BETWEEN 1 AND 200
  ON CONFLICT (church_id, kind, key) DO UPDATE
    SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    WHERE follow_up_entries.updated_at <= EXCLUDED.updated_at;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ── Atomic single-entry mark (reached / note), merged inside the database ────
CREATE OR REPLACE FUNCTION public.mark_follow_up(
  p_church uuid, p_key text, p_reached boolean, p_note text, p_reached_by text
) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_now  text := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_old  jsonb;
  v_reached boolean;
  v_new  jsonb;
BEGIN
  IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 200 OR p_key LIKE '\_\_%' THEN
    RAISE EXCEPTION 'bad key';
  END IF;

  -- Row lock (or create) so concurrent marks serialise
  INSERT INTO follow_up_entries (church_id, kind, key, data)
  VALUES (p_church, 'absentee', p_key, '{}'::jsonb)
  ON CONFLICT (church_id, kind, key) DO NOTHING;

  SELECT data INTO v_old FROM follow_up_entries
   WHERE church_id = p_church AND kind = 'absentee' AND key = p_key FOR UPDATE;

  v_reached := COALESCE(p_reached, (v_old->>'reached')::boolean, false);
  v_new := COALESCE(v_old, '{}'::jsonb) || jsonb_build_object(
    'reached',   v_reached,
    'note',      COALESCE(left(p_note, 2000), v_old->>'note', ''),
    'reachedBy', CASE WHEN v_reached THEN to_jsonb(COALESCE(NULLIF(p_reached_by, ''), v_old->>'reachedBy', 'Team member')) ELSE 'null'::jsonb END,
    'reachedAt', CASE WHEN v_reached THEN to_jsonb(COALESCE(v_old->>'reachedAt', v_now)) ELSE 'null'::jsonb END,
    'updatedAt', v_now
  );

  UPDATE follow_up_entries SET data = v_new, updated_at = now()
   WHERE church_id = p_church AND kind = 'absentee' AND key = p_key;
  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.follow_up_ts(jsonb, timestamptz)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.backfill_follow_up_entries()                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_follow_up_entries(uuid, text, jsonb)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_follow_up(uuid, text, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.follow_up_ts(jsonb, timestamptz)              TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_follow_up_entries()                  TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_follow_up_entries(uuid, text, jsonb)   TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_follow_up(uuid, text, boolean, text, text) TO service_role;

SELECT public.backfill_follow_up_entries();
