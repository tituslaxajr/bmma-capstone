-- ══════════════════════════════════════════════════════════════════════════════
-- CapstonePH Data Integrity Constraints Migration
-- Run this in Supabase Dashboard SQL Editor to add constraints post-KV migration
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- USER_PROFILES: Core user data
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN role SET NOT NULL,
  ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('student', 'panelist', 'adviser', 'coordinator')),
  ADD CONSTRAINT user_profiles_status_check CHECK (status IN ('Active', 'Inactive', 'Archived')),
  ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ────────────────────────────────────────────────────────────────────────────
-- GROUPS: Student capstone groups
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE groups
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN number SET NOT NULL,
  ADD CONSTRAINT groups_number_unique UNIQUE (number),
  ADD CONSTRAINT groups_status_check CHECK (status IN ('Active', 'Completed', 'Archived', 'In Progress'));

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
CREATE INDEX IF NOT EXISTS idx_groups_adviser ON groups(adviser);

-- ────────────────────────────────────────────────────────────────────────────
-- DEFENSES: Defense scheduling
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE defenses
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN date SET NOT NULL,
  ALTER COLUMN time SET NOT NULL,
  ALTER COLUMN location SET NOT NULL,
  ADD CONSTRAINT defenses_status_check CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Postponed'));

-- Add indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_defenses_date ON defenses(date);
CREATE INDEX IF NOT EXISTS idx_defenses_status ON defenses(status);
CREATE INDEX IF NOT EXISTS idx_defenses_group_number ON defenses(group_number);

-- ────────────────────────────────────────────────────────────────────────────
-- ANNOUNCEMENTS: System announcements
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE announcements
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- Add indexes for queries
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- ────────────────────────────────────────────────────────────────────────────
-- DEADLINES: Project deadlines and milestones
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE deadlines
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN due_date SET NOT NULL,
  ADD CONSTRAINT deadlines_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'overdue'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);
CREATE INDEX IF NOT EXISTS idx_deadlines_milestone_id ON deadlines(milestone_id);

-- ────────────────────────────────────────────────────────────────────────────
-- DEADLINE_PROGRESS: Student progress tracking
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE deadline_progress
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN deadline_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT deadline_progress_status_check CHECK (status IN ('not_started', 'in_progress', 'submitted', 'approved', 'revision_needed'));

-- Add indexes and foreign key constraints
CREATE INDEX IF NOT EXISTS idx_deadline_progress_deadline_id ON deadline_progress(deadline_id);
CREATE INDEX IF NOT EXISTS idx_deadline_progress_user_id ON deadline_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_deadline_progress_group_number ON deadline_progress(group_number);

