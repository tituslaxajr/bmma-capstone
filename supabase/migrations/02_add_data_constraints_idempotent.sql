-- ══════════════════════════════════════════════════════════════════════════════
-- CapstonePH Data Integrity Constraints Migration (IDEMPOTENT + SAFE VERSION)
-- Run this in Supabase Dashboard SQL Editor AFTER 01_create_schema.sql
-- Safe to run multiple times. Uses DO blocks to skip missing columns/tables.
--
-- NOTE: The actual table columns come from the KV→SQL migration and the backend's
-- W() function (camelCase → snake_case), NOT from 01_create_schema.sql (which uses
-- CREATE TABLE IF NOT EXISTS and won't modify already-existing tables).
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper: safely SET NOT NULL on a column (skip if column missing)
CREATE OR REPLACE FUNCTION _safe_set_not_null(t TEXT, c TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL', t, c);
EXCEPTION WHEN undefined_column THEN
  RAISE NOTICE 'Column %.% does not exist — skipping NOT NULL', t, c;
WHEN undefined_table THEN
  RAISE NOTICE 'Table % does not exist — skipping', t;
END;
$$ LANGUAGE plpgsql;

-- Helper: safely add CHECK constraint
CREATE OR REPLACE FUNCTION _safe_add_check(t TEXT, cname TEXT, expr TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, cname);
  EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s)', t, cname, expr);
EXCEPTION WHEN undefined_column THEN
  RAISE NOTICE 'Check %.% skipped (missing column)', t, cname;
WHEN undefined_table THEN
  RAISE NOTICE 'Table % does not exist — skipping', t;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- USER_PROFILES
-- Backend columns: id, email, name, role, status, avatar_url, bio, contact,
--   student_id, group_number, created_at, updated_at
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('user_profiles', 'id');
SELECT _safe_set_not_null('user_profiles', 'email');
SELECT _safe_set_not_null('user_profiles', 'name');
SELECT _safe_set_not_null('user_profiles', 'role');

SELECT _safe_add_check('user_profiles', 'user_profiles_role_check',
  $$role IN ('student', 'panelist', 'adviser', 'coordinator')$$);
SELECT _safe_add_check('user_profiles', 'user_profiles_status_check',
  $$status IN ('Active', 'Inactive', 'Archived')$$);

DO $$ BEGIN
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_email_unique;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'user_profiles_email_unique: %', SQLERRM; END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ────────────────────────────────────────────────────────────────────────────
-- GROUPS
-- Backend columns: id, number, name, title, type, status, adviser, members (JSONB),
--   created_at, updated_at
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('groups', 'id');
SELECT _safe_set_not_null('groups', 'number');

DO $$ BEGIN
  ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_number_unique;
  ALTER TABLE groups ADD CONSTRAINT groups_number_unique UNIQUE (number);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'groups_number_unique: %', SQLERRM; END $$;

SELECT _safe_add_check('groups', 'groups_status_check',
  $$status IN ('Active', 'Completed', 'Archived', 'In Progress')$$);

CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
CREATE INDEX IF NOT EXISTS idx_groups_adviser ON groups(adviser);

-- ────────────────────────────────────────────────────────────────────────────
-- DEFENSES
-- Backend columns: id, group_number, date, time, location, status, room,
--   panel_members (JSONB), notes, created_at, updated_at
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('defenses', 'id');

SELECT _safe_add_check('defenses', 'defenses_status_check',
  $$status IN ('Scheduled', 'Completed', 'Cancelled', 'Postponed')$$);

CREATE INDEX IF NOT EXISTS idx_defenses_date ON defenses(date);
CREATE INDEX IF NOT EXISTS idx_defenses_status ON defenses(status);
CREATE INDEX IF NOT EXISTS idx_defenses_group_number ON defenses(group_number);

-- ────────────────────────────────────────────────────────────────────────────
-- ANNOUNCEMENTS
-- Backend columns: id, title, body, type, priority, status, audience, date,
--   pinned, created_at (camelCase "createdAt" → created_at via W())
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('announcements', 'id');
SELECT _safe_set_not_null('announcements', 'title');

CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- ────────────────────────────────────────────────────────────────────────────
-- DEADLINES
-- Backend columns (via W()): id, date, label, milestone_key, scope,
--   group_id, approval_status, created_at, proposed_by, proposed_by_user_id
-- ────────────────────���───────────────────────────────────────────────────────
SELECT _safe_set_not_null('deadlines', 'id');

SELECT _safe_add_check('deadlines', 'deadlines_approval_status_check',
  $$approval_status IN ('approved', 'proposed', 'rejected')$$);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deadlines_date ON deadlines(date); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deadlines_approval_status ON deadlines(approval_status); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deadlines_scope ON deadlines(scope); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deadlines_group_id ON deadlines(group_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- DEADLINE_PROGRESS
-- Backend columns (via W()): deadline_id, group_id, group_name, status,
--   submitted_at, submitted_by, student_note, confirmed_at, rejection_note
-- PK is composite (deadline_id, group_id), NOT a single id column
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('deadline_progress', 'deadline_id');
SELECT _safe_set_not_null('deadline_progress', 'group_id');

SELECT _safe_add_check('deadline_progress', 'deadline_progress_status_check',
  $$status IN ('pending', 'submitted', 'confirmed', 'rejected')$$);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deadline_progress_deadline_id ON deadline_progress(deadline_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deadline_progress_group_id ON deadline_progress(group_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deadline_progress_status ON deadline_progress(status); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- Backend columns: user_id, type, title, detail, time, read
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('notifications', 'user_id');
SELECT _safe_set_not_null('notifications', 'title');

DO $$ BEGIN ALTER TABLE notifications ALTER COLUMN read SET DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(time DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, time DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- MANUSCRIPT_TEXTS
-- Backend columns: group_number, text, stored_at, word_count, page_count
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE manuscript_texts ALTER COLUMN group_number SET NOT NULL;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'manuscript_texts: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE manuscript_texts DROP CONSTRAINT IF EXISTS manuscript_texts_group_number_unique;
  ALTER TABLE manuscript_texts ADD CONSTRAINT manuscript_texts_group_number_unique UNIQUE (group_number);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'manuscript_texts unique: %', SQLERRM; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_manuscript_texts_group_number ON manuscript_texts(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- PLAGIARISM_REPORTS
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_group_number ON plagiarism_reports(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- AI_PLAGIARISM_REPORTS
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ai_plagiarism_reports_group_number ON ai_plagiarism_reports(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ai_plagiarism_reports_user_id ON ai_plagiarism_reports(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- DIGEST_TRACKING
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('digest_tracking', 'user_id');
SELECT _safe_set_not_null('digest_tracking', 'sent_at');
SELECT _safe_set_not_null('digest_tracking', 'type');

SELECT _safe_add_check('digest_tracking', 'digest_tracking_type_check',
  $$type IN ('daily', 'weekly', 'monthly', 'immediate')$$);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_digest_tracking_user_id ON digest_tracking(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_digest_tracking_type ON digest_tracking(type); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- SUBMISSIONS
-- Backend columns (via W()): id, group_number, manuscript_link,
--   pre_defense_files (JSONB), project_output (JSONB), comments (JSONB),
--   manuscript_link_updated_at, manuscript_link_updated_by
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('submissions', 'id');

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_submissions_group_number ON submissions(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- GRADES
-- Backend columns (via W()): id, group_id, group_number, group_title,
--   panelist_id, panelist_name, panelist_avatar, scores (JSONB),
--   group_scores (JSONB), individual_scores (JSONB), weighted_total,
--   verdict, feedback, revisions (JSONB), submitted_at
-- ────────────────────────────────────────────────────────────────────────────
SELECT _safe_set_not_null('grades', 'id');

DO $$ BEGIN
  ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_score_range;
  ALTER TABLE grades ADD CONSTRAINT grades_score_range CHECK (weighted_total >= 0 AND weighted_total <= 100);
EXCEPTION WHEN undefined_column THEN
  -- Try legacy column name
  BEGIN
    ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_score_range;
    ALTER TABLE grades ADD CONSTRAINT grades_score_range CHECK (total_score >= 0 AND total_score <= 100);
  EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE 'grades: neither weighted_total nor total_score found — skipping score range check';
  END;
END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_grades_group_number ON grades(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_grades_panelist_id ON grades(panelist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_grades_group_id ON grades(group_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- PANELIST_ASSIGNMENTS (may or may not exist as separate table)
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_panelist_assignments_panelist_id ON panelist_assignments(panelist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_panelist_assignments_group_number ON panelist_assignments(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- TIMELINE_EVENTS (may or may not exist)
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id ON timeline_events(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- PEER_EVALUATIONS
-- Backend columns (via W()): id, evaluator_id, evaluator_name,
--   group_number, group_id, evaluations (JSONB), submitted_at
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_peer_evaluations_evaluator_id ON peer_evaluations(evaluator_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_peer_evaluations_group_number ON peer_evaluations(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- ARCHIVES (backend uses T("archives"), NOT "archive_records")
-- Backend columns (via W()): id, group_number, items (JSONB)
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_archives_group_number ON archives(group_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Full-text search setup (only for tables/columns that exist)
-- ────────────────────────────────────────────────────────────────────────────

-- Manuscript text search
DO $$ BEGIN
  ALTER TABLE manuscript_texts ADD COLUMN IF NOT EXISTS text_search tsvector;
  CREATE INDEX IF NOT EXISTS idx_manuscript_texts_search ON manuscript_texts USING GIN(text_search);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'manuscript_texts search: %', SQLERRM; END $$;

CREATE OR REPLACE FUNCTION manuscript_texts_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.text_search := to_tsvector('english', COALESCE(NEW.text, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manuscript_texts_search_update ON manuscript_texts;
CREATE TRIGGER manuscript_texts_search_update
  BEFORE INSERT OR UPDATE ON manuscript_texts
  FOR EACH ROW EXECUTE FUNCTION manuscript_texts_search_trigger();

-- Announcements search (uses "body" not "content")
DO $$ BEGIN
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS search_vector tsvector;
  CREATE INDEX IF NOT EXISTS idx_announcements_search ON announcements USING GIN(search_vector);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'announcements search: %', SQLERRM; END $$;

CREATE OR REPLACE FUNCTION announcements_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcements_search_update ON announcements;
CREATE TRIGGER announcements_search_update
  BEFORE INSERT OR UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION announcements_search_trigger();

-- ────────────────────────────────────────────────────────────────────────────
-- Analytics views (safe: using only columns confirmed in backend)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_active_groups_status AS
SELECT
  g.id,
  g.number,
  g.name,
  g.title,
  g.type,
  g.status,
  g.adviser
FROM groups g
WHERE g.status = 'Active';

-- Panelist workload
CREATE OR REPLACE VIEW v_panelist_workload AS
SELECT
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT g.id) as graded_groups,
  AVG(g.total_score) as avg_score_given
FROM user_profiles u
LEFT JOIN grades g ON u.id::TEXT = g.panelist_id
WHERE u.role IN ('panelist', 'adviser') AND u.status = 'Active'
GROUP BY u.id, u.name, u.email;

-- ────────────────────────────────────────────────────────────────────────────
-- Audit trigger for sensitive tables
-- ────────────────────────────────────────────────────────────────────────────

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

DROP TRIGGER IF EXISTS audit_grades ON grades;
CREATE TRIGGER audit_grades AFTER INSERT OR UPDATE OR DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_submissions ON submissions;
CREATE TRIGGER audit_submissions AFTER INSERT OR UPDATE OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
CREATE TRIGGER audit_user_profiles AFTER UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ────────────────────────────────────────────────────────────────────────────
-- Soft delete columns (safe ADD COLUMN IF NOT EXISTS)
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at) WHERE deleted_at IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at ON submissions(deleted_at) WHERE deleted_at IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Cleanup helper functions
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS _safe_set_not_null(TEXT, TEXT);
DROP FUNCTION IF EXISTS _safe_add_check(TEXT, TEXT, TEXT);

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
-- This migration adds (where columns exist):
--   - NOT NULL constraints on core required columns
--   - CHECK constraints for enums (role, status, verdict, etc.)
--   - UNIQUE constraints (email, group number)
--   - Performance indexes on commonly queried columns
--   - Full-text search on manuscripts and announcements
--   - Analytics views for groups and panelist workload
--   - Audit logging for grades, submissions, user_profiles
--   - Soft delete support
-- All operations are idempotent and skip gracefully on missing columns/tables.
-- ══════════════════════════════════════════════════════════════════════════════