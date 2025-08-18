-- Cell Locks Table Setup for Collaborative Editing
-- This table stores information about which cells are currently locked by which users

-- Create the cellLocks table
CREATE TABLE IF NOT EXISTS cellLocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id TEXT NOT NULL UNIQUE, -- Format: "rowIndex_cellIndex"
    user_id TEXT NOT NULL, -- User identifier
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL, -- When the lock expires
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cell_locks_cell_id ON cellLocks(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_locks_user_id ON cellLocks(user_id);
CREATE INDEX IF NOT EXISTS idx_cell_locks_expires_at ON cellLocks(expires_at);
CREATE INDEX IF NOT EXISTS idx_cell_locks_locked_at ON cellLocks(locked_at);

-- Enable Row Level Security
ALTER TABLE cellLocks ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow authenticated users to read all locks (to see what's locked)
CREATE POLICY "Allow authenticated users to read cell locks" ON cellLocks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert locks (to lock cells)
CREATE POLICY "Allow authenticated users to insert cell locks" ON cellLocks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to delete their own locks (to unlock cells)
CREATE POLICY "Allow users to delete their own locks" ON cellLocks
    FOR DELETE USING (auth.role() = 'authenticated' AND user_id = auth.uid()::text);

-- Allow users to update their own locks (to extend lock time)
CREATE POLICY "Allow users to update their own locks" ON cellLocks
    FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid()::text);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON cellLocks TO authenticated;

-- Create a function to automatically clean up expired locks
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

-- Create a cron job to automatically clean up expired locks every minute
-- Note: This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-cell-locks', '* * * * *', 'SELECT cleanup_expired_cell_locks();');

-- Alternative: Create a trigger to clean up expired locks on insert/update
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

CREATE TRIGGER cleanup_expired_locks_trigger
    BEFORE INSERT OR UPDATE ON cellLocks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_expired_locks();

-- Insert some test data (optional, for testing)
-- INSERT INTO cellLocks (cell_id, user_id, expires_at) VALUES 
--     ('0_1', 'test_user_1', now() + interval '5 minutes'),
--     ('1_2', 'test_user_2', now() + interval '3 minutes');

-- View to see current active locks
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
