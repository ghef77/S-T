// Fix table name references from 'patientImages' to 'gallery_images'
// Run this in your browser console to fix the image loading errors

console.log('🔧 Fixing table name references...');

// Function to replace all occurrences in the code
function fixTableNames() {
    // Find all script tags
    const scripts = document.querySelectorAll('script');
    let fixedCount = 0;
    
    scripts.forEach(script => {
        if (script.textContent && script.textContent.includes("'patientImages'")) {
            const oldContent = script.textContent;
            const newContent = oldContent.replace(/'patientImages'/g, "'gallery_images'");
            
            if (oldContent !== newContent) {
                script.textContent = newContent;
                fixedCount++;
                console.log('✅ Fixed script tag');
            }
        }
    });
    
    console.log(`🔧 Fixed ${fixedCount} script tags`);
    
    // Also check for any inline onclick handlers
    const elementsWithOnclick = document.querySelectorAll('[onclick*="patientImages"]');
    elementsWithOnclick.forEach(element => {
        const oldOnclick = element.getAttribute('onclick');
        const newOnclick = oldOnclick.replace(/'patientImages'/g, "'gallery_images'");
        element.setAttribute('onclick', newOnclick);
        console.log('✅ Fixed onclick handler');
    });
    
    console.log('🔧 Table name fix complete!');
    console.log('💡 You may need to refresh the page for changes to take effect.');
}

// Run the fix
fixTableNames();

// Also provide a manual fix function
window.fixTableNames = fixTableNames;

console.log('💡 To fix again, run: window.fixTableNames()');
