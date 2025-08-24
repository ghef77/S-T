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
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Vérifier si une instance existe déjà
let supabase;
if (window.supabase && window.supabase.supabaseUrl === supabaseConfig.supabaseUrl) {
    console.log('🔄 Réutilisation de l\'instance Supabase existante');
    supabase = window.supabase;
} else {
    console.log('🆕 Création d\'une nouvelle instance Supabase');
    supabase = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey);
    // Exposer le client globalement
    window.supabase = supabase;
    window.supabaseConfig = supabaseConfig;
}

// Variables globales pour la synchronisation en temps réel
let realtimeSubscription = null;
let isRealtimeEnabled = true;

// Fonction pour tester la connexion initiale
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

// Configuration de la synchronisation en temps réel
function setupRealtimeSubscription() {
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
        }, handleRealtimeUpdate)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: supabaseConfig.tableName 
        }, handleRealtimeUpdate)
        .on('postgres_changes', { 
            event: 'DELETE', 
            schema: 'public', 
            table: supabaseConfig.tableName 
        }, handleRealtimeUpdate)
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

// Gestion des mises à jour temps réel
function handleRealtimeUpdate(payload) {
    console.log('🔄 Mise à jour temps réel reçue:', payload);
    
    // Éviter les mises à jour en boucle
    if (window.isLocalSaveInProgress) {
        console.log('⚠️ Mise à jour temps réel ignorée (sauvegarde locale en cours)');
        return;
    }

    // Traiter la mise à jour selon le type d'événement
    switch (payload.eventType) {
        case 'INSERT':
            console.log('➕ Nouvelle ligne insérée via temps réel');
            break;
        case 'UPDATE':
            console.log('✏️ Ligne mise à jour via temps réel');
            break;
        case 'DELETE':
            console.log('🗑️ Ligne supprimée via temps réel');
            break;
    }

    // Rafraîchir les données depuis Supabase
    setTimeout(() => {
        if (typeof loadFromSupabase === 'function') {
            loadFromSupabase().then(data => {
                if (data && data.length > 0) {
                    console.log('✅ Données rafraîchies depuis Supabase');
                    updateStatus('Données synchronisées', 'success');
                }
            }).catch(error => {
                console.error('❌ Erreur lors du rafraîchissement:', error);
                updateStatus('Erreur de synchronisation', 'error');
            });
        }
    }, 1000);
}

// Nettoyage de la subscription temps réel
function cleanupRealtimeSubscription() {
    if (realtimeSubscription) {
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
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
    await testInitialSupabaseConnection();
    
    // Configurer la synchronisation temps réel
    setupRealtimeSubscription();
    
    // Nettoyer au déchargement de la page
    window.addEventListener('beforeunload', cleanupRealtimeSubscription);
});

// Exporter toutes les fonctions nécessaires
export { 
    supabase, 
    supabaseConfig, 
    loadFromSupabase, 
    syncToSupabase, 
    deleteFromSupabase,
    setupRealtimeSubscription,
    cleanupRealtimeSubscription,
    updateStatus,
    testInitialSupabaseConnection
};
