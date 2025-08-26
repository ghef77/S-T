# Proactive Image Bucket Management System

## Overview

The proactive image bucket management system automatically handles image storage capacity, creates new buckets when needed, and cleans up old images to prevent storage issues. This system ensures your image gallery continues to function smoothly even as storage requirements grow.

## Features

### 🔄 Automatic Bucket Creation
- **Smart Overflow Handling**: When a bucket reaches 95% capacity, a new overflow bucket is automatically created
- **Seamless Naming**: New buckets follow the pattern: `patient-images-1`, `patient-images-2`, etc.
- **Auto Policy Setup**: New buckets automatically get the correct storage policies via database triggers

### 🧹 Automatic Image Cleanup
- **Age-Based Cleanup**: Images older than 30 days are automatically deleted
- **Smart Triggering**: Cleanup activates when any bucket reaches 85% capacity
- **Background Monitoring**: Continuous monitoring every 5 minutes
- **Orphaned Data Cleanup**: Removes associated patient data when images are deleted

### 📊 Capacity Monitoring
- **Real-time Usage Tracking**: Monitor bucket usage across all image buckets
- **Visual Statistics**: Detailed statistics with usage graphs and breakdowns
- **Proactive Alerts**: Visual indicators when buckets approach capacity limits

### 🎯 Optimal Upload Routing
- **Smart Bucket Selection**: Uploads automatically go to the least full bucket
- **Fallback Handling**: If upload fails, automatically tries a new bucket
- **Performance Optimization**: Distributes load across multiple buckets

## Files Added

### Core Components
- **`image-bucket-manager.js`**: Main bucket management class
- **`setup-image-bucket-policies.sql`**: Database setup script
- **Updated `simple-gallery.js`**: Enhanced with proactive management
- **Updated `simple-gallery.html`**: Added management UI buttons

## Setup Instructions

### 1. Database Setup
Run the SQL script in your Supabase SQL Editor:
```sql
-- Run this file in Supabase SQL Editor
\i setup-image-bucket-policies.sql
```

This script will:
- Create necessary database functions
- Set up automatic policy triggers
- Initialize bucket statistics tracking
- Configure cleanup functions

### 2. File Deployment
Ensure these files are deployed to your web server:
- `image-bucket-manager.js`
- Updated `simple-gallery.js`
- Updated `simple-gallery.html`

### 3. Verification
1. Open the image gallery
2. Check the browser console for initialization messages:
   - `✅ Bucket manager initialized successfully`
   - `📊 Bucket Statistics: ...`

## Usage

### Manual Controls
The gallery now includes two new buttons:

#### 🧹 Cleanup Button (Yellow)
- **Purpose**: Manually trigger cleanup of old images
- **Action**: Deletes images older than 30 days across all buckets
- **Feedback**: Shows count of deleted images

#### 📊 Statistics Button (Purple)
- **Purpose**: View detailed bucket usage statistics
- **Display**: Modal with per-bucket breakdowns and usage charts
- **Info**: Total files, sizes, usage percentages

### Automatic Operations

#### Upload Process
1. **Pre-Upload**: System finds the bucket with lowest usage
2. **Upload**: File goes to optimal bucket
3. **Fallback**: If upload fails due to capacity, new bucket is created
4. **Confirmation**: Success message includes bucket information if using overflow

#### Background Monitoring
- **Frequency**: Every 5 minutes
- **Triggers**: 
  - Cleanup at 85% bucket capacity
  - New bucket creation at 95% capacity
- **Actions**: Automatic cleanup and notification

## Configuration

### Customizable Parameters
Edit `image-bucket-manager.js` to adjust:

```javascript
this.maxBucketSize = 1024 * 1024 * 1024; // 1GB per bucket
this.cleanupThreshold = 0.85; // Trigger cleanup at 85%
this.overflowThreshold = 0.95; // Create new bucket at 95%
this.imageMaxAge = 30; // Days - cleanup images older than 30 days
```

### Monitoring Interval
```javascript
// Check every 5 minutes (in initScrollIndicators method)
setInterval(async () => {
    // Monitoring logic
}, 5 * 60 * 1000);
```

## Database Schema

### New Tables
- **`image_bucket_stats`**: Tracks usage statistics for each bucket
- **`image_patient_associations`**: Links images to patients (existing, enhanced)