-- Foreign key to deadlines
ALTER TABLE deadline_progress
  ADD CONSTRAINT fk_deadline_progress_deadline
  FOREIGN KEY (deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS: User notifications
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE notifications
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN time SET NOT NULL,
  ALTER COLUMN read SET NOT NULL,
  ALTER COLUMN read SET DEFAULT false;

-- Add indexes for queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(time DESC);

-- Composite index for "unread notifications for user" query
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, time DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- MANUSCRIPT_TEXTS: Stored manuscript content for plagiarism checking
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE manuscript_texts
  ALTER COLUMN group_number SET NOT NULL,
  ALTER COLUMN text SET NOT NULL,
  ALTER COLUMN stored_at SET NOT NULL,
  ADD CONSTRAINT manuscript_texts_group_number_unique UNIQUE (group_number);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_manuscript_texts_group_number ON manuscript_texts(group_number);
CREATE INDEX IF NOT EXISTS idx_manuscript_texts_stored_at ON manuscript_texts(stored_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- PLAGIARISM_REPORTS: Traditional plagiarism check results
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE plagiarism_reports
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN group_number SET NOT NULL,
  ALTER COLUMN analyzed_at SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_group_number ON plagiarism_reports(group_number);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_analyzed_at ON plagiarism_reports(analyzed_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- AI_PLAGIARISM_REPORTS: AI-powered analysis results
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE ai_plagiarism_reports
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN analyzed_at SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_plagiarism_reports_group_number ON ai_plagiarism_reports(group_number);
CREATE INDEX IF NOT EXISTS idx_ai_plagiarism_reports_user_id ON ai_plagiarism_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_plagiarism_reports_analyzed_at ON ai_plagiarism_reports(analyzed_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- DIGEST_TRACKING: Email digest tracking
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE digest_tracking
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN sent_at SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ADD CONSTRAINT digest_tracking_type_check CHECK (type IN ('daily', 'weekly', 'monthly', 'immediate'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_digest_tracking_user_id ON digest_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_tracking_sent_at ON digest_tracking(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_tracking_type ON digest_tracking(type);

-- ────────────────────────────────────────────────────────────────────────────
-- SUBMISSIONS: Manuscript submissions
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE submissions
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN group_number SET NOT NULL,
  ALTER COLUMN submitted_at SET NOT NULL,
  ADD CONSTRAINT submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'revision_needed'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_submissions_group_number ON submissions(group_number);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- COMMENTS: Feedback comments
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE comments
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN author_id SET NOT NULL,
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_comments_submission_id ON comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- GRADES: Grading records
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE grades
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN group_number SET NOT NULL,
  ALTER COLUMN panelist_id SET NOT NULL,
  ALTER COLUMN graded_at SET NOT NULL,
  ADD CONSTRAINT grades_score_range CHECK (total_score >= 0 AND total_score <= 100);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_grades_group_number ON grades(group_number);
CREATE INDEX IF NOT EXISTS idx_grades_panelist_id ON grades(panelist_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_at ON grades(graded_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- RUBRICS: Grading rubrics
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE rubrics
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rubrics_created_at ON rubrics(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- PANELIST_ASSIGNMENTS: Panelist-to-group assignments
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE panelist_assignments
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN panelist_id SET NOT NULL,
  ALTER COLUMN group_number SET NOT NULL,
  ADD CONSTRAINT panelist_assignments_role_check CHECK (role IN ('chair', 'member', 'adviser'));

-- Add indexes and unique constraint
CREATE INDEX IF NOT EXISTS idx_panelist_assignments_panelist_id ON panelist_assignments(panelist_id);
CREATE INDEX IF NOT EXISTS idx_panelist_assignments_group_number ON panelist_assignments(group_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_panelist_assignments_unique ON panelist_assignments(panelist_id, group_number);

-- ────────────────────────────────────────────────────────────────────────────
-- TIMELINE_EVENTS: Activity timeline
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE timeline_events
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN timestamp SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_timestamp ON timeline_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_group_number ON timeline_events(group_number);

-- ────────────────────────────────────────────────────────────────────────────
-- PEER_EVALUATIONS: Peer feedback
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE peer_evaluations
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN evaluator_id SET NOT NULL,
  ALTER COLUMN evaluatee_id SET NOT NULL,
  ALTER COLUMN submitted_at SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_peer_evaluations_evaluator_id ON peer_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_peer_evaluations_evaluatee_id ON peer_evaluations(evaluatee_id);
CREATE INDEX IF NOT EXISTS idx_peer_evaluations_group_number ON peer_evaluations(group_number);

-- ────────────────────────────────────────────────────────────────────────────
-- REVISION_REQUESTS: Revision tracking
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE revision_requests
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN submission_id SET NOT NULL,
  ALTER COLUMN requested_by SET NOT NULL,
  ALTER COLUMN requested_at SET NOT NULL,
  ADD CONSTRAINT revision_requests_status_check CHECK (status IN ('pending', 'in_progress', 'completed'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_revision_requests_submission_id ON revision_requests(submission_id);
CREATE INDEX IF NOT EXISTS idx_revision_requests_status ON revision_requests(status);

-- ────────────────────────────────────────────────────────────────────────────
-- ARCHIVE_RECORDS: Archived data tracking
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE archive_records
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN archived_at SET NOT NULL,
  ADD CONSTRAINT archive_records_type_check CHECK (type IN ('group', 'submission', 'defense', 'user'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_archive_records_archived_at ON archive_records(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_records_type ON archive_records(type);

-- ────────────────────────────────────────────────────────────────────────────
-- Full-text search setup for manuscripts, announcements, and comments
-- ────────────────────────────────────────────────────────────────────────────

-- Add tsvector column for manuscript_texts
ALTER TABLE manuscript_texts
  ADD COLUMN IF NOT EXISTS text_search tsvector;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_manuscript_texts_search ON manuscript_texts USING GIN(text_search);

-- Create trigger to auto-update search vector
CREATE OR REPLACE FUNCTION manuscript_texts_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.text_search := to_tsvector('english', COALESCE(NEW.text, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER manuscript_texts_search_update
  BEFORE INSERT OR UPDATE ON manuscript_texts
  FOR EACH ROW EXECUTE FUNCTION manuscript_texts_search_trigger();

-- Add tsvector column for announcements
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_announcements_search ON announcements USING GIN(search_vector);

CREATE OR REPLACE FUNCTION announcements_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcements_search_update
  BEFORE INSERT OR UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION announcements_search_trigger();

-- Add tsvector column for comments
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_comments_search ON comments USING GIN(search_vector);

CREATE OR REPLACE FUNCTION comments_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_search_update
  BEFORE INSERT OR UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION comments_search_trigger();

-- ────────────────────────────────────────────────────────────────────────────
-- Create views for common analytics queries
-- ────────────────────────────────────────────────────────────────────────────

-- View: Active groups with submission status
CREATE OR REPLACE VIEW v_active_groups_status AS
SELECT 
  g.id,
  g.number,
  g.name,
  g.title,
  g.type,
  g.status,
  g.adviser,
  COUNT(DISTINCT s.id) as submission_count,
  MAX(s.submitted_at) as last_submission,
  COUNT(DISTINCT CASE WHEN s.status = 'approved' THEN s.id END) as approved_count,
  COUNT(DISTINCT CASE WHEN s.status = 'pending' THEN s.id END) as pending_count
FROM groups g
LEFT JOIN submissions s ON g.number = s.group_number
WHERE g.status = 'Active'
GROUP BY g.id, g.number, g.name, g.title, g.type, g.status, g.adviser;

-- View: Panelist workload
CREATE OR REPLACE VIEW v_panelist_workload AS
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT pa.group_number) as assigned_groups,
  COUNT(DISTINCT g.id) as graded_groups,
  AVG(g.total_score) as avg_score_given
FROM user_profiles u
LEFT JOIN panelist_assignments pa ON u.id = pa.panelist_id
LEFT JOIN grades g ON u.id = g.panelist_id
WHERE u.role IN ('panelist', 'adviser') AND u.status = 'Active'
GROUP BY u.id, u.name, u.email;

-- View: Upcoming deadlines with progress
CREATE OR REPLACE VIEW v_upcoming_deadlines AS
SELECT 
  d.id,
  d.title,
  d.description,
  d.due_date,
  d.milestone_id,
  d.status,
  COUNT(DISTINCT dp.user_id) as students_started,
  COUNT(DISTINCT CASE WHEN dp.status = 'submitted' THEN dp.user_id END) as submitted_count
FROM deadlines d
LEFT JOIN deadline_progress dp ON d.id = dp.deadline_id
WHERE d.due_date >= CURRENT_DATE AND d.status = 'approved'
GROUP BY d.id, d.title, d.description, d.due_date, d.milestone_id, d.status
ORDER BY d.due_date ASC;

-- ────────────────────────────────────────────────────────────────────────────
-- Audit trigger for sensitive tables
-- ────────────────────────────────────────────────────────────────────────────

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', row_to_json(OLD)::JSONB);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', row_to_json(NEW)::JSONB);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_grades AFTER INSERT OR UPDATE OR DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_submissions AFTER INSERT OR UPDATE OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_user_profiles AFTER UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ────────────────────────────────────────────────────────────────────────────
-- Soft delete pattern for critical tables
-- ────────────────────────────────────────────────────────────────────────────

-- Add deleted_at columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for soft-deleted records
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at ON submissions(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════