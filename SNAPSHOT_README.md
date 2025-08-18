# Snapshot System - Tableau de Staff

## Overview
The Snapshot System automatically creates daily backups of your staff table at 10:00 AM Europe/Paris time, allowing you to browse historical data and restore previous versions when needed.

## Features

### 🕐 Automatic Daily Snapshots
- **Schedule**: Every day at 10:00 AM (Europe/Paris timezone)
- **Storage**: Snapshots are stored in Supabase Storage and indexed in the database
- **Format**: JSON files with metadata (table name, row count, creation date, version)

### 📅 History Navigation
- **Back/Next**: Navigate between available snapshot dates
- **Date Picker**: Click the date button to cycle through available snapshots
- **Today Button**: Return to live data view with real-time updates

### 🔄 Restore Functionality
- **Full Restore**: Replace current table data with snapshot data
- **Confirmation**: Modal with snapshot details and confirmation
- **Audit Log**: All restore operations are logged with timestamps

### 🛡️ Data Protection
- **Read-Only Mode**: Snapshots are displayed in read-only mode
- **No Accidental Edits**: Table editing is disabled when viewing snapshots
- **Realtime Isolation**: Snapshot mode disconnects from real-time updates

## User Interface

### History Bar
Located above the table, the history bar provides:
- **← Back**: Previous snapshot date
- **Date Button**: Shows current date or "Aujourd'hui" for live mode
- **→ Next**: Next snapshot date
- **Aujourd'hui**: Return to live data
- **Restaurer**: Restore current snapshot (only visible in snapshot mode)

### Snapshot Banner
When viewing a snapshot, a yellow banner appears showing:
- "Visualisation du snapshot du [DATE] (lecture seule)"
- Clear indication that the table is in read-only mode

### Visual Indicators
- **Snapshot cells**: Light yellow background with brown text
- **Disabled buttons**: Function buttons are disabled in snapshot mode
- **FAB button**: Add button is disabled in snapshot mode

## How to Use

### 1. View Historical Data
1. **Navigate snapshots**: Use Back/Next buttons or click the date button
2. **Read-only view**: Table displays snapshot data with visual indicators
3. **Return to live**: Click "Aujourd'hui" to return to current data

### 2. Restore a Snapshot
1. **Select snapshot**: Navigate to the desired snapshot date
2. **Click Restaurer**: Opens confirmation modal
3. **Confirm restore**: Review details and confirm the operation
4. **Automatic return**: System returns to live mode after restore

### 3. Date Navigation
- **Back/Next**: Sequential navigation through available dates
- **Date Button**: Cycles through available snapshot dates
- **Today**: Always returns to current live data

## Technical Details

### Database Tables
- **`table_snapshots_index`**: Metadata and file paths for snapshots
- **`snapshot_restore_log`**: Audit trail of restore operations

### Storage Structure
```
table-snapshots/
├── 2025/
│   ├── 01/
│   │   ├── 27/
│   │   │   └── staffTable.json
│   │   └── 28/
│   │       └── staffTable.json
│   └── 02/
│       └── ...
```

### Snapshot Data Format
```json
{
  "data": [...], // Table rows
  "metadata": {
    "table": "staffTable",
    "rowCount": 42,
    "createdAt": "2025-01-27T10:00:00.000Z",
    "snapshotDate": "2025-01-27",
    "version": "1.0.0"
  }
}
```

## Security & Permissions

### Access Control
- **Authenticated users**: Can view snapshot metadata and download snapshots
- **Service role**: Required for creating snapshots and logging restores
- **Storage bucket**: Private by default, accessible only to authorized users

### Data Protection
- **RLS policies**: Row-level security controls access to snapshot metadata
- **Audit logging**: All restore operations are logged with user and timestamp
- **No data leakage**: Snapshots are isolated from live data

## Troubleshooting

### Common Issues

#### No Snapshots Available
- Check if the Edge Function is deployed and running
- Verify the cron schedule is set correctly
- Check Supabase function logs for errors

#### Can't Access Snapshots
- Ensure you're authenticated
- Check RLS policies are correctly configured
- Verify storage bucket permissions

#### Restore Fails
- Check if you have write permissions to the main table
- Verify the snapshot data is valid
- Check for concurrent operations

### Debug Steps
1. **Check function logs**: `supabase functions logs snapshot_staff_table`
2. **Verify database tables**: Check if `table_snapshots_index` exists
3. **Test storage access**: Try manually accessing the storage bucket
4. **Check permissions**: Verify RLS policies and user roles

## Maintenance

### Storage Management
- **Automatic cleanup**: Consider implementing retention policies
- **Monitor usage**: Track storage costs and growth
- **Archive old snapshots**: Move older snapshots to cheaper storage if needed

### Performance Considerations
- **Snapshot size**: Large tables create larger snapshot files
- **Download time**: Consider compression for very large snapshots
- **Index optimization**: Monitor query performance on snapshot tables

## Future Enhancements

### Planned Features
- **Selective restore**: Restore specific rows or columns
- **Snapshot comparison**: Visual diff between snapshots
- **Scheduled restores**: Automate restore operations
- **Snapshot tagging**: Add labels and descriptions to snapshots

### Integration Possibilities
- **Backup to external storage**: AWS S3, Google Cloud Storage
- **Snapshot encryption**: End-to-end encryption for sensitive data
- **Multi-table snapshots**: Capture related tables together
- **Snapshot analytics**: Usage statistics and trends

## Support

For technical support or questions about the snapshot system:
1. Check the deployment logs
2. Review the database setup
3. Verify Edge Function configuration
4. Contact the development team

---

**Note**: The snapshot system is designed to be robust and safe, but always test restore operations in a development environment before using in production.
