# S-T Staff Management System

A comprehensive staff management system with real-time synchronization, image gallery, and advanced table management features.

## Features

- **Real-time Data Synchronization** with Supabase
- **Advanced Table Management** with autosave and undo functionality
- **Image Gallery System** with drag & drop upload
- **Export Options** (Excel, PDF, PNG)
- **Responsive Design** with mobile optimization
- **Keyboard Shortcuts** for power users
- **Row Color Management** for visual organization

## GitHub Pages Setup

### 1. Enable GitHub Pages

1. Go to your repository settings
2. Scroll down to "GitHub Pages" section
3. Select "Deploy from a branch"
4. Choose the branch you want to deploy (usually `main` or `master`)
5. Select the root folder (`/`)
6. Click "Save"

### 2. Repository Structure

Ensure your repository has this structure:
```
/
├── index.html
├── simple-gallery.html
├── app.js
├── supabase-connection.js
├── simple-gallery.js
├── supabase-bucket-ui.js
├── supabase-image-sync.js
├── styles.css
├── tailwind-custom.css
└── README.md
```

### 3. Supabase Configuration

Before using the application, you need to:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create a table named `staffTable` with the required columns
3. Update the configuration in `supabase-connection.js`:
   ```javascript
   const supabaseConfig = { 
       supabaseUrl: 'YOUR_SUPABASE_URL', 
       supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY', 
       tableName: 'staffTable', 
       primaryKeyColumn: 'No' 
   };
   ```

### 4. Access Your Application

Once deployed, your application will be available at:
`https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/`

## Usage

### Main Application (`index.html`)
- Staff data management with real-time sync
- Advanced table operations
- Export functionality

### Image Gallery (`simple-gallery.html`)
- Image upload and management
- Drag & drop functionality
- Image synchronization with Supabase

## Security Notes

- The application uses a simple password system for basic access control
- Supabase keys are exposed in the client-side code (use appropriate Row Level Security in production)
- Consider implementing proper authentication for production use

## Browser Compatibility

- Modern browsers with ES6 module support
- Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+

## Development

To run locally:
1. Clone the repository
2. Open `index.html` in a modern web browser
3. Or use a local server: `python -m http.server 8000`

## License

This project is provided as-is for educational and development purposes.

