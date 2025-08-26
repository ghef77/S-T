-- =====================================================
-- SETUP IMAGE BUCKET POLICIES FOR PROACTIVE MANAGEMENT (FIXED)
-- =====================================================
-- This script sets up the database components for automatic image bucket management
-- Note: Storage policies must be set up manually in Supabase Dashboard or via RLS
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. ENSURE BASE BUCKET EXISTS
-- =====================================================

-- Create the base patient-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patient-images', 'patient-images', false, 1073741824, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 2. CREATE TABLE TO TRACK IMAGE BUCKET USAGE
-- =====================================================

-- Table to track bucket usage statistics
CREATE TABLE IF NOT EXISTS public.image_bucket_stats (
    id BIGSERIAL PRIMARY KEY,
    bucket_name TEXT NOT NULL UNIQUE,
    total_files INTEGER NOT NULL DEFAULT 0,
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    last_cleanup_at TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the stats table
ALTER TABLE public.image_bucket_stats ENABLE ROW LEVEL SECURITY;

-- Policy for reading stats (anonymous access for gallery)
CREATE POLICY "Allow public read access to bucket stats" ON public.image_bucket_stats
    FOR SELECT USING (true);

-- Policy for service role to manage stats
CREATE POLICY "Allow service role full access to bucket stats" ON public.image_bucket_stats
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- 3. CREATE FUNCTION TO UPDATE BUCKET STATISTICS
-- =====================================================

CREATE OR REPLACE FUNCTION update_bucket_stats(p_bucket_name TEXT)
RETURNS VOID AS $$
DECLARE
    file_count INTEGER;
    total_size BIGINT;
BEGIN
    -- Get current statistics from storage.objects
    SELECT 
        COUNT(*),
        COALESCE(SUM((metadata->>'size')::BIGINT), 0)
    INTO file_count, total_size
    FROM storage.objects 
    WHERE bucket_id = p_bucket_name;
    
    -- Upsert the statistics
    INSERT INTO public.image_bucket_stats (bucket_name, total_files, total_size_bytes, last_updated_at)
    VALUES (p_bucket_name, file_count, total_size, NOW())
    ON CONFLICT (bucket_name) 
    DO UPDATE SET
        total_files = EXCLUDED.total_files,
        total_size_bytes = EXCLUDED.total_size_bytes,
        last_updated_at = EXCLUDED.last_updated_at;
        
    RAISE NOTICE 'Updated stats for bucket %: % files, % bytes', p_bucket_name, file_count, total_size;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE FUNCTION TO CLEANUP OLD IMAGES
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_images(p_bucket_name TEXT, days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cleanup_before TIMESTAMP WITH TIME ZONE;
    file_record RECORD;
BEGIN
    -- Calculate cutoff date
    cleanup_before := NOW() - INTERVAL '1 day' * days_old;
    
    -- Log the cleanup operation
    RAISE NOTICE 'Starting cleanup for bucket % - removing files older than %', p_bucket_name, cleanup_before;
    
    -- Delete old files
    FOR file_record IN 
        SELECT name, created_at 
        FROM storage.objects 
        WHERE bucket_id = p_bucket_name 
        AND created_at < cleanup_before
    LOOP
        -- Delete the file
        DELETE FROM storage.objects 
        WHERE bucket_id = p_bucket_name AND name = file_record.name;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Update cleanup timestamp
    UPDATE public.image_bucket_stats 
    SET last_cleanup_at = NOW(), last_updated_at = NOW()
    WHERE bucket_name = p_bucket_name;
    
    -- Update bucket statistics
    PERFORM update_bucket_stats(p_bucket_name);
    
    RAISE NOTICE 'Cleanup completed for bucket %: % files deleted', p_bucket_name, deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions to service role
GRANT ALL ON public.image_bucket_stats TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.image_bucket_stats_id_seq TO service_role;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION update_bucket_stats(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_images(TEXT, INTEGER) TO service_role;

-- =====================================================
-- 6. INITIALIZE STATS FOR EXISTING BUCKETS
-- =====================================================

-- Update stats for any existing image buckets
DO $$
DECLARE
    bucket_record RECORD;
BEGIN
    FOR bucket_record IN 
        SELECT name 
        FROM storage.buckets 
        WHERE name = 'patient-images' OR name LIKE 'patient-images-%'
    LOOP
        PERFORM update_bucket_stats(bucket_record.name);
    END LOOP;
END $$;

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

-- Check bucket exists
SELECT 
    'Image buckets found:' as status,
    name,
    file_size_limit / 1024 / 1024 as size_limit_mb
FROM storage.buckets 
WHERE name = 'patient-images' OR name LIKE 'patient-images-%';

-- Check bucket statistics
SELECT 
    'Bucket statistics initialized:' as status,
    bucket_name,
    total_files,
    total_size_bytes,
    created_at
FROM public.image_bucket_stats;

-- Summary
SELECT 'DATABASE SETUP COMPLETE: Image bucket management functions ready' as final_status;

-- =====================================================
-- MANUAL STORAGE POLICY SETUP REQUIRED
-- =====================================================

-- IMPORTANT: You must manually set up storage policies in Supabase Dashboard
-- Go to: Storage > Policies > Create Policy

-- For each image bucket (patient-images, patient-images-1, etc.), create these policies:

-- 1. SELECT Policy (Allow public read):
--    Policy Name: Allow public SELECT on patient-images
--    Target roles: public
--    Policy Command: SELECT
--    Definition: true

-- 2. INSERT Policy (Allow public upload):
--    Policy Name: Allow public INSERT on patient-images  
--    Target roles: public
--    Policy Command: INSERT
--    Definition: true

-- 3. DELETE Policy (Allow service role delete):
--    Policy Name: Allow service role DELETE on patient-images
--    Target roles: service_role
--    Policy Command: DELETE
--    Definition: true

-- 4. UPDATE Policy (Allow service role update):
--    Policy Name: Allow service role UPDATE on patient-images
--    Target roles: service_role  
--    Policy Command: UPDATE
--    Definition: true

-- Note: Repeat these policies for each new bucket created (patient-images-1, patient-images-2, etc.)

-- =====================================================
-- MANUAL USAGE EXAMPLES
-- =====================================================

-- Manual cleanup for specific bucket (30 days old):
-- SELECT cleanup_old_images('patient-images', 30);

-- Update statistics for specific bucket:
-- SELECT update_bucket_stats('patient-images');

-- Update statistics for all image buckets:
-- SELECT update_bucket_stats(name) FROM storage.buckets WHERE name LIKE 'patient-images%';

-- View current bucket statistics:
-- SELECT bucket_name, total_files, (total_size_bytes / 1024.0 / 1024.0) as size_mb, last_cleanup_at FROM image_bucket_stats;