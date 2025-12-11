// Supabase Connection and Database Operations
// This file handles all Supabase-related functionality

// Configuration
const supabaseConfig = { 
    supabaseUrl: 'https://fiecugxopjxzqfdnaqsu.supabase.co', 
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw', 
    tableName: 'staffTable', 
    primaryKeyColumn: 'No' 
};

// Initialize Supabase client - Singleton pattern to avoid multiple instances
// Use global window.supabase client instance

// Get Supabase client - will wait for initialization if needed
async function getSupabaseClient() {
    // Try to get existing client
    if (window.supabase && typeof window.supabase === 'object' && window.supabase.from) {
        return window.supabase;
    }
    
    if (window.supabaseClient && typeof window.supabaseClient === 'object' && window.supabaseClient.from) {
        return window.supabaseClient;
    }
    
    // Wait for Supabase to be initialized (it's loaded asynchronously in index.html)
    let attempts = 0;
    while (attempts < 50) { // Wait up to 5 seconds
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.supabase && typeof window.supabase === 'object' && window.supabase.from) {
            return window.supabase;
        }
        attempts++;
    }
    
    throw new Error('Supabase client not initialized after waiting');
}

// Get client synchronously if available, otherwise return null
function getSupabaseClientSync() {
    if (window.supabase && typeof window.supabase === 'object' && window.supabase.from) {
        return window.supabase;
    }
    if (window.supabaseClient && typeof window.supabaseClient === 'object' && window.supabaseClient.from) {
        return window.supabaseClient;
    }
    return null;
}

let supabase = getSupabaseClientSync();

// Variables globales pour la synchronisation en temps réel
let realtimeSubscription = null;
let isRealtimeEnabled = true;

// Fonction pour tester la connexion initiale
async function testInitialSupabaseConnection() {
    try {
        const supabase = await getSupabaseClient();
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

// Configuration de la synchronisation en temps réel
async function setupRealtimeSubscription() {
    const supabase = await getSupabaseClient();
    
    if (realtimeSubscription) {
        console.log('🔄 Nettoyage de l\'ancienne subscription temps réel...');
        supabase.removeChannel(realtimeSubscription);
    }

    console.log('🔄 Configuration de la synchronisation temps réel...');
    
    realtimeSubscription = supabase.channel('table-changes')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: supabaseConfig.tableName 
        }, (payload) => {
            if (typeof window.handleRealtimeUpdate === 'function') {
                window.handleRealtimeUpdate(payload);
            } else {
                console.log('🔄 INSERT via supabase-connection:', payload);
                // Fallback: call fetchInitialData directly
                if (typeof window.fetchInitialData === 'function') {
                    setTimeout(() => window.fetchInitialData(), 1000);
                }
            }
        })
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: supabaseConfig.tableName 
        }, (payload) => {
            if (typeof window.handleRealtimeUpdate === 'function') {
                window.handleRealtimeUpdate(payload);
            } else {
                console.log('🔄 UPDATE via supabase-connection:', payload);
                // Fallback: call fetchInitialData directly
                if (typeof window.fetchInitialData === 'function') {
                    setTimeout(() => window.fetchInitialData(), 1000);
                }
            }
        })
        .on('postgres_changes', { 
            event: 'DELETE', 
            schema: 'public', 
            table: supabaseConfig.tableName 
        }, (payload) => {
            if (typeof window.handleRealtimeUpdate === 'function') {
                window.handleRealtimeUpdate(payload);
            } else {
                console.log('🔄 DELETE via supabase-connection:', payload);
                // Fallback: call fetchInitialData directly
                if (typeof window.fetchInitialData === 'function') {
                    setTimeout(() => window.fetchInitialData(), 1000);
                }
            }
        })
        .subscribe(status => {
            console.log('📡 Statut de la subscription temps réel:', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Synchronisation temps réel activée');
                updateStatus('Synchronisation temps réel activée', 'success');
            } else if (status === 'CHANNEL_ERROR') {
                console.log('❌ Erreur de synchronisation temps réel');
                updateStatus('Erreur de synchronisation', 'error');
            }
        });
}

// Note: handleRealtimeUpdate is now implemented in index.html to avoid conflicts

// Nettoyage de la subscription temps réel
async function cleanupRealtimeSubscription() {
    const supabase = getSupabaseClientSync();
    if (realtimeSubscription && supabase) {
        console.log('🧹 Nettoyage de la subscription temps réel...');
        supabase.removeChannel(realtimeSubscription);
        realtimeSubscription = null;
    }
}

