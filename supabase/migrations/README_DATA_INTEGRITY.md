# CapstonePH Data Integrity System

## 🎯 Overview

This document describes the comprehensive data integrity and validation system implemented after the KV→SQL migration. The system ensures data quality, consistency, and reliability across all 31 relational tables.

---

## 📊 Components

### 1. **Database Constraints** (`02_add_data_constraints_idempotent.sql`)

Comprehensive SQL migration that adds:

#### ✅ **Data Validation Constraints**
- **NOT NULL** constraints on critical fields (user emails, group numbers, etc.)
- **CHECK** constraints for enum-like fields (roles, statuses, scores)
- **UNIQUE** constraints (email addresses, group numbers)
- **Foreign key** relationships with CASCADE deletes

#### 🔍 **Performance Indexes**
- Single-column indexes for frequent lookups (role, status, dates)
- Composite indexes for complex queries (user_id + read status)
- GIN indexes for full-text search capabilities

#### 📝 **Full-Text Search**
- Automatic search vectors for `manuscript_texts`, `announcements`, `comments`
- Trigger-based updates maintain search indexes
- PostgreSQL native `tsvector` for English text

#### 👁️ **Audit System**
- `audit_log` table tracks all changes to critical tables
- Automatic triggers on `grades`, `submissions`, `user_profiles`
- Stores before/after snapshots of modified data

#### 🗑️ **Soft Delete Pattern**
- `deleted_at` timestamps for `groups`, `submissions`, `user_profiles`
- Preserves data for auditing while hiding from normal queries
- Indexed for efficient filtered queries

#### 📊 **Analytics Views**
- `v_active_groups_status` - Groups with submission metrics
- `v_panelist_workload` - Panelist assignment distribution
- `v_upcoming_deadlines` - Deadlines with progress tracking

---

### 2. **Backend Validation Endpoints** (Added to `/supabase/functions/server/index.tsx`)

#### **GET `/admin/data-integrity`**
Comprehensive validation report including:

**Checks Performed:**
- ✅ Orphaned records (submissions/grades without valid groups)
- ✅ Invalid enum values (roles, statuses)
- ✅ Stale data (past defenses still marked "Scheduled")
- ✅ Duplicate data (emails, group numbers)
- ✅ Missing required fields (advisers, names, emails)
- ✅ Table statistics (record counts across all tables)

**Response Format:**
```json
{
  "timestamp": "2026-03-12T10:30:00Z",
  "status": "healthy" | "healthy_with_warnings" | "needs_attention" | "critical",
  "summary": {
    "totalIssues": 0,
    "totalWarnings": 2,
    "totalCriticalErrors": 0,
    "totalTables": 17,
    "totalRecords": 1543
  },
  "criticalErrors": [],
  "issues": [],
  "warnings": [
    {
      "severity": "low",
      "category": "stale_data",
      "table": "defenses",
      "count": 2,
      "message": "Found 2 scheduled defenses with past dates",
      "sample": [...]
    }
  ],
  "stats": {
    "user_profiles": 45,
    "groups": 12,
    "submissions": 38,
    ...
  }
}
```

#### **GET `/admin/health-check`**
Quick health status for monitoring:
```json
{
  "status": "ok",
  "timestamp": "2026-03-12T10:30:00Z",
  "counts": {
    "users": 45,
    "groups": 12,
    "submissions": 38,
    "defenses": 8
  },
  "database": "connected"
}
```

#### **GET `/admin/audit-log?limit=100&table=grades`**
View audit trail:
```json
{
  "logs": [
    {
      "id": 123,
      "tableName": "grades",
      "recordId": "456",
      "action": "UPDATE",
      "oldData": {...},
      "newData": {...},
      "changedAt": "2026-03-12T09:15:00Z"
    }
  ],
  "count": 50,
  "limit": 100,
  "filteredBy": "grades"
}
```

**Authorization:** All endpoints require **Coordinator** role.

---

### 3. **Frontend Dashboard** (`/src/app/components/DataIntegrityDashboard.tsx`)

React component for visualizing data health:

#### **Features:**
- 🎨 Real-time status cards (healthy/warning/critical)
- 📊 Table statistics grid
- 🔍 Detailed issue breakdown with severity levels
- 📈 Sample data viewer for debugging
- 🔄 One-click refresh
- 📑 Tabbed interface (Overview / Issues / Stats)

