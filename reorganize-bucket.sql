-- =============================================
-- REORGANIZE STORAGE BUCKET FOR APP COMPATIBILITY
-- =============================================

-- Step 1: First, let's see what files we currently have
SELECT 
    name as file_name,
    metadata->>'size' as file_size,
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'table-snapshots'
ORDER BY created_at DESC;

-- Step 2: The app expects this folder structure:
-- YYYY/MM/DD/TYPE_staffTable.json
-- 
-- Examples:
-- - Daily snapshots: 2025/08/24/DAILY_staffTable.json
-- - Manual snapshots: 2025/08/24/MANUAL_HH-MM-SS_staffTable.json
--
-- Your current files might be flat like: "2025-08-24_staffTable_daily.json"
-- We need to move them to: "2025/08/24/DAILY_staffTable.json"

-- Step 3: Update the object paths in the database index to match the new structure
-- This query shows what needs to be updated:
SELECT 
    id,
    snapshot_date,
    object_path as current_path,
    CASE 
        WHEN object_path LIKE '%MANUAL%' THEN 
            EXTRACT(YEAR FROM snapshot_date) || '/' || 
            LPAD(EXTRACT(MONTH FROM snapshot_date)::text, 2, '0') || '/' || 
            LPAD(EXTRACT(DAY FROM snapshot_date)::text, 2, '0') || '/' || 
            REGEXP_REPLACE(
                SPLIT_PART(object_path, '/', -1), 
                '([0-9]{4}-[0-9]{2}-[0-9]{2}_)?(.+)', 
                'MANUAL_\2'
            )
        ELSE 
            EXTRACT(YEAR FROM snapshot_date) || '/' || 
            LPAD(EXTRACT(MONTH FROM snapshot_date)::text, 2, '0') || '/' || 
            LPAD(EXTRACT(DAY FROM snapshot_date)::text, 2, '0') || '/' || 
            'DAILY_staffTable.json'
    END as new_path
FROM table_snapshots_index
WHERE object_path IS NOT NULL
ORDER BY snapshot_date DESC;

-- Step 4: BACKUP your current index table first
CREATE TABLE IF NOT EXISTS table_snapshots_index_backup AS 
SELECT * FROM table_snapshots_index;

-- Step 5: Update the index table with the new organized paths
-- WARNING: Run this carefully and test first with a LIMIT
UPDATE table_snapshots_index 
SET object_path = CASE 
    WHEN object_path LIKE '%MANUAL%' THEN 
        EXTRACT(YEAR FROM snapshot_date) || '/' || 
        LPAD(EXTRACT(MONTH FROM snapshot_date)::text, 2, '0') || '/' || 
        LPAD(EXTRACT(DAY FROM snapshot_date)::text, 2, '0') || '/' || 
        REGEXP_REPLACE(
            SPLIT_PART(object_path, '/', -1), 
            '([0-9]{4}-[0-9]{2}-[0-9]{2}_)?(.+)', 
            'MANUAL_\2'
        )
    ELSE 
        EXTRACT(YEAR FROM snapshot_date) || '/' || 
        LPAD(EXTRACT(MONTH FROM snapshot_date)::text, 2, '0') || '/' || 
        LPAD(EXTRACT(DAY FROM snapshot_date)::text, 2, '0') || '/' || 
        'DAILY_staffTable.json'
END,
updated_at = NOW()
WHERE object_path IS NOT NULL;

-- Step 6: Verify the changes
SELECT 
    snapshot_date,
    object_path,
    row_count,
    file_size_bytes
FROM table_snapshots_index
ORDER BY snapshot_date DESC
LIMIT 10;

-- Step 7: Check for any inconsistencies
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT snapshot_date) as unique_dates,
    MIN(snapshot_date) as oldest_snapshot,
    MAX(snapshot_date) as newest_snapshot
FROM table_snapshots_index;

-- =============================================
-- STORAGE FILE REORGANIZATION
-- =============================================
-- NOTE: The SQL above only updates the DATABASE paths.
-- The actual STORAGE FILES need to be moved using JavaScript/API calls
-- because PostgreSQL cannot directly move files in Supabase Storage.
--
-- After running the SQL above, you'll need to run the JavaScript
-- reorganization script to actually move the files in storage.
-- =============================================