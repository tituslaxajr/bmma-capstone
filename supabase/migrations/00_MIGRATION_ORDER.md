# 🚀 CapstonePH SQL Migration Guide

## ⚠️ IMPORTANT: Run Migrations in This Exact Order

The database migrations must be executed sequentially in the Supabase Dashboard SQL Editor.

---

## 📋 Migration Sequence

### ✅ Step 1: Create Database Schema
**File:** `01_create_schema.sql`

**What it does:**
- Creates all 31 tables (user_profiles, groups, defenses, etc.)
- Adds `next_id()` helper function for auto-incrementing IDs
- Enables Row Level Security (RLS) on all tables
- Creates permissive RLS policies for service role

**How to run:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire contents of `01_create_schema.sql`
4. Click "Run"
5. Wait for "Success. No rows returned."

**Verification:**
```sql
-- Check that all 31 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see tables like:
- activity_log
- ai_plagiarism_reports
- announcements
- archive_records
- comments
- deadline_progress
- deadlines
- defenses
- digest_tracking
- feedback
- files
- grades
- group_milestones
- groups
- manuscript_texts
- milestones
- notifications
- panelist_assignments
- peer_evaluations
- plagiarism_reports
- report_templates
- revision_requests
- rubrics
- sessions
- settings
- submissions
- timeline_events
- user_profiles
- user_settings

---

### ✅ Step 2: Add Data Integrity Constraints
**File:** `02_add_data_constraints_idempotent.sql`

**What it does:**
- Adds NOT NULL constraints on critical fields
- Adds CHECK constraints for enum validation
- Adds UNIQUE constraints for emails/group numbers
- Creates 50+ performance indexes
- Sets up full-text search for manuscripts/announcements/comments
- Creates audit_log table with triggers
- Creates analytics views (v_active_groups_status, etc.)
- Adds soft delete columns (deleted_at)
- Creates foreign key relationships

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `02_add_data_constraints_idempotent.sql`
3. Click "Run"
4. Wait for "Success. No rows returned."

**Verification:**
```sql
-- Check constraints were added
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid IN (
  SELECT oid FROM pg_class WHERE relname IN ('user_profiles', 'groups', 'defenses')
);

-- Check indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';
```

---

### ✅ Step 3: (Optional) Run Maintenance Queries
**File:** `03_maintenance_queries.sql`

**What it does:**
- Creates helper functions for finding data issues
- Creates cleanup procedures for maintenance
- Provides pre-written analytics queries

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `03_maintenance_queries.sql`
3. Click "Run"

**Note:** This step is optional but recommended for production environments.

---

## 🎯 Post-Migration Steps

### 1. Test Backend Endpoints

The backend already has data integrity endpoints. Test them:

```bash
# Replace YOUR_PROJECT and YOUR_ANON_KEY with your actual values

# Health check
curl "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-36da3eb1/admin/health-check" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Data integrity report
curl "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-36da3eb1/admin/data-integrity" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 2. Access the Dashboard

Login as a Coordinator and navigate to:
**Coordinator → Admin → Data Integrity**

You should see:
- ✅ System health status
- 📊 Table statistics
- 🔍 Data validation results
- ⚠️ Any warnings or issues

---

## ❌ Common Errors and Solutions

### Error: "relation 'defenses' does not exist"
**Cause:** You skipped Step 1 or it failed to complete
**Solution:** Run `01_create_schema.sql` first

### Error: "constraint 'user_profiles_role_check' already exists"
**Cause:** You ran the old non-idempotent constraints file
**Solution:** Use `02_add_data_constraints_idempotent.sql` instead (it has DROP IF EXISTS)

### Error: "permission denied for table"
**Cause:** RLS policies may be blocking access
**Solution:** Verify service role policies were created in Step 1

### Error: "function next_id does not exist"
**Cause:** Step 1 didn't complete successfully
**Solution:** Re-run `01_create_schema.sql`

---

## 🔄 Re-running Migrations

### If you need to start over:

```sql
-- ⚠️ WARNING: This will delete ALL data!
-- Only use in development/testing

-- Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run migrations from Step 1
```

### If you just need to re-run constraints:

The idempotent constraints file (`02_add_data_constraints_idempotent.sql`) is safe to run multiple times. It will:
- Drop existing constraints before recreating them
- Use `IF NOT EXISTS` for indexes and tables
- Use `OR REPLACE` for functions and views

---

## 📊 Migration Status Checklist

After completing all migrations, verify:

- [ ] ✅ All 31 tables created (Step 1)
- [ ] ✅ RLS enabled on all tables
- [ ] ✅ Helper function `next_id()` exists
- [ ] ✅ All constraints added (Step 2)
- [ ] ✅ 50+ indexes created
- [ ] ✅ Full-text search triggers active
- [ ] ✅ Audit log table exists with triggers
- [ ] ✅ 3 analytics views created
- [ ] ✅ Soft delete columns added
- [ ] ✅ Backend endpoints responding
- [ ] ✅ Frontend dashboard accessible

---

## 📞 Need Help?

1. Check `/supabase/migrations/README_DATA_INTEGRITY.md` for detailed documentation
2. Review error logs in Supabase Dashboard → Logs
3. Test individual queries in SQL Editor
4. Check RLS policies in Dashboard → Authentication → Policies

---

**Ready to migrate?** Start with Step 1: `01_create_schema.sql` 🚀
