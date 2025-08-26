-- =====================================================
-- SETUP IMAGE BUCKET POLICIES FOR PROACTIVE MANAGEMENT
-- =====================================================
-- This script sets up policies for automatic image bucket management
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
-- 2. CREATE FUNCTION TO AUTOMATICALLY SET BUCKET POLICIES
-- =====================================================

-- Function to create standard policies for image buckets
CREATE OR REPLACE FUNCTION setup_image_bucket_policies(bucket_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Insert policies for anonymous access (reading)
    INSERT INTO storage.policies (name, bucket_id, command, definition)
    VALUES 
        (
            CONCAT('anon_select_', REPLACE(bucket_name, '-', '_')),
            bucket_name,
            'SELECT',
            'true'
        ),
        (
            CONCAT('anon_insert_', REPLACE(bucket_name, '-', '_')),
            bucket_name,
            'INSERT', 
            'true'
        ),
        (
            CONCAT('service_all_', REPLACE(bucket_name, '-', '_')),
            bucket_name,
            'ALL',
            'auth.role() = ''service_role'''
        )
    ON CONFLICT (name, bucket_id) DO NOTHING;
    
    RAISE NOTICE 'Policies created for bucket: %', bucket_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. SET UP POLICIES FOR BASE BUCKET
-- =====================================================

SELECT setup_image_bucket_policies('patient-images');

-- =====================================================
-- 4. CREATE TRIGGER TO AUTO-SETUP POLICIES FOR NEW BUCKETS
-- =====================================================

-- Function to automatically setup policies when a new image bucket is created
CREATE OR REPLACE FUNCTION auto_setup_image_bucket_policies()
RETURNS TRIGGER AS $$
BEGIN
    -- Only setup policies for patient-images related buckets
    IF NEW.name = 'patient-images' OR NEW.name LIKE 'patient-images-%' THEN
        PERFORM setup_image_bucket_policies(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bucket creation
DROP TRIGGER IF EXISTS trigger_auto_setup_image_bucket_policies ON storage.buckets;
CREATE TRIGGER trigger_auto_setup_image_bucket_policies
    AFTER INSERT ON storage.buckets
    FOR EACH ROW
    EXECUTE FUNCTION auto_setup_image_bucket_policies();

-- =====================================================
-- 5. CREATE TABLE TO TRACK IMAGE BUCKET USAGE
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
-- 6. CREATE FUNCTION TO UPDATE BUCKET STATISTICS
-- =====================================================

CREATE OR REPLACE FUNCTION update_bucket_stats(bucket_name TEXT)
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
    WHERE bucket_id = bucket_name;
    
    -- Upsert the statistics
    INSERT INTO public.image_bucket_stats (bucket_name, total_files, total_size_bytes, last_updated_at)
    VALUES (bucket_name, file_count, total_size, NOW())
    ON CONFLICT (bucket_name) 
    DO UPDATE SET
        total_files = EXCLUDED.total_files,
        total_size_bytes = EXCLUDED.total_size_bytes,
        last_updated_at = EXCLUDED.last_updated_at;
        
    RAISE NOTICE 'Updated stats for bucket %: % files, % bytes', bucket_name, file_count, total_size;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE FUNCTION TO CLEANUP OLD IMAGES
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_images(bucket_name TEXT, days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cleanup_before TIMESTAMP WITH TIME ZONE;
    file_record RECORD;
BEGIN
    -- Calculate cutoff date
    cleanup_before := NOW() - INTERVAL '1 day' * days_old;
    
    -- Log the cleanup operation
    RAISE NOTICE 'Starting cleanup for bucket % - removing files older than %', bucket_name, cleanup_before;
    
    -- Delete old files
    FOR file_record IN 
        SELECT name, created_at 
        FROM storage.objects 
        WHERE bucket_id = bucket_name 
        AND created_at < cleanup_before
    LOOP
        -- Delete the file
        DELETE FROM storage.objects 
        WHERE bucket_id = bucket_name AND name = file_record.name;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Update cleanup timestamp
    UPDATE public.image_bucket_stats 
    SET last_cleanup_at = NOW(), last_updated_at = NOW()
    WHERE bucket_name = cleanup_old_images.bucket_name;
    
    -- Update bucket statistics
    PERFORM update_bucket_stats(bucket_name);
    
    RAISE NOTICE 'Cleanup completed for bucket %: % files deleted', bucket_name, deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions to service role
GRANT ALL ON public.image_bucket_stats TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.image_bucket_stats_id_seq TO service_role;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION setup_image_bucket_policies(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_bucket_stats(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_images(TEXT, INTEGER) TO service_role;

-- =====================================================
-- 9. INITIALIZE STATS FOR EXISTING BUCKETS
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
-- 10. CREATE SCHEDULED CLEANUP (Optional - Manual)
-- =====================================================

-- You can manually run cleanup for all image buckets using:
-- SELECT cleanup_old_images(name, 30) FROM storage.buckets WHERE name = 'patient-images' OR name LIKE 'patient-images-%';

-- Or for a specific bucket:
-- SELECT cleanup_old_images('patient-images', 30);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check created policies
SELECT 
    'Image bucket policies created:' as status,
    COUNT(*) as policy_count
FROM storage.policies 
WHERE bucket_id IN (
    SELECT name 
    FROM storage.buckets 
    WHERE name = 'patient-images' OR name LIKE 'patient-images-%'
);

-- Check bucket statistics
SELECT 
    'Bucket statistics initialized:' as status,
    bucket_name,
    total_files,
    total_size_bytes,
    created_at
FROM public.image_bucket_stats;

-- Summary
SELECT 'SETUP COMPLETE: Image bucket proactive management configured' as final_status;