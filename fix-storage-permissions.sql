-- =============================================
-- FIX STORAGE BUCKET PERMISSIONS
-- =============================================
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('table-snapshots', 'table-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role all operations" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read snapshots" ON storage.objects;

-- 3. Create comprehensive storage policies
-- Allow public/anonymous read access to snapshots
CREATE POLICY "Allow public read snapshots" ON storage.objects
FOR SELECT USING (
    bucket_id = 'table-snapshots'
);

-- Allow authenticated users to read snapshots
CREATE POLICY "Allow authenticated read snapshots" ON storage.objects
FOR SELECT USING (
    bucket_id = 'table-snapshots' AND 
    (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Allow service role full access (for Edge Functions)
CREATE POLICY "Allow service role all operations" ON storage.objects
FOR ALL USING (
    bucket_id = 'table-snapshots' AND 
    auth.role() = 'service_role'
) WITH CHECK (
    bucket_id = 'table-snapshots' AND 
    auth.role() = 'service_role'
);

-- Allow authenticated users to upload/manage their snapshots
CREATE POLICY "Allow authenticated manage snapshots" ON storage.objects
FOR ALL USING (
    bucket_id = 'table-snapshots' AND 
    auth.role() = 'authenticated'
) WITH CHECK (
    bucket_id = 'table-snapshots' AND 
    auth.role() = 'authenticated'
);

-- 4. Verify policies
SELECT schemaname, tablename, policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%snapshot%';

-- 5. Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'table-snapshots';