#### **Usage:**
```tsx
import { DataIntegrityDashboard } from './components/DataIntegrityDashboard';

// Add to coordinator routes:
<Route path="/admin/integrity" element={<DataIntegrityDashboard />} />
```

---

### 4. **Maintenance Queries** (`03_maintenance_queries.sql`)

#### **Helper Functions:**
```sql
-- Find duplicate emails
SELECT * FROM find_duplicate_emails();

-- Find orphaned submissions
SELECT * FROM find_orphaned_submissions();

-- Find stale defenses
SELECT * FROM find_stale_defenses();

-- Get group progress
SELECT * FROM get_group_submission_progress(1);
```

#### **Cleanup Procedures:**
```sql
-- Clean old notifications (90+ days, read)
SELECT cleanup_old_notifications();
-- Returns: 234 (count of deleted records)

-- Archive completed groups
SELECT archive_completed_groups();
-- Returns: 5 (count of archived groups)

-- Update stale defenses
SELECT update_stale_defenses();
-- Returns: 3 (count of updated defenses)

-- Mark overdue deadlines
SELECT mark_overdue_deadlines();
-- Returns: 7 (count of marked deadlines)
```

#### **Analytics Queries:**
Pre-written queries for common reports:
- Group submission statistics
- Panelist workload distribution
- Deadline compliance tracking
- Defense schedule overview
- Student activity summary
- Plagiarism check summary
- Email digest tracking
- Audit trail for sensitive operations

---

## 🚀 Setup Instructions

### **Step 1: Create Database Schema**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `01_create_schema.sql`
3. Execute the migration to create all 31 tables
4. Verify success: Check that all tables exist in the Database view

**Expected Output:**
```
CREATE TABLE
CREATE FUNCTION
CREATE POLICY
...
Success. No rows returned.
```

### **Step 2: Run Constraints Migration**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `02_add_data_constraints_idempotent.sql` (use idempotent version)
3. Execute the migration
4. Verify success: Check for new indexes and triggers

**Expected Output:**
```
ALTER TABLE
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
CREATE VIEW
...
Success. No rows returned.
```

### **Step 3: Verify Backend Endpoints**
The validation endpoints are already added to `index.tsx`. Test them:

```bash
# Health check
curl -X GET "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-36da3eb1/admin/health-check" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-User-Token: YOUR_ACCESS_TOKEN"

# Full integrity report
curl -X GET "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-36da3eb1/admin/data-integrity" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-User-Token: YOUR_ACCESS_TOKEN"
```

### **Step 4: Add Dashboard to Routes**
Update your coordinator routes to include the integrity dashboard:

```tsx
// In /src/app/routes.tsx
import { DataIntegrityDashboard } from './components/DataIntegrityDashboard';

// Add to coordinator routes:
{
  path: "integrity",
  element: <DataIntegrityDashboard />
}
```

---

## 📅 Maintenance Schedule

### **Daily** (Automated - Future Enhancement)
- Run `mark_overdue_deadlines()`
- Run `update_stale_defenses()`

### **Weekly**
- Review `/admin/data-integrity` report
- Run `cleanup_old_notifications()`
- Check audit logs for suspicious activity

### **Monthly**
- Run `archive_completed_groups()`
- Review analytics queries for insights
- Backup `audit_log` table

### **Quarterly**
- Full data integrity audit
- Review and optimize indexes
- Clean up orphaned records

---

## 🔧 Common Operations

### **Finding and Fixing Issues**

#### **1. Orphaned Submissions**
```sql
-- Find them
SELECT * FROM find_orphaned_submissions();

-- Fix: Either delete or assign to valid group
DELETE FROM submissions WHERE id IN (
  SELECT id FROM find_orphaned_submissions()
);
```

#### **2. Duplicate Emails**
```sql
-- Find them
SELECT * FROM find_duplicate_emails();

-- Fix: Manually review and merge/delete
-- Keep the most recent profile
DELETE FROM user_profiles
WHERE id IN (
  SELECT id FROM user_profiles
  WHERE email = 'duplicate@example.com'
  ORDER BY created_at DESC
  OFFSET 1
);
```

#### **3. Stale Defenses**
```sql
-- Find and auto-fix
SELECT update_stale_defenses();
```

