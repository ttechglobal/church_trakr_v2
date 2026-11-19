-- Applied 2026-11-19. Removed rows belonging to 8 churches that no longer exist
-- (530 members, 770 attendance records, etc.; backed up locally first), then added the
-- missing foreign keys so a church delete can never leave rows behind again.
-- 2) Add the missing foreign keys so this can never happen again.

DELETE FROM attendance_records r USING attendance_sessions s
 WHERE s.id = r.session_id AND NOT EXISTS (SELECT 1 FROM churches c WHERE c.id = s.church_id);
DELETE FROM attendance_sessions x WHERE NOT EXISTS (SELECT 1 FROM churches c WHERE c.id = x.church_id);
DELETE FROM ft_attendance        x WHERE NOT EXISTS (SELECT 1 FROM churches c WHERE c.id = x.church_id);
DELETE FROM members              x WHERE NOT EXISTS (SELECT 1 FROM churches c WHERE c.id = x.church_id);
DELETE FROM first_timers         x WHERE NOT EXISTS (SELECT 1 FROM churches c WHERE c.id = x.church_id);
DELETE FROM groups               x WHERE NOT EXISTS (SELECT 1 FROM churches c WHERE c.id = x.church_id);
DELETE FROM sms_logs             x WHERE NOT EXISTS (SELECT 1 FROM churches c WHERE c.id = x.church_id);

ALTER TABLE members             ADD CONSTRAINT members_church_id_fkey             FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE groups              ADD CONSTRAINT groups_church_id_fkey              FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE first_timers        ADD CONSTRAINT first_timers_church_id_fkey        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE ft_attendance       ADD CONSTRAINT ft_attendance_church_id_fkey       FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE sms_logs            ADD CONSTRAINT sms_logs_church_id_fkey            FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_church_id_fkey FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
