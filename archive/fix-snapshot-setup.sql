-- =====================================================
-- FIX SNAPSHOT FUNCTION SETUP
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to fix common issues

-- 1. Create the snapshots index table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.table_snapshots_index (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(snapshot_date, created_at)
);

-- 2. Create the restore log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.snapshot_restore_log (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    restored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restored_by TEXT NOT NULL,
    restore_reason TEXT
);

-- 3. Create storage bucket for snapshots if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('table-snapshots', 'table-snapshots', false, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- 4. Set up RLS policies to allow service role access
ALTER TABLE public.table_snapshots_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_restore_log ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for service role (allows full access)
DO $$
BEGIN
    -- Policy for table_snapshots_index
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'table_snapshots_index' 
        AND policyname = 'service_role_full_access'
    ) THEN
        CREATE POLICY service_role_full_access ON public.table_snapshots_index
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- Policy for snapshot_restore_log
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'snapshot_restore_log' 
        AND policyname = 'service_role_full_access'
    ) THEN
        CREATE POLICY service_role_full_access ON public.snapshot_restore_log
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 6. Create storage policies for the bucket
INSERT INTO storage.policies (name, bucket_id, command, definition)
VALUES 
  ('service_role_all_access', 'table-snapshots', 'SELECT', 'auth.role() = ''service_role'''),
  ('service_role_insert_access', 'table-snapshots', 'INSERT', 'auth.role() = ''service_role'''),
  ('service_role_update_access', 'table-snapshots', 'UPDATE', 'auth.role() = ''service_role'''),
  ('service_role_delete_access', 'table-snapshots', 'DELETE', 'auth.role() = ''service_role''')
ON CONFLICT (name, bucket_id) DO NOTHING;

-- 7. Grant necessary permissions
GRANT ALL ON public.table_snapshots_index TO service_role;
GRANT ALL ON public.snapshot_restore_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.table_snapshots_index_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.snapshot_restore_log_id_seq TO service_role;

-- Verify setup
SELECT 'Setup complete! Tables and policies created.' as status;