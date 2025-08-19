-- Demo Snapshot Data for Testing
-- Insert this directly into Supabase to test the snapshot system

-- First, let's insert a demo snapshot index entry for testing
INSERT INTO table_snapshots_index (
    snapshot_date,
    object_path,
    row_count,
    file_size_bytes,
    metadata,
    created_at
) VALUES (
    '2025-01-17', -- Using a different date to avoid conflicts
    'staff_table_2025-01-17_10-00-00.json',
    25, -- Number of rows in the snapshot
    15420, -- File size in bytes (about 15KB)
    '{"table": "staffTable", "version": "1.0.0", "description": "Demo snapshot for testing", "snapshot_time": "2025-01-17T10:00:00.000Z"}',
    NOW()
);

-- Now let's insert a demo restore log entry to show the system has been used
INSERT INTO snapshot_restore_log (
    snapshot_date,
    restored_by,
    notes,
    row_count,
    restore_strategy
) VALUES (
    '2025-01-17',
    'demo_user@test.com',
    'Testing snapshot system functionality',
    25,
    'replace-all'
);

-- To verify the demo data was inserted, run this query:
-- SELECT * FROM table_snapshots_index WHERE snapshot_date = '2025-01-17';
-- SELECT * FROM snapshot_restore_log WHERE snapshot_date = '2025-01-17';
