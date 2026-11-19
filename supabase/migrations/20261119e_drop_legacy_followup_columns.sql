-- Applied 2026-11-19 after the follow_up_entries code was deployed and verified.
-- Aborts (rolls back) if the legacy blobs hold anything the new table doesn't.

DO $$
DECLARE behind int;
BEGIN
  -- one last delta-sync, then require the table to be fully caught up
  PERFORM public.backfill_follow_up_entries();
  SELECT count(*) INTO behind FROM (
    SELECT c.id, e.key FROM churches c, jsonb_each(CASE WHEN jsonb_typeof(c.follow_up_data)='object' THEN c.follow_up_data ELSE '{}'::jsonb END) e
    WHERE NOT EXISTS (SELECT 1 FROM follow_up_entries f WHERE f.church_id=c.id AND f.kind='absentee' AND f.key=e.key)
    UNION ALL
    SELECT c.id, e.key FROM churches c, jsonb_each(CASE WHEN jsonb_typeof(c.attendee_followup_data)='object' THEN c.attendee_followup_data ELSE '{}'::jsonb END) e
    WHERE NOT EXISTS (SELECT 1 FROM follow_up_entries f WHERE f.church_id=c.id AND f.kind='attendee' AND f.key=e.key)
  ) x;
  IF behind > 0 THEN RAISE EXCEPTION 'abort: % legacy entries are not in follow_up_entries', behind; END IF;
END $$;

ALTER TABLE public.churches DROP COLUMN IF EXISTS follow_up_data;
ALTER TABLE public.churches DROP COLUMN IF EXISTS attendee_followup_data;
DROP FUNCTION IF EXISTS public.backfill_follow_up_entries();
