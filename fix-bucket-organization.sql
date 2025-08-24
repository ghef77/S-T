-- =============================================
-- FIX BUCKET ORGANIZATION WITH SQL
-- =============================================

-- Step 1: Check current storage objects
SELECT 
    name,
    bucket_id,
    metadata->>'size' as size_bytes,
    created_at
FROM storage.objects 
WHERE bucket_id = 'table-snapshots'
ORDER BY name;

-- Step 2: Check current index paths vs storage objects
SELECT 
    i.snapshot_date,
    i.object_path as index_path,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM storage.objects 
            WHERE bucket_id = 'table-snapshots' 
            AND name = i.object_path
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as file_status
FROM table_snapshots_index i
ORDER BY i.snapshot_date DESC;

-- Step 3: Fix the issue by updating index paths to match actual storage files
-- First, let's see what files actually exist and what paths we need

WITH actual_files AS (
    SELECT 
        name as actual_path,
        CASE 
            -- Extract date from filename patterns
            WHEN name ~ '\d{4}-\d{2}-\d{2}' THEN 
                (regexp_match(name, '(\d{4}-\d{2}-\d{2})'))[1]::date
            ELSE CURRENT_DATE
        END as file_date,
        CASE 
            WHEN name LIKE '%daily%' OR name LIKE '%DAILY%' THEN 'DAILY'
            WHEN name LIKE '%MANUAL%' OR name LIKE '%manual%' THEN 'MANUAL'
            ELSE 'UNKNOWN'
        END as file_type
    FROM storage.objects 
    WHERE bucket_id = 'table-snapshots'
    AND metadata IS NOT NULL  -- Only actual files, not folders
)
SELECT 
    file_date,
    file_type,
    actual_path,
    -- What the path should be according to app structure
    CASE 
        WHEN file_type = 'DAILY' THEN 
            EXTRACT(YEAR FROM file_date) || '/' || 
            LPAD(EXTRACT(MONTH FROM file_date)::text, 2, '0') || '/' || 
            LPAD(EXTRACT(DAY FROM file_date)::text, 2, '0') || '/' || 
            'DAILY_staffTable.json'
        WHEN file_type = 'MANUAL' THEN
            EXTRACT(YEAR FROM file_date) || '/' || 
            LPAD(EXTRACT(MONTH FROM file_date)::text, 2, '0') || '/' || 
            LPAD(EXTRACT(DAY FROM file_date)::text, 2, '0') || '/' || 
            REGEXP_REPLACE(actual_path, '.*/([^/]+)$', 'MANUAL_\1')
        ELSE actual_path
    END as expected_path
FROM actual_files
ORDER BY file_date DESC, file_type;

-- Step 4: SOLUTION - Update index table to match actual storage files
-- Since we can't easily move files in storage via SQL, let's update the index
-- to point to the files that actually exist

-- First backup the current state
CREATE TABLE IF NOT EXISTS table_snapshots_index_backup_2 AS 
SELECT *, NOW() as backup_time FROM table_snapshots_index;

-- Option A: Update paths to match flat file structure (if files are still flat)
UPDATE table_snapshots_index 
SET object_path = CASE 
    WHEN snapshot_date = '2025-08-23' THEN '2025-08-23_staffTable_daily.json'
    WHEN snapshot_date = '2025-08-24' AND object_path LIKE '%MANUAL%' THEN 
        (SELECT name FROM storage.objects 
         WHERE bucket_id = 'table-snapshots' 
         AND name LIKE '%2025-08-24%MANUAL%' 
         AND metadata IS NOT NULL 
         LIMIT 1)
    WHEN snapshot_date = '2025-08-24' AND object_path LIKE '%DAILY%' THEN '2025-08-24_staffTable_daily.json'
    ELSE object_path
END
WHERE snapshot_date IN ('2025-08-23', '2025-08-24')
AND EXISTS (
    SELECT 1 FROM storage.objects 
    WHERE bucket_id = 'table-snapshots' 
    AND name = CASE 
        WHEN table_snapshots_index.snapshot_date = '2025-08-23' THEN '2025-08-23_staffTable_daily.json'
        WHEN table_snapshots_index.snapshot_date = '2025-08-24' AND table_snapshots_index.object_path LIKE '%DAILY%' THEN '2025-08-24_staffTable_daily.json'
        ELSE table_snapshots_index.object_path
    END
);

-- Option B: If files are in organized folders (2025/08/24/), update to that structure
UPDATE table_snapshots_index 
SET object_path = CASE 
    WHEN snapshot_date = '2025-08-23' THEN '2025/08/23/DAILY_staffTable.json'
    WHEN snapshot_date = '2025-08-24' AND object_path LIKE '%DAILY%' THEN '2025/08/24/DAILY_staffTable.json'
    WHEN snapshot_date = '2025-08-24' AND object_path LIKE '%MANUAL%' THEN 
        '2025/08/24/' || REGEXP_REPLACE(SPLIT_PART(object_path, '/', -1), '.*', 'MANUAL_&')
    ELSE object_path
END
WHERE snapshot_date IN ('2025-08-23', '2025-08-24');

-- Step 5: Verify the fix
SELECT 
    i.snapshot_date,
    i.object_path as index_path,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM storage.objects 
            WHERE bucket_id = 'table-snapshots' 
            AND name = i.object_path
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as file_status,
    i.row_count,
    i.file_size_bytes
FROM table_snapshots_index i
WHERE i.snapshot_date >= '2025-08-20'
ORDER BY i.snapshot_date DESC, i.created_at DESC;

-- Step 6: Clean up any duplicate entries
-- Remove duplicate entries keeping the most recent one for each date
WITH ranked_snapshots AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY snapshot_date, 
               CASE WHEN object_path LIKE '%MANUAL%' THEN 'MANUAL' ELSE 'DAILY' END
               ORDER BY created_at DESC
           ) as rn
    FROM table_snapshots_index
)
DELETE FROM table_snapshots_index 
WHERE id IN (
    SELECT id FROM ranked_snapshots WHERE rn > 1
);

-- Step 7: Final verification
SELECT 
    COUNT(*) as total_snapshots,
    COUNT(DISTINCT snapshot_date) as unique_dates,
    MIN(snapshot_date) as oldest,
    MAX(snapshot_date) as newest
FROM table_snapshots_index;

-- Show recent snapshots
SELECT 
    snapshot_date,
    object_path,
    row_count,
    ROUND(file_size_bytes/1024.0, 2) as size_kb,
    created_at
FROM table_snapshots_index 
ORDER BY snapshot_date DESC, created_at DESC 
LIMIT 10;