-- Setup script for Supabase Snapshot Infrastructure
-- Run this in your Supabase SQL editor

-- 1. Create the snapshots index table
CREATE TABLE IF NOT EXISTS table_snapshots_index (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_table_snapshots_date ON table_snapshots_index(snapshot_date);

-- 3. Create storage bucket for snapshots (if it doesn't exist)
-- Note: Storage buckets must be created via the dashboard or API
-- Go to Storage > Create new bucket: "table-snapshots"

-- 4. Set up Row Level Security (RLS) policies
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage snapshots
CREATE POLICY "Service role can manage snapshots" ON table_snapshots_index
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read snapshots
CREATE POLICY "Authenticated users can read snapshots" ON table_snapshots_index
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_table_snapshots_updated_at ON table_snapshots_index;
CREATE TRIGGER update_table_snapshots_updated_at
    BEFORE UPDATE ON table_snapshots_index
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert a test record to verify the setup
INSERT INTO table_snapshots_index (snapshot_date, object_path, row_count, file_size_bytes, metadata)
VALUES (
    CURRENT_DATE,
    'test/setup-verification.json',
    0,
    0,
    '{"setup": "verification", "timestamp": "' || NOW() || '"}'
)
ON CONFLICT (snapshot_date) DO NOTHING;

-- 8. Verify the setup
SELECT 
    'Setup verification' as status,
    COUNT(*) as table_count,
    (SELECT COUNT(*) FROM table_snapshots_index) as snapshot_count
FROM information_schema.tables 
WHERE table_name = 'table_snapshots_index';

-- 9. Show current snapshots
SELECT 
    snapshot_date,
    object_path,
    row_count,
    file_size_bytes,
    created_at
FROM table_snapshots_index
ORDER BY snapshot_date DESC
LIMIT 5;

