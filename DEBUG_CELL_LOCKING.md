# 🔍 Debug Guide: Cell Locking System

## 🚀 Step-by-Step Testing

### 1. **Open the HTML file**
```bash
# Open in your browser
open index.html
```

### 2. **Open Developer Console**
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
- Go to **Console** tab
- Clear the console (click the 🚫 icon)

### 3. **Reload the page**
- Press `F5` or `Cmd+R` (Mac) / `Ctrl+R` (Windows/Linux)
- Watch for initialization logs

## 📋 Expected Logs

### **Initialization Phase:**
```
🚀 enableTableEditing called
🔍 isViewMode: false (or true)
✅ table-body found
🔍 Found editable cells: [number]
✅ Cell [index] made editable
✅ Cell [index] event listeners added
✅ Cleanup timer started
🚀 Starting collaborative cell locking system initialization...
🔍 loadExistingLocks called
🔍 supabase client: true
🔍 Attempting to query cellLocks table...
✅ Existing locks loaded, setting up realtime...
🔍 setupCellLocksRealtime called
🔍 supabase client: true
🔍 Setting up realtime subscription for cellLocks table...
✅ Cell locks realtime subscription setup
✅ Collaborative cell locking system initialized
```

### **If there are errors:**
```
❌ table-body not found!
🔍 No editable-cell class found, checking for any td cells...
🔍 Total td cells found: [number]
❌ Failed to load existing locks: [error]
❌ Error setting up realtime subscription: [error]
```

## 🎯 Test Cell Locking

### **1. Click on a cell**
- Click on any cell in the table
- Expected logs:
```
🎯 handleCellFocus called [cell element]
🔍 Cell info: { tagName: "TD", classList: "...", contentEditable: "true", isViewMode: false }
🔒 lockCell called for: [cell element]
🔍 Cell ID: [rowIndex_cellIndex]
🔒 Cell [ID] locked by [user] in Supabase
✅ Cell focused and locked: [ID]
```

### **2. Check visual feedback**
- The cell should have a **red border**
- A **🔒 icon** should appear in the top-right corner
- The cell should be **locked** (can't be edited by others)

### **3. Try to edit from another tab**
- Open the same file in another browser tab
- Try to click on the locked cell
- Expected behavior: **Access denied** message

## 🚨 Common Issues & Solutions

### **Issue 1: No logs appear**
**Problem:** `enableTableEditing` is not called
**Solution:** Check if the function is called in the right place

### **Issue 2: "table-body not found"**
**Problem:** Table structure issue
**Solution:** Verify the HTML has `<tbody id="table-body">`

### **Issue 3: "No editable cells found"**
**Problem:** Cells don't have `editable-cell` class
**Solution:** Check if cells are properly rendered with the class

### **Issue 4: "Failed to load existing locks"**
**Problem:** Supabase table doesn't exist
**Solution:** Run the SQL setup script first

### **Issue 5: "Error setting up realtime subscription"**
**Problem:** Supabase connection issue
**Solution:** Check Supabase credentials and connection

## 🔧 Quick Fixes

### **If table-body is missing:**
```html
<!-- Add this to your HTML -->
<tbody id="table-body">
    <!-- Your table rows go here -->
</tbody>
```

### **If editable-cell class is missing:**
```javascript
// Add this class to cells when creating them
cell.className = 'py-2 px-2 md:px-4 editable-cell';
```

### **If Supabase table doesn't exist:**
```sql
-- Run this in Supabase SQL editor
\i supabase-cell-locks-setup-simple.sql
```

## 📱 Testing with Multiple Tabs

### **Tab 1: Lock a cell**
1. Click on a cell
2. Verify red border appears
3. Verify 🔒 icon appears

### **Tab 2: Try to access locked cell**
1. Open same file in new tab
2. Try to click on locked cell
3. Should see "Access denied" message

### **Tab 1: Unlock the cell**
1. Click elsewhere or press Tab/Enter
2. Red border should disappear
3. 🔒 icon should disappear

### **Tab 2: Should now be able to access**
1. Cell should be accessible
2. Can click and edit normally

## 🆘 Still Not Working?

If you're still having issues, please share:

1. **Console logs** (copy/paste all logs)
2. **Any error messages** (red text in console)
3. **What you see visually** (any red borders, icons?)
4. **Browser and OS** information

This will help identify the exact problem! 🎯
