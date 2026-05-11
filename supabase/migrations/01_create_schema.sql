-- ══════════════════════════════════════════════════════════════════════════════
-- CapstonePH Complete Schema Creation
-- Run this FIRST before running the constraints migration (02_*)
-- Creates all 31 tables for the KV→SQL migration
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper function for auto-incrementing IDs
DROP FUNCTION IF EXISTS next_id(TEXT);
CREATE OR REPLACE FUNCTION next_id(prefix TEXT) RETURNS TEXT AS $$
DECLARE
  seq_name TEXT;
  next_val BIGINT;
BEGIN
  seq_name := format('%s_seq', prefix);
  
  -- Create sequence if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name) THEN
    EXECUTE format('CREATE SEQUENCE %I', seq_name);
  END IF;
  
  -- Get next value
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
  
  RETURN format('%s%s', prefix, next_val);
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────────────
-- USER_PROFILES: Core user data
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT,
  secondary_roles JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Active',
  avatar_url TEXT,
  bio TEXT,
  contact TEXT,
  student_id TEXT,
  group_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- GROUPS: Student capstone groups
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  number TEXT,
  name TEXT,
  title TEXT,
  type TEXT,
  status TEXT DEFAULT 'Active',
  adviser TEXT,
  members JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- DEFENSES: Defense scheduling
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defenses (
  id TEXT PRIMARY KEY,
  group_number TEXT,
  date TEXT,
  time TEXT,
  location TEXT,
  status TEXT DEFAULT 'Scheduled',
  room TEXT,
  panel_members JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- ANNOUNCEMENTS: System announcements
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  type TEXT DEFAULT 'General',
  priority TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'Draft',
  audience TEXT DEFAULT 'All Students',
  date TEXT,
  pinned BOOLEAN DEFAULT false,
  "createdAt" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- DEADLINES: Project deadlines and milestones
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deadlines (
  id TEXT PRIMARY KEY,
  date TEXT,
  label TEXT,
  milestone_key TEXT,
  scope TEXT DEFAULT 'global',
  group_id TEXT,
  approval_status TEXT DEFAULT 'approved',
  proposed_by TEXT,
  proposed_by_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- DEADLINE_PROGRESS: Student progress tracking
-- Composite key: (deadline_id, group_id)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deadline_progress (
  deadline_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TEXT,
  submitted_by TEXT,
  student_note TEXT,
  confirmed_at TEXT,
  rejection_note TEXT,
  PRIMARY KEY (deadline_id, group_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS: User notifications
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  message TEXT,
  type TEXT,
  read BOOLEAN DEFAULT false,
  time TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ────────────────────────────────────────────────────────────────────────────
-- MANUSCRIPT_TEXTS: Stored manuscript content for plagiarism checking
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manuscript_texts (
  group_number TEXT PRIMARY KEY,
  text TEXT,
  stored_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- PLAGIARISM_REPORTS: Traditional plagiarism check results
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plagiarism_reports (
  id TEXT PRIMARY KEY,
  group_number TEXT,
  similarity_score NUMERIC,
  matches JSONB DEFAULT '[]',
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- AI_PLAGIARISM_REPORTS: AI-powered analysis results
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_plagiarism_reports (
  id TEXT PRIMARY KEY,
  group_number TEXT,
  user_id TEXT,
  ai_probability NUMERIC,
  sections JSONB DEFAULT '[]',
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- DIGEST_TRACKING: Email digest tracking
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digest_tracking (
  id TEXT PRIMARY KEY DEFAULT next_id('digest_'),
  user_id TEXT,
  type TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  content JSONB DEFAULT '{}'
);

-- ────────────────────────────────────────────────────────────────────────────
-- SUBMISSIONS: Manuscript submissions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  group_number TEXT,
  title TEXT,
  file_url TEXT,
  file_name TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  feedback TEXT,
  metadata JSONB DEFAULT '{}'
);

-- ────────────────────────────────────────────────────────────────────────────
-- COMMENTS: Feedback comments
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  author_id TEXT,
  author_name TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- GRADES: Grading records
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  group_number TEXT,
  panelist_id TEXT,
  panelist_name TEXT,
  rubric_id TEXT,
  scores JSONB DEFAULT '{}',
  total_score NUMERIC,
  feedback TEXT,
  graded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- RUBRICS: Grading rubrics
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rubrics (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  criteria JSONB DEFAULT '[]',
  max_score NUMERIC,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- PANELIST_ASSIGNMENTS: Panelist-to-group assignments
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS panelist_assignments (
  id TEXT PRIMARY KEY,
  panelist_id TEXT,
  panelist_name TEXT,
  group_number TEXT,
  role TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- TIMELINE_EVENTS: Activity timeline
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  group_number TEXT,
  title TEXT,
  description TEXT,
  event_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ────────────────────────────────────────────────────────────────────────────
-- PEER_EVALUATIONS: Peer feedback
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS peer_evaluations (
  id TEXT PRIMARY KEY,
  evaluator_id TEXT,
  evaluator_name TEXT,
  evaluatee_id TEXT,
  evaluatee_name TEXT,
  group_number TEXT,
  scores JSONB DEFAULT '{}',
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- REVISION_REQUESTS: Revision tracking
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revision_requests (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  requested_by TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────────────────────
-- ARCHIVE_RECORDS: Archived data tracking
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS archive_records (
  id TEXT PRIMARY KEY,
  type TEXT,
  record_id TEXT,
  data JSONB DEFAULT '{}',
  archived_by TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- ────────────────────────────────────────────────────────────────────────────
-- ARCHIVES: Per-group archive data (used by backend T("archives"))
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS archives (
  id SERIAL PRIMARY KEY,
  group_number INTEGER,
  items JSONB DEFAULT '{}'
);

-- ────────────────────────────────────────────────────────────────────────────
-- MILESTONES: Project milestones
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  order_index INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- GROUP_MILESTONES: Group progress on milestones
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_milestones (
  id TEXT PRIMARY KEY,
  group_number TEXT,
  milestone_id TEXT,
  status TEXT DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- ────────────────────────────────────────────────────────────────────────────
-- SETTINGS: System settings
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- USER_SETTINGS: User-specific settings
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  preferences JSONB DEFAULT '{}',
  notifications_enabled BOOLEAN DEFAULT true,
  email_digest_frequency TEXT DEFAULT 'daily',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- FILES: File storage metadata
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  name TEXT,
  url TEXT,
  type TEXT,
  size BIGINT,
  uploaded_by TEXT,
  group_number TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ────────────────────────────────────────────────────────────────────────────
-- ACTIVITY_LOG: System activity log
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- SESSIONS: User session tracking
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- FEEDBACK: General feedback submissions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT,
  content TEXT,
  rating INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- REPORT_TEMPLATES: Custom report templates
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_templates (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  template JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Enable Row Level Security (RLS) on all tables
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE defenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadline_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_plagiarism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE panelist_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS Policies: Allow service role full access
-- ════════════════════════════════════════════════════════════════════════════

-- Create permissive policies for service role (backend operations)
DO $$ 
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename != 'audit_log'
  LOOP
    -- Drop existing policies if they exist
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON %I', table_name);
    
    -- Create policy allowing service role full access
    EXECUTE format('
      CREATE POLICY service_role_all ON %I
      FOR ALL
      TO authenticated, anon, service_role
      USING (true)
      WITH CHECK (true)
    ', table_name);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA CREATION
-- ══════════════════════════════════════════════════════════════════════════════
-- 
-- Next steps:
-- 1. Run this migration in Supabase Dashboard SQL Editor
-- 2. Then run 02_add_data_constraints_idempotent.sql
-- 3. Access Data Integrity Dashboard via Coordinator → Admin → Data Integrity
-- 
-- ══════════════════════════════════════════════════════════════════════════════