// Mise à jour du statut de synchronisation
function updateStatus(message, type = 'pending') {
    const statusElement = document.getElementById('sync-status');
    if (statusElement) {
        const textElement = statusElement.querySelector('.sync-text');
        const iconElement = statusElement.querySelector('.sync-icon');
        
        if (textElement) textElement.textContent = message;
        if (iconElement) {
            switch (type) {
                case 'success':
                    iconElement.className = 'sync-icon fa-solid fa-check';
                    break;
                case 'error':
                    iconElement.className = 'sync-icon fa-solid fa-exclamation-triangle';
                    break;
                case 'saving':
                    iconElement.className = 'sync-icon fa-solid fa-sync-alt fa-spin';
                    break;
                default:
                    iconElement.className = 'sync-icon fa-solid fa-clock';
            }
        }
        
        // Mettre à jour les classes CSS
        statusElement.className = `sync-pending-animation px-2 py-1 rounded-full text-xs font-semibold border-2 bg-white shadow-sm ${getSyncStatusClasses(type)}`;
    }
}

// Classes CSS pour le statut de synchronisation
function getSyncStatusClasses(type) {
    switch(type) {
        case 'success': 
            return 'bg-green-100 text-green-800 border-green-400 shadow-green-200/50'; 
        case 'error': 
            return 'bg-red-100 text-red-800 border-red-400 shadow-red-200/50'; 
        case 'saving': 
            return 'bg-blue-100 text-blue-800 border-blue-400 shadow-blue-200/50 sync-pending-animation'; 
        default: 
            return 'bg-yellow-100 text-yellow-800 border-yellow-400 shadow-yellow-200/50 sync-pending-animation'; 
    }
}

// Database Operations
export async function loadFromSupabase() {
    try {
        const supabase = await getSupabaseClient();
        
        const { data, error } = await supabase
            .from(supabaseConfig.tableName)
            .select('*')
            .order(supabaseConfig.primaryKeyColumn, { ascending: true });
        
        if (error) throw error;
        
        console.log('✅ Data loaded from Supabase:', data?.length || 0, 'rows');
        updateStatus('Données chargées', 'success');
        return data || [];
    } catch (error) {
        console.error('❌ Error loading from Supabase:', error);
        updateStatus('Erreur de chargement', 'error');
        throw error;
    }
}

export async function syncToSupabase(data, isManualSave = false) {
    try {
        const supabase = await getSupabaseClient();
        
        if (!data || data.length === 0) {
            console.log('⚠️ No data to sync');
            return [];
        }

        updateStatus('Sauvegarde en cours...', 'saving');
        
        const { data: result, error } = await supabase
            .from(supabaseConfig.tableName)
            .upsert(data, { onConflict: supabaseConfig.primaryKeyColumn });
        
        if (error) throw error;
        
        console.log('✅ Data synchronized to Supabase:', result?.length || 0, 'rows');
        updateStatus('Sauvegardé avec succès', 'success');
        
        return result;
    } catch (error) {
        console.error('❌ Error syncing to Supabase:', error);
        updateStatus('Erreur de sauvegarde', 'error');
        throw error;
    }
}

async function deleteFromSupabase(keys) {
    try {
        const supabase = await getSupabaseClient();
        
        if (!keys || keys.length === 0) {
            console.log('⚠️ No keys to delete');
            return [];
        }

        const { data: result, error } = await supabase
            .from(supabaseConfig.tableName)
            .delete()
            .in(supabaseConfig.primaryKeyColumn, keys);
        
        if (error) throw error;
        
        console.log('✅ Data deleted from Supabase:', result?.length || 0, 'rows');
        updateStatus('Suppression réussie', 'success');
        
        return result;
    } catch (error) {
        console.error('❌ Error deleting from Supabase:', error);
        updateStatus('Erreur de suppression', 'error');
        throw error;
    }
}



// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for Supabase to initialize from index.html
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testInitialSupabaseConnection();
    
    // Configurer la synchronisation temps réel
    await setupRealtimeSubscription();
    
    // Expose functions globally for reactivation
    window.setupRealtimeSubscription = setupRealtimeSubscription;
    window.cleanupRealtimeSubscription = cleanupRealtimeSubscription;
    
    // Nettoyer au déchargement de la page
    window.addEventListener('beforeunload', cleanupRealtimeSubscription);
});

// Exporter toutes les fonctions nécessaires
export { 
    supabaseConfig, 
    loadFromSupabase, 
    syncToSupabase, 
    deleteFromSupabase,
    setupRealtimeSubscription,
    cleanupRealtimeSubscription,
    updateStatus,
    testInitialSupabaseConnection,
    getSupabaseClient
};
