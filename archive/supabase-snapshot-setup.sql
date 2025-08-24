-- Supabase Snapshot System Setup
-- Run this in your Supabase SQL editor

-- 1. Create the snapshots index table
CREATE TABLE IF NOT EXISTS table_snapshots_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index on snapshot_date for fast lookups
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON table_snapshots_index(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON table_snapshots_index(created_at);

-- 2. Create the restore log table
CREATE TABLE IF NOT EXISTS snapshot_restore_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restored_at TIMESTAMPTZ DEFAULT now(),
    snapshot_date DATE NOT NULL,
    restored_by TEXT,
    notes TEXT,
    row_count INTEGER NOT NULL,
    restore_strategy TEXT NOT NULL DEFAULT 'replace-all'
);

-- Create index on restore operations
CREATE INDEX IF NOT EXISTS idx_restore_log_date ON snapshot_restore_log(restored_at);
CREATE INDEX IF NOT EXISTS idx_restore_log_snapshot_date ON snapshot_restore_log(snapshot_date);

-- 3. Create storage bucket for snapshots (if it doesn't exist)
-- Note: This requires admin privileges in Supabase
-- You may need to create this manually in the Storage section of your Supabase dashboard

-- 4. Set up RLS policies for the snapshots index table
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read snapshots index
CREATE POLICY "Allow authenticated users to read snapshots index" ON table_snapshots_index
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to manage snapshots (for the Edge Function)
CREATE POLICY "Allow service role to manage snapshots" ON table_snapshots_index
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Set up RLS policies for the restore log table
ALTER TABLE snapshot_restore_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read restore logs
CREATE POLICY "Allow authenticated users to read restore logs" ON snapshot_restore_log
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to write restore logs
CREATE POLICY "Allow service role to write restore logs" ON snapshot_restore_log
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 6. Create a function to get available snapshot dates
CREATE OR REPLACE FUNCTION get_available_snapshot_dates()
RETURNS TABLE(snapshot_date DATE, created_at TIMESTAMPTZ, row_count INTEGER)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT snapshot_date, created_at, row_count
    FROM table_snapshots_index
    ORDER BY snapshot_date DESC;
$$;

-- 7. Create a function to get snapshot info for a specific date
CREATE OR REPLACE FUNCTION get_snapshot_info(target_date DATE)
RETURNS TABLE(id UUID, snapshot_date DATE, created_at TIMESTAMPTZ, object_path TEXT, row_count INTEGER, file_size_bytes BIGINT, metadata JSONB)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, snapshot_date, created_at, object_path, row_count, file_size_bytes, metadata
    FROM table_snapshots_index
    WHERE snapshot_date = target_date;
$$;

-- 8. Grant necessary permissions
GRANT SELECT ON table_snapshots_index TO authenticated;
GRANT SELECT ON snapshot_restore_log TO authenticated;
GRANT ALL ON table_snapshots_index TO service_role;
GRANT ALL ON snapshot_restore_log TO service_role;
GRANT EXECUTE ON FUNCTION get_available_snapshot_dates() TO authenticated;
GRANT EXECUTE ON FUNCTION get_snapshot_info(DATE) TO authenticated;

-- 9. Insert a sample snapshot record for testing (optional)
-- INSERT INTO table_snapshots_index (snapshot_date, object_path, row_count, file_size_bytes, metadata)
-- VALUES (CURRENT_DATE, '2025/01/27/staffTable.json', 0, 0, '{"table": "staffTable", "version": "1.0.0"}');
