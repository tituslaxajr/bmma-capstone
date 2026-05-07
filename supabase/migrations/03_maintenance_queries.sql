-- ══════════════════════════════════════════════════════════════════════════════
-- CapstonePH Maintenance & Data Quality Queries
-- Common queries for data validation and cleanup
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────────────────────

-- Function to find duplicate emails
CREATE OR REPLACE FUNCTION find_duplicate_emails()
RETURNS TABLE(email TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.email, COUNT(*)::BIGINT as count
  FROM user_profiles u
  GROUP BY u.email
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate group numbers
CREATE OR REPLACE FUNCTION find_duplicate_group_numbers()
RETURNS TABLE(number INTEGER, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT g.number, COUNT(*)::BIGINT as count
  FROM groups g
  GROUP BY g.number
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get orphaned submissions (submissions without valid groups)
CREATE OR REPLACE FUNCTION find_orphaned_submissions()
RETURNS TABLE(
  id INTEGER,
  group_number INTEGER,
  submitted_at TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.group_number, s.submitted_at, s.status
  FROM submissions s
  WHERE NOT EXISTS (
    SELECT 1 FROM groups g WHERE g.number = s.group_number
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get orphaned grades
CREATE OR REPLACE FUNCTION find_orphaned_grades()
RETURNS TABLE(
  id INTEGER,
  group_number INTEGER,
  panelist_id TEXT,
  total_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT gr.id, gr.group_number, gr.panelist_id, gr.total_score
  FROM grades gr
  WHERE NOT EXISTS (
    SELECT 1 FROM groups g WHERE g.number = gr.group_number
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get stale defenses (past date but still "Scheduled")
CREATE OR REPLACE FUNCTION find_stale_defenses()
RETURNS TABLE(
  id INTEGER,
  group_number INTEGER,
  date DATE,
  time TEXT,
  location TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.group_number, d.date, d.time, d.location, d.status
  FROM defenses d
  WHERE d.date < CURRENT_DATE
    AND d.status = 'Scheduled';
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue deadlines
CREATE OR REPLACE FUNCTION find_overdue_deadlines()
RETURNS TABLE(
  id INTEGER,
  title TEXT,
  due_date DATE,
  status TEXT,
  milestone_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.title, d.due_date, d.status, d.milestone_id
  FROM deadlines d
  WHERE d.due_date < CURRENT_DATE
    AND d.status NOT IN ('completed', 'rejected');
END;
$$ LANGUAGE plpgsql;

-- Function to get groups without advisers
CREATE OR REPLACE FUNCTION find_groups_without_advisers()
RETURNS TABLE(
  id INTEGER,
  number INTEGER,
  name TEXT,
  title TEXT,
  adviser TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.number, g.name, g.title, g.adviser
  FROM groups g
  WHERE g.adviser IS NULL OR g.adviser = '—' OR g.adviser = '';
END;
$$ LANGUAGE plpgsql;

-- Function to get inactive users with recent activity
CREATE OR REPLACE FUNCTION find_inactive_users_with_activity()
RETURNS TABLE(
  user_id TEXT,
  name TEXT,
  email TEXT,
  status TEXT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.status,
    MAX(te.timestamp) as last_activity
  FROM user_profiles u
  JOIN timeline_events te ON u.id = te.user_id
  WHERE u.status = 'Inactive'
    AND te.timestamp > NOW() - INTERVAL '30 days'
  GROUP BY u.id, u.name, u.email, u.status;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate group submission progress
CREATE OR REPLACE FUNCTION get_group_submission_progress(p_group_number INTEGER)
RETURNS TABLE(
  group_number INTEGER,
  total_submissions INTEGER,
  approved_submissions INTEGER,
  pending_submissions INTEGER,
  rejected_submissions INTEGER,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_group_number,
    COUNT(*)::INTEGER as total_submissions,
    COUNT(*) FILTER (WHERE s.status = 'approved')::INTEGER as approved_submissions,
    COUNT(*) FILTER (WHERE s.status = 'pending')::INTEGER as pending_submissions,
    COUNT(*) FILTER (WHERE s.status = 'rejected')::INTEGER as rejected_submissions,
    ROUND(
      (COUNT(*) FILTER (WHERE s.status = 'approved')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as completion_rate
  FROM submissions s
  WHERE s.group_number = p_group_number;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- DATA CLEANUP PROCEDURES
-- ────────────────────────────────────────────────────────────────────────────

-- Clean up old notifications (older than 90 days and read)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE read = true
    AND time < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Archive completed groups
CREATE OR REPLACE FUNCTION archive_completed_groups()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER := 0;
  group_rec RECORD;
BEGIN
  FOR group_rec IN 
    SELECT * FROM groups 
    WHERE status = 'Completed' AND deleted_at IS NULL
  LOOP
    -- Insert into archive_records
    INSERT INTO archive_records (
      type,
      entity_id,
      data,
      archived_at,
      archived_by
    ) VALUES (
      'group',
      group_rec.id::TEXT,
      row_to_json(group_rec)::JSONB,
      NOW(),
      'system'
    );
    
    -- Soft delete the group
    UPDATE groups
    SET deleted_at = NOW(), status = 'Archived'
    WHERE id = group_rec.id;
    
    archived_count := archived_count + 1;
  END LOOP;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Update stale defense statuses
CREATE OR REPLACE FUNCTION update_stale_defenses()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE defenses
  SET status = 'Completed'
  WHERE date < CURRENT_DATE
    AND status = 'Scheduled';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Mark overdue deadlines
CREATE OR REPLACE FUNCTION mark_overdue_deadlines()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE deadlines
  SET status = 'overdue'
  WHERE due_date < CURRENT_DATE
    AND status NOT IN ('completed', 'rejected', 'overdue');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- ANALYTICS QUERIES (use directly in Supabase Dashboard)
-- ────────────────────────────────────────────────────────────────────────────

-- Query 1: Group submission statistics
-- Shows submission counts and approval rates per group
/*
SELECT 
  g.id,
  g.number,
  g.name,
  g.title,
  g.status,
  COUNT(DISTINCT s.id) as total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'approved' THEN s.id END) as approved_submissions,
  ROUND(
    (COUNT(DISTINCT CASE WHEN s.status = 'approved' THEN s.id END)::NUMERIC / 
     NULLIF(COUNT(DISTINCT s.id), 0)) * 100,
    2
  ) as approval_rate
FROM groups g
LEFT JOIN submissions s ON g.number = s.group_number
WHERE g.status = 'Active'
GROUP BY g.id, g.number, g.name, g.title, g.status
ORDER BY g.number;
*/

-- Query 2: Panelist workload distribution
-- Shows how many groups each panelist is assigned to
/*
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT pa.group_number) as assigned_groups,
  COUNT(DISTINCT g.id) as graded_groups,
  ROUND(AVG(g.total_score), 2) as avg_score_given
FROM user_profiles u
LEFT JOIN panelist_assignments pa ON u.id = pa.panelist_id
LEFT JOIN grades g ON u.id = g.panelist_id
WHERE u.role = 'panelist' AND u.status = 'Active'
GROUP BY u.id, u.name, u.email
ORDER BY assigned_groups DESC;
*/

-- Query 3: Deadline compliance tracking
-- Shows how many students have completed each deadline
/*
SELECT 
  d.id,
  d.title,
  d.due_date,
  d.status,
  COUNT(DISTINCT dp.user_id) as students_started,
  COUNT(DISTINCT CASE WHEN dp.status = 'submitted' THEN dp.user_id END) as submitted_count,
  COUNT(DISTINCT CASE WHEN dp.status = 'approved' THEN dp.user_id END) as approved_count,
  ROUND(
    (COUNT(DISTINCT CASE WHEN dp.status = 'submitted' THEN dp.user_id END)::NUMERIC / 
     NULLIF(COUNT(DISTINCT dp.user_id), 0)) * 100,
    2
  ) as submission_rate
FROM deadlines d
LEFT JOIN deadline_progress dp ON d.id = dp.deadline_id
WHERE d.status = 'approved'
GROUP BY d.id, d.title, d.due_date, d.status
ORDER BY d.due_date DESC;
*/

-- Query 4: Defense schedule overview
-- Shows all upcoming defenses
/*
SELECT 
  d.id,
  d.date,
  d.time,
  d.location,
  d.status,
  g.number as group_number,
  g.name as group_name,
  g.title as project_title,
  array_agg(DISTINCT pa.panelist_id) as panelists
FROM defenses d
LEFT JOIN groups g ON d.group_number = g.number
LEFT JOIN panelist_assignments pa ON g.number = pa.group_number
WHERE d.date >= CURRENT_DATE
GROUP BY d.id, d.date, d.time, d.location, d.status, g.number, g.name, g.title
ORDER BY d.date, d.time;
*/

-- Query 5: Student activity summary
-- Shows recent activity for each student
/*
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT te.id) as total_events,
  MAX(te.timestamp) as last_activity,
  COUNT(DISTINCT s.id) as total_submissions,
  COUNT(DISTINCT dp.id) as deadlines_started
FROM user_profiles u
LEFT JOIN timeline_events te ON u.id = te.user_id
LEFT JOIN groups g ON u.id = ANY(
  SELECT jsonb_array_elements_text(g.members::jsonb)::TEXT
  FROM groups g
)
LEFT JOIN submissions s ON g.number = s.group_number
LEFT JOIN deadline_progress dp ON u.id = dp.user_id
WHERE u.role = 'student' AND u.status = 'Active'
GROUP BY u.id, u.name, u.email
ORDER BY last_activity DESC NULLS LAST;
*/

-- Query 6: Plagiarism check summary
-- Shows plagiarism analysis results
/*
SELECT 
  g.number as group_number,
  g.name as group_name,
  pr.analyzed_at,
  pr.overall_similarity,
  pr.max_similarity,
  pr.compared_against,
  CASE 
    WHEN pr.overall_similarity > 30 THEN 'High Risk'
    WHEN pr.overall_similarity > 15 THEN 'Medium Risk'
    ELSE 'Low Risk'
  END as risk_level
FROM plagiarism_reports pr
JOIN groups g ON pr.group_number = g.number
ORDER BY pr.analyzed_at DESC;
*/

-- Query 7: Email digest tracking
-- Shows email digest history per user
/*
SELECT 
  u.id,
  u.name,
  u.email,
  dt.type as digest_type,
  dt.sent_at,
  dt.notif_count
FROM digest_tracking dt
JOIN user_profiles u ON dt.user_id = u.id
ORDER BY dt.sent_at DESC
LIMIT 100;
*/

-- Query 8: Audit trail for sensitive operations
-- Shows recent changes to critical tables
/*
SELECT 
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.changed_at,
  al.changed_by,
  (al.new_data - al.old_data) as changes
FROM audit_log al
WHERE al.table_name IN ('grades', 'submissions', 'user_profiles')
ORDER BY al.changed_at DESC
LIMIT 50;
*/

-- ────────────────────────────────────────────────────────────────────────────
-- SCHEDULED MAINTENANCE (Run these periodically)
-- ────────────────────────────────────────────────────────────────────────────

-- To run maintenance, execute these in Supabase SQL Editor:

-- Clean old notifications (returns count of deleted records)
-- SELECT cleanup_old_notifications();

-- Update stale defenses
-- SELECT update_stale_defenses();

-- Mark overdue deadlines
-- SELECT mark_overdue_deadlines();

-- Archive completed groups
-- SELECT archive_completed_groups();

-- ────────────────────────────────────────────────────────────────────────────
-- BACKUP VERIFICATION QUERIES
-- ────────────────────────────────────────────────────────────────────────────

-- Verify all critical tables have data
/*
SELECT 
  'user_profiles' as table_name, COUNT(*) as record_count FROM user_profiles
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
UNION ALL
SELECT 'submissions', COUNT(*) FROM submissions
UNION ALL
SELECT 'defenses', COUNT(*) FROM defenses
UNION ALL
SELECT 'deadlines', COUNT(*) FROM deadlines
UNION ALL
SELECT 'grades', COUNT(*) FROM grades
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'announcements', COUNT(*) FROM announcements
ORDER BY record_count DESC;
*/

-- Verify referential integrity
/*
SELECT 
  'Orphaned Submissions' as check_type,
  COUNT(*) as issue_count
FROM submissions s
WHERE NOT EXISTS (SELECT 1 FROM groups g WHERE g.number = s.group_number)
UNION ALL
SELECT 
  'Orphaned Grades',
  COUNT(*)
FROM grades gr
WHERE NOT EXISTS (SELECT 1 FROM groups g WHERE g.number = gr.group_number)
UNION ALL
SELECT 
  'Orphaned Deadline Progress',
  COUNT(*)
FROM deadline_progress dp
WHERE NOT EXISTS (SELECT 1 FROM deadlines d WHERE d.id = dp.deadline_id)
UNION ALL
SELECT 
  'Stale Defenses',
  COUNT(*)
FROM defenses d
WHERE d.date < CURRENT_DATE AND d.status = 'Scheduled';
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF MAINTENANCE QUERIES
-- ══════════════════════════════════════════════════════════════════════════════
