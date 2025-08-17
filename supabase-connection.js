// Supabase Connection and Database Operations
// This file handles all Supabase-related functionality

// Configuration
const supabaseConfig = { 
    supabaseUrl: 'https://fiecugxopjxzqfdnaqsu.supabase.co', 
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw', 
    tableName: 'staffTable', 
    primaryKeyColumn: 'No' 
};

// Initialize Supabase client

// Import Supabase at top level
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialiser Supabase client directement
const supabase = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey);

// Exposer le client globalement immédiatement
window.supabase = supabase;
window.supabase.supabaseUrl = supabaseConfig.supabaseUrl; // Exposer l'URL pour les autres scripts

// Fonction pour tester la connexion initiale (peut être appelée ailleurs si nécessaire)
async function testInitialSupabaseConnection() {
    try {
        console.log('🔄 Test de la connexion Supabase principale...');
        const { data, error } = await supabase.from('staffTable').select('count').limit(1);
        
        if (error) {
            throw new Error(`Erreur de connexion principale: ${error.message}`);
        }
        
        console.log('✅ Connexion Supabase principale établie avec succès');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors du test de la connexion principale Supabase:', error);
        return false;
    }
}

// Appeler le test de connexion principale au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    await testInitialSupabaseConnection();
});

// Exposer la fonction de test si nécessaire pour le débogage
window.testInitialSupabaseConnection = testInitialSupabaseConnection;

// Database Operations
export async function loadFromSupabase() {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabase
            .from(supabaseConfig.tableName)
            .select('*')
            .order(supabaseConfig.primaryKeyColumn, { ascending: true });
        
        if (error) throw error;
        
        console.log('✅ Data loaded from Supabase:', data?.length || 0, 'rows');
        return data || [];
    } catch (error) {
        console.error('❌ Error loading from Supabase:', error);
        throw error;
    }
}

export async function syncToSupabase(data, isManualSave = false) {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        if (!data || data.length === 0) {
            console.log('⚠️ No data to sync');
            return [];
        }

        const { data: result, error } = await supabase
            .from(supabaseConfig.tableName)
            .upsert(data, { onConflict: supabaseConfig.primaryKeyColumn });
        
        if (error) throw error;
        
        console.log('✅ Data synchronized to Supabase:', result?.length || 0, 'rows');
        return result;
    } catch (error) {
        console.error('❌ Error syncing to Supabase:', error);
        throw error;
    }
}

export async function deleteFromSupabase(keys) {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        if (!keys || keys.length === 0) {
            console.log('⚠️ No keys to delete');
            return;
        }

        const { error } = await supabase
            .from(supabaseConfig.tableName)
            .delete()
            .in(supabaseConfig.primaryKeyColumn, keys);
        
        if (error) throw error;
        
        console.log('✅ Data deleted from Supabase for keys:', keys);
        return true;
    } catch (error) {
        console.error('❌ Error deleting from Supabase:', error);
        throw error;
    }
}

// Storage Operations (legacy, not used by image sync now)
export async function createStorageBucket() {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        const { data, error } = await supabase.storage.createBucket('patient-images', {
            public: true,
            allowedMimeTypes: ['image/*'],
            fileSizeLimit: 52428800 // 50MB
        });
        
        if (error) throw error;
        
        console.log('✅ Storage bucket created:', data);
        return data;
    } catch (error) {
        console.error('❌ Error creating storage bucket:', error);
        throw error;
    }
}

export async function uploadImageToStorage(file, patientName) {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        const fileName = `${patientName}_${Date.now()}_${file.name}`;
        const filePath = `${patientName}/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('patient-images')
            .upload(filePath, file);
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from('patient-images').getPublicUrl(filePath);

        console.log('✅ Image uploaded to storage:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
        console.error('❌ Error uploading image to storage:', error);
        throw error;
    }
}

export async function deleteImageFromStorage(filePath) {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        const { data, error } = await supabase.storage
            .from('patient-images')
            .remove([filePath]);
        
        if (error) throw error;
        
        console.log('✅ Image deleted from storage:', data);
        return true;
    } catch (error) {
        console.error('❌ Error deleting image from storage:', error);
        throw error;
    }
}

// Legacy image sync functions (not used by new image-gallery.js or supabase-image-sync.js now)
export async function syncImagesToSupabase(patientImages) {
    console.warn('syncImagesToSupabase (legacy) is deprecated and does nothing.');
    return { success: true };
}

export async function loadImagesFromSupabase() {
    console.warn('loadImagesFromSupabase (legacy) is deprecated and does nothing.');
    return [];
}

export async function testSupabaseConnection() {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        // Test table connection
        const { data: tableData, error: tableError } = await supabase.from('staffTable').select('count').limit(1);
        if (tableError) {
            throw new Error(`Table connection error: ${tableError.message}`);
        }

        // Test storage connection (optional, as dedicated image sync handles this)
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        if (storageError) {
            console.warn('Supabase storage connection error (may be due to anon key):', storageError.message);
        }

        console.log('✅ Supabase general connection test passed.');
        return { connected: true, stats: { table: true, storage: !storageError } };
    } catch (error) {
        console.error('❌ Supabase general connection test failed:', error);
        return { connected: false, error: error.message };
    }
}

// Export configuration and client
export { supabase, supabaseConfig };
