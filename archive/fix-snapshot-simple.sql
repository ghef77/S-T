-- Simple snapshot setup without storage policies
-- Run this in Supabase SQL Editor

-- 1. Create the snapshots index table
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

-- 2. Create the restore log table
CREATE TABLE IF NOT EXISTS public.snapshot_restore_log (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    restored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restored_by TEXT NOT NULL,
    restore_reason TEXT
);

-- 3. Create storage bucket (will fail silently if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('table-snapshots', 'table-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Grant permissions to service role
GRANT ALL ON public.table_snapshots_index TO service_role;
GRANT ALL ON public.snapshot_restore_log TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5. Disable RLS for service role access (simpler approach)
ALTER TABLE public.table_snapshots_index DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_restore_log DISABLE ROW LEVEL SECURITY;

SELECT 'Setup complete! Tables created and permissions granted.' as status;