### New Functions
- **`setup_image_bucket_policies()`**: Creates policies for new buckets
- **`update_bucket_stats()`**: Updates bucket usage statistics  
- **`cleanup_old_images()`**: Removes old images from specified bucket
- **`auto_setup_image_bucket_policies()`**: Trigger function for new buckets

## Monitoring & Maintenance

### Health Checks
1. **Browser Console**: Check for initialization and operation messages
2. **Database Query**: Check bucket statistics
   ```sql
   SELECT * FROM image_bucket_stats ORDER BY last_updated_at DESC;
   ```
3. **Storage Usage**: Monitor actual Supabase storage usage in dashboard

### Manual Operations
```sql
-- Manual cleanup for specific bucket
SELECT cleanup_old_images('patient-images', 30);

-- Update statistics for all buckets  
SELECT update_bucket_stats(name) FROM storage.buckets 
WHERE name LIKE 'patient-images%';

-- Check current bucket usage
SELECT 
    bucket_name, 
    total_files, 
    (total_size_bytes / 1024.0 / 1024.0) as size_mb,
    last_cleanup_at 
FROM image_bucket_stats;
```

## Troubleshooting

### Common Issues

#### 1. Bucket Manager Not Initializing
**Symptoms**: No management buttons, console errors
**Solutions**: 
- Ensure `image-bucket-manager.js` is accessible
- Check browser console for import errors
- Verify Supabase keys are correct

#### 2. Automatic Policies Not Applied
**Symptoms**: New buckets created but access denied
**Solutions**:
- Verify trigger setup: `SELECT * FROM pg_trigger WHERE tgname LIKE '%image_bucket%';`
- Manually run: `SELECT setup_image_bucket_policies('bucket-name');`
- Check Supabase dashboard for policy creation

#### 3. Statistics Not Updating
**Symptoms**: Statistics show outdated information
**Solutions**:
- Run manual update: `SELECT update_bucket_stats('patient-images');`
- Check table permissions: `SELECT * FROM image_bucket_stats;`
- Verify service role permissions

#### 4. Cleanup Not Working
**Symptoms**: Old images not being deleted automatically
**Solutions**:
- Check monitoring is active: Look for `👀 Starting bucket capacity monitoring...`
- Manual cleanup test: `SELECT cleanup_old_images('patient-images', 30);`
- Verify service role has delete permissions on storage

### Error Messages

| Error | Cause | Solution |
|-------|--------|----------|
| `⚠️ Gestion automatique des buckets désactivée` | Bucket manager failed to initialize | Check Supabase configuration |
| `❌ Could not find optimal bucket` | All buckets full or inaccessible | Check bucket policies, consider manual cleanup |
| `⚠️ Manual action required: Set up RLS policies` | New bucket created but policies need manual setup | Run provided SQL commands |

## Performance Impact

### Minimal Overhead
- **Monitoring**: 5-minute intervals with lightweight queries
- **Statistics**: Cached and updated incrementally
- **UI Impact**: Management buttons only visible when needed

### Resource Usage
- **Database**: Small additional storage for statistics table
- **Network**: Minimal API calls for statistics and monitoring
- **Browser**: ~50KB additional JavaScript for management

## Migration from Previous System

The new system is backward compatible:
1. **Existing Images**: Continue to work without changes
2. **Existing Buckets**: Automatically get new policies and monitoring
3. **Gallery Interface**: Retains all previous functionality

## Benefits

### For Users
- **Seamless Experience**: Never encounter "bucket full" errors
- **Better Performance**: Load distributed across multiple buckets
- **Automatic Maintenance**: No manual intervention required
- **Visual Feedback**: Clear statistics and status information

### For Administrators
- **Proactive Management**: Issues prevented before they occur
- **Easy Monitoring**: Comprehensive statistics and health checks
- **Scalable Architecture**: Automatically scales with usage
- **Maintenance Tools**: Manual controls when needed

## Future Enhancements

Potential improvements for future versions:
- **Custom Age Policies**: Different cleanup ages for different image types
- **Smart Compression**: Automatic image optimization before storage
- **Backup Integration**: Automatic backup of deleted images
- **Advanced Analytics**: Usage trends and predictions
- **Multi-Region Support**: Distribute buckets across regions