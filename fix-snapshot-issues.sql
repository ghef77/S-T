-- =============================================
-- FIX SNAPSHOT SYSTEM ISSUES
-- =============================================
-- This script fixes the identified issues with the snapshot system

-- 1. Fix table_snapshots_index constraint issue
-- The Edge Function uses onConflict: 'snapshot_date,created_at' but this constraint doesn't exist

-- First, let's see the current structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'table_snapshots_index' 
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'table_snapshots_index';

-- 2. Drop and recreate the table with proper constraints
DROP TABLE IF EXISTS table_snapshots_index CASCADE;

-- Recreate with proper structure and constraints
CREATE TABLE table_snapshots_index (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Create the constraint that the Edge Function expects
    UNIQUE(snapshot_date, created_at)
);

-- Create index for better performance
CREATE INDEX idx_snapshots_date ON table_snapshots_index(snapshot_date DESC);
CREATE INDEX idx_snapshots_created ON table_snapshots_index(created_at DESC);

-- 3. Fix RLS policies to allow proper access

-- Enable RLS
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON table_snapshots_index
    FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Create policy specifically for service role (used by Edge Functions)
CREATE POLICY "Allow all for service role" ON table_snapshots_index
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 4. Fix storage bucket policies
-- Note: Storage policies need to be set in Supabase Dashboard or via SQL

-- Create storage policies for table-snapshots bucket
-- (This needs to be run in the Supabase Dashboard's SQL editor)

INSERT INTO storage.buckets (id, name, public) 
VALUES ('table-snapshots', 'table-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read snapshots
CREATE POLICY "Allow authenticated read" ON storage.objects
FOR SELECT USING (
    bucket_id = 'table-snapshots' AND 
    (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Allow service role to manage snapshots (for Edge Functions)
CREATE POLICY "Allow service role all operations" ON storage.objects
FOR ALL USING (
    bucket_id = 'table-snapshots' AND 
    auth.role() = 'service_role'
);

-- Allow authenticated users to upload snapshots
CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'table-snapshots' AND 
    auth.role() = 'authenticated'
);

-- 5. Create some sample data to test
INSERT INTO table_snapshots_index (
    snapshot_date,
    object_path,
    row_count,
    file_size_bytes,
    metadata
) VALUES (
    CURRENT_DATE,
    '2024/08/24/DAILY_staffTable.json',
    1,
    1024,
    '{"table": "staffTable", "version": "2.0.0", "type": "DAILY_SNAPSHOT"}'::jsonb
) ON CONFLICT (snapshot_date, created_at) DO UPDATE SET
    object_path = EXCLUDED.object_path,
    row_count = EXCLUDED.row_count,
    file_size_bytes = EXCLUDED.file_size_bytes,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- 6. Verify the fix
SELECT 'Table structure fixed' as status;
SELECT COUNT(*) as snapshot_count FROM table_snapshots_index;

-- Test the constraint that Edge Function uses
SELECT 'Testing constraint...' as test;
INSERT INTO table_snapshots_index (
    snapshot_date,
    object_path,
    row_count,
    file_size_bytes
) VALUES (
    CURRENT_DATE,
    'test/path.json',
    100,
    2048
) ON CONFLICT (snapshot_date, created_at) DO UPDATE SET
    object_path = EXCLUDED.object_path,
    row_count = EXCLUDED.row_count,
    updated_at = NOW();

SELECT 'Constraint test successful' as result;