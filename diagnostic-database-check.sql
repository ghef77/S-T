-- 🧪 SNAPSHOT SYSTEM DIAGNOSTIC SCRIPT
-- Run this in your Supabase SQL Editor to diagnose snapshot functionality issues

-- ======================================
-- 1. BASIC SYSTEM CHECK
-- ======================================
SELECT 
    '🔍 DATABASE CONNECTIVITY' as check_type,
    'Connected successfully' as status,
    NOW() as timestamp;

-- ======================================
-- 2. TABLE EXISTENCE CHECK
-- ======================================
SELECT 
    '📋 TABLE STRUCTURE CHECK' as check_type,
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('staffTable'),
        ('table_snapshots_index'),
        ('snapshot_restore_log')
) as expected_tables(table_name)
LEFT JOIN information_schema.tables t 
    ON t.table_name = expected_tables.table_name 
    AND t.table_schema = 'public';

-- ======================================
-- 3. MAIN TABLE DATA CHECK
-- ======================================
SELECT 
    '📊 MAIN TABLE DATA' as check_type,
    COUNT(*) as row_count,
    MIN("No") as min_no,
    MAX("No") as max_no,
    '✅ DATA AVAILABLE' as status
FROM "staffTable";

-- ======================================
-- 4. SNAPSHOTS INDEX TABLE STRUCTURE
-- ======================================
SELECT 
    '🗂️ SNAPSHOTS INDEX STRUCTURE' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'table_snapshots_index' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================================
-- 5. EXISTING SNAPSHOTS CHECK
-- ======================================
SELECT 
    '📸 EXISTING SNAPSHOTS' as check_type,
    COUNT(*) as total_snapshots,
    MIN(snapshot_date) as oldest_snapshot,
    MAX(snapshot_date) as newest_snapshot,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SNAPSHOTS FOUND'
        ELSE '⚠️ NO SNAPSHOTS'
    END as status
FROM table_snapshots_index;

-- ======================================
-- 6. DETAILED SNAPSHOTS LIST
-- ======================================
SELECT 
    '📸 SNAPSHOTS DETAIL' as check_type,
    snapshot_date,
    object_path,
    row_count,
    ROUND(file_size_bytes / 1024.0, 2) as size_kb,
    created_at,
    (metadata->>'type') as snapshot_type
FROM table_snapshots_index 
ORDER BY snapshot_date DESC 
LIMIT 10;

-- ======================================
-- 7. RESTORE LOG CHECK
-- ======================================
SELECT 
    '📝 RESTORE LOG' as check_type,
    COUNT(*) as total_restores,
    MAX(restored_at) as last_restore,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ LOG ENTRIES FOUND'
        ELSE '⚠️ NO LOG ENTRIES'
    END as status
FROM snapshot_restore_log;

-- ======================================
-- 8. ROW LEVEL SECURITY CHECK
-- ======================================
SELECT 
    '🔒 RLS POLICIES' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '⚠️ RLS DISABLED'
    END as rls_status
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
    AND p.tablename IN ('table_snapshots_index', 'snapshot_restore_log');

-- ======================================
-- 9. STORAGE BUCKET PERMISSIONS CHECK
-- ======================================
-- Note: Storage permissions cannot be checked via SQL
-- You'll need to test this via the test interface

SELECT 
    '💾 STORAGE CHECK' as check_type,
    'Run storage tests via test interface' as instruction,
    '⚠️ MANUAL CHECK REQUIRED' as status;

-- ======================================
-- 10. FUNCTION PERMISSIONS CHECK
-- ======================================
SELECT 
    '⚙️ FUNCTIONS CHECK' as check_type,
    routine_name,
    routine_type,
    security_type,
    is_deterministic
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('get_available_snapshot_dates', 'get_snapshot_info');

-- ======================================
-- 11. DATE AND TIMEZONE CHECK
-- ======================================
SELECT 
    '⏰ TIMEZONE CHECK' as check_type,
    NOW() as current_utc,
    NOW() AT TIME ZONE 'Europe/Paris' as current_paris,
    CURRENT_DATE as current_date,
    (NOW() AT TIME ZONE 'Europe/Paris')::date as paris_date;

-- ======================================
-- 12. EDGE FUNCTION CONNECTIVITY CHECK
-- ======================================
-- Note: Edge Function connectivity cannot be checked via SQL
-- Use the test interface to verify Edge Function deployment

SELECT 
    '🔗 EDGE FUNCTION CHECK' as check_type,
    'Use test interface to verify function deployment' as instruction,
    '⚠️ MANUAL CHECK REQUIRED' as status;

-- ======================================
-- 13. RECOMMENDED FIXES
-- ======================================
SELECT 
    '🔧 SETUP RECOMMENDATIONS' as check_type,
    'If tables missing, run setup SQL script' as recommendation_1,
    'If no snapshots, create manual test snapshot' as recommendation_2,
    'If RLS issues, check policy configuration' as recommendation_3,
    'If storage issues, verify bucket permissions' as recommendation_4;

-- ======================================
-- 14. QUICK CLEANUP (Optional)
-- ======================================
-- Uncomment the following to clean up test data
-- DELETE FROM table_snapshots_index WHERE object_path LIKE 'test/%';
-- DELETE FROM snapshot_restore_log WHERE restored_by = 'test-suite';

-- ======================================
-- DIAGNOSTIC COMPLETE
-- ======================================
SELECT 
    '✅ DIAGNOSTIC COMPLETE' as result,
    'Check all results above for issues' as next_steps,
    NOW() as completed_at;