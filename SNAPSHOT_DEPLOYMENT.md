# Snapshot System Deployment Guide

## Prerequisites
- Supabase project with admin access
- Supabase CLI installed and configured
- Storage bucket creation permissions

## 1. Database Setup

### Run the SQL setup script:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-snapshot-setup.sql`
4. Execute the script

### Create Storage Bucket:
1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `table-snapshots`
3. Set it to **private** (not public)
4. Set the following policies:

```sql
-- Allow authenticated users to read snapshots
CREATE POLICY "Allow authenticated users to read snapshots" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'table-snapshots' 
        AND auth.role() = 'authenticated'
    );

-- Allow service role to manage snapshots
CREATE POLICY "Allow service role to manage snapshots" ON storage.objects
    FOR ALL USING (
        bucket_id = 'table-snapshots' 
        AND auth.role() = 'service_role'
    );
```

## 2. Edge Function Deployment

### Deploy the function:
```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy the Edge Function
supabase functions deploy snapshot_staff_table

# Set the cron schedule
supabase functions schedule snapshot_staff_table --cron "0 10 * * *" --timezone "Europe/Paris"
```

### Verify deployment:
```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs snapshot_staff_table
```

## 3. Environment Variables

The Edge Function requires these environment variables (automatically set by Supabase):
- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

## 4. Test the System

### Manual test:
```bash
# Invoke the function manually
supabase functions invoke snapshot_staff_table
```

### Check results:
1. Go to Storage > table-snapshots in your dashboard
2. Verify files are created in YYYY/MM/DD/ format
3. Check the `table_snapshots_index` table for new records

## 5. Monitoring

### Check function status:
```bash
supabase functions logs snapshot_staff_table --follow
```

### Monitor storage usage:
- Check Storage > table-snapshots bucket usage
- Monitor `table_snapshots_index` table growth

## 6. Troubleshooting

### Common issues:
1. **Function fails to deploy**: Check Supabase CLI version and project linking
2. **Storage permission errors**: Verify bucket policies and RLS settings
3. **Cron not running**: Check timezone settings and cron syntax
4. **Database errors**: Verify table creation and permissions

### Debug steps:
1. Check function logs: `supabase functions logs snapshot_staff_table`
2. Verify database tables exist and have correct permissions
3. Test storage bucket access manually
4. Check environment variables are set correctly

## 7. Maintenance

### Cleanup old snapshots (optional):
```sql
-- Delete snapshots older than 90 days
DELETE FROM table_snapshots_index 
WHERE snapshot_date < CURRENT_DATE - INTERVAL '90 days';

-- Note: You'll also need to manually delete the corresponding storage files
```

### Monitor storage costs:
- Set up alerts for storage usage
- Consider implementing retention policies
- Monitor function execution costs

## 8. Security Notes

- The Edge Function uses service role key (highest privileges)
- Storage bucket is private by default
- RLS policies control access to snapshot metadata
- Users can only access snapshots they're authorized to see
