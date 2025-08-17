# GitHub Pages Deployment Guide

This guide will help you deploy your S-T application to GitHub Pages without errors.

## Prerequisites

1. A GitHub account
2. Your project code in a GitHub repository
3. Supabase project set up and configured

## Step-by-Step Deployment

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name your repository (e.g., `s-t-staff-system`)
5. Make it public (required for free GitHub Pages)
6. Don't initialize with README, .gitignore, or license (we'll add these manually)
7. Click "Create repository"

### 2. Upload Your Code

**Option A: Using Git (Recommended)**
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
cd YOUR_REPOSITORY_NAME

# Copy your project files to this directory
# (copy all files from the S-T folder)

# Add and commit files
git add .
git commit -m "Initial commit: S-T Staff Management System"
git push origin main
```

**Option B: Using GitHub Web Interface**
1. In your repository, click "Add file" → "Upload files"
2. Drag and drop all your project files
3. Add commit message: "Initial commit: S-T Staff Management System"
4. Click "Commit changes"

### 3. Enable GitHub Pages

1. Go to your repository settings (Settings tab)
2. Scroll down to "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

### 4. Configure Supabase

1. Update `supabase-connection.js` with your Supabase credentials:
   ```javascript
   const supabaseConfig = { 
       supabaseUrl: 'YOUR_SUPABASE_URL', 
       supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY', 
       tableName: 'staffTable', 
       primaryKeyColumn: 'No' 
   };
   ```

2. Commit and push the changes:
   ```bash
   git add .
   git commit -m "Update Supabase configuration"
   git push origin main
   ```

### 5. Test Your Deployment

1. Wait a few minutes for GitHub Pages to build and deploy
2. Visit `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/`
3. Test the application functionality

## Troubleshooting Common Issues

### Issue: "Module not found" errors
**Solution**: Ensure all import paths use relative paths (e.g., `./file.js` not `../file.js`)

### Issue: CORS errors with Supabase
**Solution**: Check your Supabase project settings and ensure the GitHub Pages URL is allowed

### Issue: Page not loading
**Solution**: 
1. Check the Actions tab for build errors
2. Verify all files are in the root directory
3. Ensure `index.html` is in the root

### Issue: Supabase connection failing
**Solution**:
1. Verify your Supabase credentials
2. Check if your Supabase project is active
3. Ensure the `staffTable` exists in your database

## File Structure Verification

Your repository should look like this:
```
/
├── index.html              # Main application
├── simple-gallery.html     # Image gallery
├── app.js                  # Main JavaScript
├── supabase-connection.js  # Supabase configuration
├── simple-gallery.js       # Gallery functionality
├── supabase-bucket-ui.js   # Bucket management
├── supabase-image-sync.js  # Image synchronization
├── styles.css              # Main styles
├── tailwind-custom.css     # Custom Tailwind styles
├── README.md               # Project documentation
├── DEPLOYMENT.md           # This file
└── test-github-pages.html  # Compatibility test
```

## Security Considerations

1. **Never commit sensitive data** like API keys to public repositories
2. **Use environment variables** for production deployments
3. **Implement Row Level Security** in Supabase for production use
4. **Consider authentication** for production applications

## Next Steps

After successful deployment:
1. Test all functionality thoroughly
2. Set up monitoring for any errors
3. Consider implementing CI/CD for automatic deployments
4. Add analytics if needed

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all files are properly uploaded
3. Test with the `test-github-pages.html` file
4. Check GitHub Actions for build logs

