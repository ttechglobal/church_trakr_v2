-- Account deletion: remove EVERYTHING belonging to a church in one transaction.
-- Seven tables (members, groups, first_timers, ft_attendance, sms_logs,
-- attendance_sessions, admin_audit_log) have no FK to churches, so deleting the
-- church row alone leaves their rows behind. This function is the single place
-- that knows the full list. Either all of it is deleted or none of it is.

CREATE OR REPLACE FUNCTION public.delete_church_data(p_church uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n_records  int; n_sessions int; n_ft_att int; n_members int;
  n_ft       int; n_groups   int; n_sms    int; n_support int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM churches WHERE id = p_church) THEN
    RAISE EXCEPTION 'church_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Children first
  DELETE FROM attendance_records
   WHERE session_id IN (SELECT id FROM attendance_sessions WHERE church_id = p_church);
  GET DIAGNOSTICS n_records = ROW_COUNT;

  DELETE FROM attendance_sessions WHERE church_id = p_church;  GET DIAGNOSTICS n_sessions = ROW_COUNT;
  DELETE FROM ft_attendance       WHERE church_id = p_church;  GET DIAGNOSTICS n_ft_att   = ROW_COUNT;
  DELETE FROM members             WHERE church_id = p_church;  GET DIAGNOSTICS n_members  = ROW_COUNT;
  DELETE FROM first_timers        WHERE church_id = p_church;  GET DIAGNOSTICS n_ft       = ROW_COUNT;
  DELETE FROM groups              WHERE church_id = p_church;  GET DIAGNOSTICS n_groups   = ROW_COUNT;
  DELETE FROM sms_logs            WHERE church_id = p_church;  GET DIAGNOSTICS n_sms      = ROW_COUNT;
  -- support_messages is ON DELETE SET NULL (would keep the message text); erase it
  DELETE FROM support_messages    WHERE church_id = p_church;  GET DIAGNOSTICS n_support  = ROW_COUNT;

  -- Subgroup links in BOTH directions, plus everything else that cascades from churches
  -- (follow_up_entries, sms_templates, notification_logs, push_subscriptions, usage_logs,
  --  sender_id_requests, credit_transactions, manual_transfer_requests, church_connections)
  DELETE FROM churches WHERE id = p_church;

  -- Keep a minimal audit trail (no personal data: just that it happened, and counts)
  INSERT INTO admin_audit_log (admin_id, action_type, target_church_id, details)
  VALUES ('self_service', 'account_deleted', p_church,
          jsonb_build_object('members', n_members, 'groups', n_groups, 'sessions', n_sessions,
                             'records', n_records, 'first_timers', n_ft, 'sms_logs', n_sms));

  RETURN jsonb_build_object('members', n_members, 'groups', n_groups, 'sessions', n_sessions,
                            'records', n_records, 'firstTimers', n_ft, 'smsLogs', n_sms,
                            'supportMessages', n_support);
END $$;

REVOKE ALL ON FUNCTION public.delete_church_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_church_data(uuid) TO service_role;
