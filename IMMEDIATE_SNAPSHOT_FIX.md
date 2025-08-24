# 🚨 IMMEDIATE FIX for "Fichier snapshot introuvable"

## Quick Solution (2 minutes):

### Step 1: Fix via Browser Console
1. **Open browser console** (F12)
2. **Copy and paste** the entire content of `quick-fix-snapshots.js`
3. **Run:** `quickFixSnapshots()`

This will:
- ✅ Check existing snapshots  
- ✅ Create a test snapshot
- ✅ Reload the snapshot calendar
- ✅ Show you exactly what's missing

### Step 2: Fix Database (if needed)
If Step 1 shows database errors:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Copy and run** the entire `fix-snapshot-issues.sql` script
3. **Refresh your page** and try again

## Why "Fichier snapshot introuvable"?

The error means:
1. **No valid snapshots exist** in the database
2. **Database table has constraint issues** preventing snapshot creation
3. **Storage permissions** prevent file access

## Expected Result After Fix:

- ✅ Snapshot calendar shows available dates
- ✅ Manual snapshot creation works
- ✅ "Nettoyer" button no longer needed
- ✅ Navigation between snapshots works

## If Still Having Issues:

Run these commands in console for diagnosis:
```javascript
// Check what's in the database
fetch('https://fiecugxopjxzqfdnaqsu.supabase.co/rest/v1/table_snapshots_index?select=*', {
    headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw'
    }
}).then(r => r.json()).then(console.log)

// Check app state
console.log('availableSnapshots:', window.availableSnapshots)
```

**🎯 Most likely cause: Database table constraints are broken. Run the SQL fix script.**