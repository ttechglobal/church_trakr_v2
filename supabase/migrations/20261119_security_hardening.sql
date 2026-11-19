-- ChurchTrakr hardening migration (2026-11-19)
-- Run as a single transaction. All app writes go through the service role, except
-- followup/save which updates two JSONB columns on churches with the user's session.

-- ═══ 1. Credit functions: service role only ═══════════════════════════════════
-- admin_add_credits was executable by anon/authenticated => anyone could mint credits.
REVOKE ALL ON FUNCTION public.admin_add_credits(uuid, integer, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_sms_credits(uuid, integer)                  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text, uuid, text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.deduct_sms_credits(uuid, integer)                  TO service_role;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;

-- Pin search_path on SECURITY DEFINER functions
ALTER FUNCTION public.admin_add_credits(uuid, integer, text, uuid, text) SET search_path = public;
ALTER FUNCTION public.deduct_sms_credits(uuid, integer)                  SET search_path = public;
ALTER FUNCTION public.my_church_id()                                     SET search_path = public;
REVOKE ALL ON FUNCTION public.my_church_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.my_church_id() TO authenticated, service_role;

-- ═══ 2. Table privileges ══════════════════════════════════════════════════════
-- anon has no business touching app tables (signup/login use Supabase Auth only).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
-- TRUNCATE / TRIGGER / REFERENCES are never needed by signed-in clients.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;

-- churches: a signed-in admin could previously UPDATE sms_credits/plan directly.
REVOKE INSERT, UPDATE, DELETE ON public.churches FROM authenticated;
GRANT  UPDATE (follow_up_data, attendee_followup_data) ON public.churches TO authenticated;

-- Money / audit tables are server-only.
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions, public.manual_transfer_requests,
       public.admin_audit_log, public.paystack_webhook_log FROM authenticated;
REVOKE ALL ON public.admin_audit_log, public.paystack_webhook_log, public.manual_transfer_requests FROM authenticated;

-- ═══ 3. Cross-tenant policy leaks ═════════════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users read usage_logs"      ON public.usage_logs;
DROP POLICY IF EXISTS "Authenticated read support messages"      ON public.support_messages;
DROP POLICY IF EXISTS "Authenticated update support messages"    ON public.support_messages;

-- ═══ 4. Integrity ═════════════════════════════════════════════════════════════
ALTER TABLE public.churches ADD CONSTRAINT churches_sms_credits_nonneg CHECK (sms_credits >= 0);

-- Remove duplicate (session, member) attendance rows (keep the newest), then enforce.
DELETE FROM public.attendance_records a
USING public.attendance_records b
WHERE a.member_id IS NOT NULL
  AND a.session_id = b.session_id AND a.member_id = b.member_id
  AND (a.created_at, a.id) < (b.created_at, b.id);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_session_member_key
  ON public.attendance_records (session_id, member_id) WHERE member_id IS NOT NULL;

-- ═══ 5. Atomic attendance save ════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.save_attendance(
  p_church_id uuid, p_group_id uuid, p_date date, p_session_id uuid, p_records jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_session uuid;
  v_total   int;
  v_present int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND church_id = p_church_id) THEN
    RAISE EXCEPTION 'group_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_session_id IS NOT NULL THEN
    SELECT id INTO v_session FROM attendance_sessions
     WHERE id = p_session_id AND church_id = p_church_id AND group_id = p_group_id
     FOR UPDATE;
    IF v_session IS NULL THEN
      RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    INSERT INTO attendance_sessions (church_id, group_id, date)
    VALUES (p_church_id, p_group_id, p_date)
    ON CONFLICT (group_id, date) DO UPDATE SET date = EXCLUDED.date
    RETURNING id INTO v_session;
  END IF;

  DELETE FROM attendance_records WHERE session_id = v_session;

  -- Only members of this church; one row per member (last one in the payload wins).
  INSERT INTO attendance_records (session_id, member_id, name, present)
  SELECT DISTINCT ON (r.member_id) v_session, r.member_id, COALESCE(r.name, m.name, ''), COALESCE(r.present, false)
  FROM jsonb_to_recordset(p_records) AS r(member_id uuid, name text, present boolean)
  JOIN members m ON m.id = r.member_id AND m.church_id = p_church_id;

  SELECT count(*), count(*) FILTER (WHERE present) INTO v_total, v_present
  FROM attendance_records WHERE session_id = v_session;

  RETURN jsonb_build_object('sessionId', v_session, 'total', v_total, 'present', v_present);
END;
$$;
REVOKE ALL ON FUNCTION public.save_attendance(uuid, uuid, date, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.save_attendance(uuid, uuid, date, uuid, jsonb) TO service_role;

-- ═══ 6. Index clean-up (duplicates / write amplification) ═════════════════════
DROP INDEX IF EXISTS public.idx_cc_status, public.idx_cc_subgroup_id, public.idx_cc_church_id;
DROP INDEX IF EXISTS public.credit_transactions_reference_idx;        -- dup of unique key
DROP INDEX IF EXISTS public.idx_sir_church, public.idx_sir_status;    -- dup of sender_id_requests_*_idx
DROP INDEX IF EXISTS public.idx_sms_logs_church, public.sms_logs_church_id_idx, public.idx_sms_logs_created;
DROP INDEX IF EXISTS public.idx_members_church_id;                    -- covered by (church_id,status)
DROP INDEX IF EXISTS public.idx_records_session_id;                   -- covered by (session_id,present)
DROP INDEX IF EXISTS public.idx_churches_follow_up_data;              -- GIN on a hot-write blob
DROP INDEX IF EXISTS public.idx_churches_push_subscriptions;
CREATE INDEX IF NOT EXISTS idx_sms_logs_church_created ON public.sms_logs (church_id, created_at DESC);
