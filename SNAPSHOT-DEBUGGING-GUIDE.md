# 🧪 Snapshot System Debugging Guide

## Overview

This comprehensive guide helps debug the table snapshot functionality that creates daily snapshots in the `table-snapshots` storage bucket and maintains an index in the `table_snapshots_index` table.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Edge Function │───→│  Storage Bucket │───→│  Index Table    │
│  (Cron: 10 AM)  │    │ table-snapshots │    │snapshots_index  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         v                       v                       v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Staff Table   │    │  JSON Files     │    │  Metadata       │
│    (Source)     │    │  (YYYY/MM/DD)   │    │  (Quick Access) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🧪 Testing Tools

### 1. Complete Test Suite
**File:** `/test-snapshot-functionality.html`
- Open in browser to run all tests
- Tests database, storage, permissions, and Edge Function
- Provides detailed results and recommendations

### 2. Database Diagnostic
**File:** `/diagnostic-database-check.sql`
- Run in Supabase SQL Editor
- Checks table structure, data, and permissions
- Identifies missing components

### 3. Edge Function Test
**File:** `/test-edge-function-deployment.js`
- Run in browser console
- Tests function deployment and execution
- Provides troubleshooting steps

### 4. Storage Permissions Test
**File:** `/test-storage-permissions.js`
- Run in browser console
- Tests bucket access and file operations
- Identifies permission issues

### 5. Load Snapshots Test
**File:** `/test-load-snapshots.js`
- Run in browser console on main page
- Tests `loadAvailableSnapshots()` function
- Verifies calendar population

### 6. Manual Snapshot Creation
**File:** `/create-manual-snapshot.js`
- Run in browser console
- Creates test snapshot manually
- Verifies entire snapshot pipeline

## 🔍 Step-by-Step Debugging

### Step 1: Database Infrastructure Check

1. **Run Database Diagnostic:**
   ```sql
   -- Execute in Supabase SQL Editor
   -- File: diagnostic-database-check.sql
   ```

2. **Expected Tables:**
   - `staffTable` (source data)
   - `table_snapshots_index` (metadata index)
   - `snapshot_restore_log` (restore tracking)

3. **Common Issues:**
   - **Missing tables:** Run setup script `setup-snapshot-infrastructure.sql`
   - **Permission errors:** Check RLS policies
   - **No data:** Verify `staffTable` has records

### Step 2: Storage Bucket Verification

1. **Check Bucket Existence:**
   - Go to Supabase Dashboard > Storage
   - Verify `table-snapshots` bucket exists
   - Check bucket permissions

2. **Test Storage Access:**
   ```javascript
   // Run in browser console:
   // Load and execute: test-storage-permissions.js
   ```

3. **Common Issues:**
   - **Bucket not found:** Create bucket manually
   - **Permission denied:** Fix RLS policies for `storage.objects`
   - **Upload fails:** Check file size limits and quotas

### Step 3: Edge Function Testing

1. **Check Function Deployment:**
   ```bash
   # In terminal (if you have Supabase CLI)
   supabase functions list
   ```

2. **Test Function Manually:**
   ```javascript
   // Run in browser console:
   // Load and execute: test-edge-function-deployment.js
   ```

3. **Common Issues:**
   - **Function not found (404):** Deploy function with `supabase functions deploy`
   - **Permission denied (401):** Check API key and service role
   - **Internal error (500):** Check function logs

### Step 4: Load Snapshots Functionality

1. **Test on Main Page:**
   ```javascript
   // Run in browser console on index.html:
   // Load and execute: test-load-snapshots.js
   ```

2. **Check Function Availability:**
   ```javascript
   // In console:
   console.log(typeof window.loadAvailableSnapshots);
   // Should return 'function'
   ```

3. **Common Issues:**
   - **Function not found:** Ensure you're on main page
   - **Database errors:** Check table permissions
   - **No snapshots loaded:** Verify snapshot files exist

### Step 5: Manual Snapshot Creation

