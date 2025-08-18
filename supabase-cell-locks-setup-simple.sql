-- Cell Locks Table Setup for Collaborative Editing (Simplified Version)
-- This script only creates the essential elements needed for cell locking

-- Create the cellLocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS cellLocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id TEXT NOT NULL UNIQUE, -- Format: "rowIndex_cellIndex"
    user_id TEXT NOT NULL, -- User identifier
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL, -- When the lock expires
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cell_locks_cell_id') THEN
        CREATE INDEX idx_cell_locks_cell_id ON cellLocks(cell_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cell_locks_user_id') THEN
        CREATE INDEX idx_cell_locks_user_id ON cellLocks(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cell_locks_expires_at') THEN
        CREATE INDEX idx_cell_locks_expires_at ON cellLocks(expires_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cell_locks_locked_at') THEN
        CREATE INDEX idx_cell_locks_locked_at ON cellLocks(locked_at);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE cellLocks ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$ 
BEGIN
    -- Allow authenticated users to read all locks (to see what's locked)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow authenticated users to read cell locks') THEN
        CREATE POLICY "Allow authenticated users to read cell locks" ON cellLocks
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    -- Allow authenticated users to insert locks (to lock cells)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow authenticated users to insert cell locks') THEN
        CREATE POLICY "Allow authenticated users to insert cell locks" ON cellLocks
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    -- Allow users to delete their own locks (to unlock cells)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow users to delete their own locks') THEN
        CREATE POLICY "Allow users to delete their own locks" ON cellLocks
            FOR DELETE USING (auth.role() = 'authenticated' AND user_id = auth.uid()::text);
    END IF;
    
    -- Allow users to update their own locks (to extend lock time)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow users to update their own locks') THEN
        CREATE POLICY "Allow users to update their own locks" ON cellLocks
            FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid()::text);
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON cellLocks TO authenticated;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cell_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM cellLocks WHERE expires_at < now();
END;
$$;

-- Grant execute permission on the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_cell_locks() TO authenticated;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clean up expired locks before processing new operations
    DELETE FROM cellLocks WHERE expires_at < now();
    RETURN NEW;
END;
$$;

-- Create trigger only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cleanup_expired_locks_trigger') THEN
        CREATE TRIGGER cleanup_expired_locks_trigger
            BEFORE INSERT OR UPDATE ON cellLocks
            FOR EACH ROW
            EXECUTE FUNCTION trigger_cleanup_expired_locks();
    END IF;
END $$;

-- Create view for active locks
CREATE OR REPLACE VIEW active_cell_locks AS
SELECT 
    cl.cell_id,
    cl.user_id,
    cl.locked_at,
    cl.expires_at,
    EXTRACT(EPOCH FROM (cl.expires_at - now())) / 60 as minutes_remaining
FROM cellLocks cl
WHERE cl.expires_at > now()
ORDER BY cl.locked_at DESC;

-- Grant access to the view
GRANT SELECT ON active_cell_locks TO authenticated;

-- Test the setup
SELECT 'Cell Locks table setup completed successfully!' as status;