#### **4. Missing Advisers**
```sql
-- Find them
SELECT * FROM find_groups_without_advisers();

-- Fix: Assign advisers
UPDATE groups
SET adviser = 'Dr. Jane Smith'
WHERE id = 123;
```

---

## 📊 Monitoring Best Practices

### **Key Metrics to Watch:**

1. **Data Quality Score**
   - Target: 95%+ (no critical errors, < 5% warnings)
   - Check: Weekly via `/admin/data-integrity`

2. **Orphaned Records**
   - Target: 0
   - Check: Weekly
   - Action: Clean up immediately

3. **Duplicate Data**
   - Target: 0
   - Check: Monthly
   - Action: Investigate and merge

4. **Audit Log Growth**
   - Target: < 10,000 records/month
   - Check: Monthly
   - Action: Archive old logs if > 50,000 records

### **Alert Thresholds:**

| Severity | Condition | Action |
|----------|-----------|--------|
| 🔴 **Critical** | Duplicate emails/group numbers | Fix immediately |
| 🟠 **High** | Orphaned records > 10 | Fix within 24h |
| 🟠 **Medium** | Invalid enum values | Fix within 1 week |
| 🔵 **Low** | Stale data, missing advisers | Fix at convenience |

---

## 🔐 Security Considerations

1. **Audit Log Retention**
   - Keep audit logs for at least 1 year
   - Export to cold storage after 6 months
   - Never delete logs for grades/submissions

2. **Soft Deletes**
   - Use soft delete for all user-generated content
   - Only hard delete after 90 days in trash
   - Require coordinator approval for permanent deletion

3. **Access Control**
   - Integrity endpoints require coordinator role
   - Audit log access should be restricted
   - Log all maintenance operations

---

## 🐛 Troubleshooting

### **Issue: Constraint violation on insert**
```
ERROR: new row violates check constraint "user_profiles_role_check"
```
**Solution:** Verify enum values match constraints (`student`, `panelist`, `coordinator`)

### **Issue: Foreign key constraint fails**
```
ERROR: insert or update violates foreign key constraint
```
**Solution:** Ensure referenced record exists before inserting

### **Issue: Full-text search not working**
```
-- Rebuild search index
UPDATE manuscript_texts SET text = text WHERE text IS NOT NULL;
UPDATE announcements SET title = title WHERE title IS NOT NULL;
```

### **Issue: Audit log growing too large**
```sql
-- Archive old logs
CREATE TABLE audit_log_archive AS
SELECT * FROM audit_log WHERE changed_at < NOW() - INTERVAL '6 months';

DELETE FROM audit_log WHERE changed_at < NOW() - INTERVAL '6 months';
```

---

## 📈 Future Enhancements

### **Planned Features:**
- [ ] Automated daily integrity checks via cron job
- [ ] Email alerts for critical errors
- [ ] Data quality dashboard widgets
- [ ] Automated backup verification
- [ ] Performance monitoring integration
- [ ] Export integrity reports to PDF
- [ ] Machine learning anomaly detection
- [ ] Real-time data validation hooks

### **Advanced Analytics:**
- [ ] Submission trend analysis
- [ ] Grading consistency checks
- [ ] Panelist bias detection
- [ ] Student progress predictions
- [ ] Plagiarism pattern recognition

---

## 📚 Additional Resources

### **Related Documentation:**
- [Supabase Postgres Guide](https://supabase.com/docs/guides/database)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/trigger-definition.html)

### **Internal Files:**
- `/supabase/functions/server/index.tsx` - Backend validation logic
- `/src/app/lib/supabase.ts` - API client with retry logic
- `/src/app/components/cinematic-tokens.ts` - Design tokens

---

## ✅ Migration Verification Checklist

After running migrations, verify:

- [ ] All 31 tables have proper constraints
- [ ] Indexes created successfully (check `pg_indexes` view)
- [ ] Triggers are active (check `pg_trigger` table)
- [ ] Views return data correctly
- [ ] `/admin/data-integrity` endpoint returns 200 OK
- [ ] `/admin/health-check` shows correct counts
- [ ] Frontend dashboard loads without errors
- [ ] Audit log captures changes to critical tables
- [ ] Full-text search works on manuscripts
- [ ] Soft delete pattern works correctly

---

**Last Updated:** March 12, 2026  
**Version:** 1.0.0  
**Migration Status:** ✅ Complete  
**Maintainer:** CapstonePH Development Team