-- Cell Locks Table Setup for Collaborative Editing (Demo Mode - No Auth Required)
-- This script creates permissive policies for testing without authentication

-- Create the celllocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS celllocks (
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
        CREATE INDEX idx_cell_locks_cell_id ON celllocks(cell_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cell_locks_user_id') THEN
        CREATE INDEX idx_cell_locks_user_id ON celllocks(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cell_locks_expires_at') THEN
        CREATE INDEX idx_cell_locks_expires_at ON celllocks(expires_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cell_locks_locked_at') THEN
        CREATE INDEX idx_cell_locks_locked_at ON celllocks(locked_at);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE celllocks ENABLE ROW LEVEL SECURITY;

-- Create VERY PERMISSIVE policies for demo mode (NO AUTH REQUIRED)
DO $$ 
BEGIN
    -- Allow ANYONE to read all locks (to see what's locked)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow anyone to read cell locks') THEN
        CREATE POLICY "Allow anyone to read cell locks" ON celllocks
            FOR SELECT USING (true);
    END IF;
    
    -- Allow ANYONE to insert locks (to lock cells)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow anyone to insert cell locks') THEN
        CREATE POLICY "Allow anyone to insert cell locks" ON celllocks
            FOR INSERT WITH CHECK (true);
    END IF;
    
    -- Allow ANYONE to delete locks (to unlock cells)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow anyone to delete cell locks') THEN
        CREATE POLICY "Allow anyone to delete cell locks" ON celllocks
            FOR DELETE USING (true);
    END IF;
    
    -- Allow ANYONE to update locks (to extend lock time)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'celllocks' AND policyname = 'Allow anyone to update cell locks') THEN
        CREATE POLICY "Allow anyone to update cell locks" ON celllocks
            FOR UPDATE USING (true);
    END IF;
END $$;

-- Grant permissions to public (everyone)
GRANT SELECT, INSERT, UPDATE, DELETE ON celllocks TO public;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cell_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM celllocks WHERE expires_at < now();
END;
$$;

-- Grant execute permission on the cleanup function to public
GRANT EXECUTE ON FUNCTION cleanup_expired_cell_locks() TO public;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clean up expired locks before processing new operations
    DELETE FROM celllocks WHERE expires_at < now();
    RETURN NEW;
END;
$$;

-- Create trigger only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cleanup_expired_locks_trigger') THEN
        CREATE TRIGGER cleanup_expired_locks_trigger
            BEFORE INSERT OR UPDATE ON celllocks
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
FROM celllocks cl
WHERE cl.expires_at > now()
ORDER BY cl.locked_at DESC;

-- Grant access to the view to public
GRANT SELECT ON active_cell_locks TO public;

-- Test the setup
SELECT 'Cell Locks table setup completed successfully for DEMO MODE!' as status;
