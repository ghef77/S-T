-- Fix storage bucket permissions for snapshots

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role all operations" ON storage.objects;

-- Create permissive policy for table-snapshots bucket
CREATE POLICY "Allow public access to snapshots" ON storage.objects
FOR ALL USING (bucket_id = 'table-snapshots');

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('table-snapshots', 'table-snapshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Show current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%snapshot%';