1. **Create Test Snapshot:**
   ```javascript
   // Run in browser console:
   // Load and execute: create-manual-snapshot.js
   ```

2. **Verify Creation:**
   - Check storage bucket for new file
   - Verify database index entry
   - Test loading the snapshot

## 🔧 Common Issues and Solutions

### Issue 1: Table Missing Error
```
Error: table "table_snapshots_index" does not exist
```
**Solution:**
1. Run database setup script
2. Check permissions
3. Verify RLS policies

### Issue 2: Storage Bucket Not Found
```
Error: Bucket not found
```
**Solution:**
1. Go to Supabase Dashboard > Storage
2. Create bucket: `table-snapshots`
3. Set appropriate permissions
4. Configure RLS policies

### Issue 3: Edge Function Not Deployed
```
Error: 404 - Function not found
```
**Solution:**
1. Deploy function: `supabase functions deploy snapshot_staff_table_daily`
2. Check environment variables
3. Verify service role permissions

### Issue 4: Permission Denied
```
Error: Permission denied
```
**Solution:**
1. Check RLS policies for tables
2. Verify storage bucket permissions
3. Ensure service role has necessary access

### Issue 5: No Snapshots Found
```
Warning: No snapshots available
```
**Solution:**
1. Create manual snapshot for testing
2. Check if Edge Function is running
3. Verify cron job configuration

## 📋 Database Setup Script

If tables are missing, run this in Supabase SQL Editor:

```sql
-- Create snapshots index table
CREATE TABLE IF NOT EXISTS table_snapshots_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create restore log table
CREATE TABLE IF NOT EXISTS snapshot_restore_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restored_at TIMESTAMPTZ DEFAULT now(),
    snapshot_date DATE NOT NULL,
    restored_by TEXT,
    restore_reason TEXT,
    row_count INTEGER NOT NULL,
    restore_strategy TEXT NOT NULL DEFAULT 'replace-all'
);

-- Enable RLS
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_restore_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read snapshots index" 
    ON table_snapshots_index FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage snapshots" 
    ON table_snapshots_index FOR ALL 
    USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_date 
    ON table_snapshots_index(snapshot_date);
```

## 🚀 Quick Fix Commands

### Clean Up Test Data
```sql
-- Remove test snapshots
DELETE FROM table_snapshots_index 
WHERE object_path LIKE 'test/%' 
   OR object_path LIKE 'manual-test/%';

-- Clean restore log
DELETE FROM snapshot_restore_log 
WHERE restored_by = 'manual-snapshot-script';
```

### Force Create Snapshot
```javascript
// In browser console:
fetch('https://fiecugxopjxzqfdnaqsu.supabase.co/functions/v1/snapshot_staff_table_daily', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_ANON_KEY',
        'Content-Type': 'application/json'
    }
}).then(r => r.json()).then(console.log);
```

### Refresh Snapshots List
```javascript
// In browser console (on main page):
window.loadAvailableSnapshots().then(() => {
    console.log('Snapshots refreshed');
    if (typeof window.populateSnapshotCalendar === 'function') {
        window.populateSnapshotCalendar();
    }
});
```

## 📞 Support Checklist

Before asking for help, run through this checklist:

- [ ] Database connection works
- [ ] Required tables exist
- [ ] Storage bucket exists and accessible
- [ ] Edge Function is deployed
- [ ] Permissions are configured
- [ ] Test snapshot creation works
- [ ] loadAvailableSnapshots function works
- [ ] Calendar displays snapshots

Include test results and error messages when seeking support.

## 🎯 Expected Results

When everything is working correctly:

1. **Database:** 3 tables exist with proper permissions
2. **Storage:** `table-snapshots` bucket with organized file structure
3. **Function:** Edge Function creates daily snapshots at 10 AM
4. **Interface:** Calendar shows available snapshot dates
5. **Functionality:** Users can load and view historical data

Run the comprehensive test suite to verify all components are working properly.