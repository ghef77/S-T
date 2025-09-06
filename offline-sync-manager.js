// Gestionnaire de synchronisation hors ligne / en ligne
// Sauvegarde automatique quand la connexion revient

class OfflineSyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.pendingData = new Map();
        this.syncInProgress = false;
        this.setupEventListeners();
        this.loadPendingData();
        
        console.log('🔧 OfflineSyncManager initialisé - État:', this.isOnline ? 'En ligne' : 'Hors ligne');
    }

    setupEventListeners() {
        // Écouter les événements de connexion/déconnexion
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie - Déclenchement de la synchronisation automatique');
            this.isOnline = true;
            this.updateConnectionStatus(true);
            this.autoSyncWhenOnline();
        });

        window.addEventListener('offline', () => {
            console.log('📵 Connexion perdue - Mode hors ligne activé');
            this.isOnline = false;
            this.updateConnectionStatus(false);
        });

        // Sauvegarde avant fermeture de la page
        window.addEventListener('beforeunload', () => {
            this.savePendingData();
        });
    }

    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            const statusText = isOnline ? 'En ligne' : 'Hors ligne';
            const statusClass = isOnline ? 'online' : 'offline';
            
            statusElement.textContent = statusText;
            statusElement.className = `connection-status ${statusClass}`;
            
            if (isOnline) {
                statusElement.style.background = '#10B981';
                statusElement.style.color = 'white';
            } else {
                statusElement.style.background = '#EF4444';
                statusElement.style.color = 'white';
            }
        }
    }

    // Stocker des données pour synchronisation ultérieure
    storeForLaterSync(type, data) {
        if (this.isOnline) {
            // Si en ligne, pas besoin de stocker
            return false;
        }

        const timestamp = Date.now();
        const key = `${type}_${timestamp}`;
        
        this.pendingData.set(key, {
            type: type,
            data: data,
            timestamp: timestamp,
            synced: false
        });

        this.savePendingData();
        console.log(`💾 Données stockées pour synchronisation: ${type}`, data);
        return true;
    }

    // Sauvegarder les données en attente dans localStorage
    savePendingData() {
        try {
            const dataArray = Array.from(this.pendingData.entries());
            localStorage.setItem('offlinePendingSync', JSON.stringify(dataArray));
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde des données en attente:', error);
        }
    }

    // Charger les données en attente depuis localStorage
    loadPendingData() {
        try {
            const saved = localStorage.getItem('offlinePendingSync');
            if (saved) {
                const dataArray = JSON.parse(saved);
                this.pendingData = new Map(dataArray);
                console.log(`📂 ${this.pendingData.size} éléments chargés depuis le stockage hors ligne`);
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données en attente:', error);
            this.pendingData = new Map();
        }
    }

    // Synchronisation automatique quand la connexion revient
    async autoSyncWhenOnline() {
        if (this.syncInProgress || !this.isOnline) {
            return;
        }

        this.syncInProgress = true;

        try {
            // Synchroniser les données du tableau principal
            await this.syncTableData();
            
            // Synchroniser les images en attente
            await this.syncPendingImages();
            
            // Synchroniser les autres données en attente
            await this.syncPendingData();
            
            // Notification de succès
            if (typeof showMessage === 'function') {
                showMessage('✅ Synchronisation automatique terminée avec succès', 'success');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation automatique:', error);
            if (typeof showMessage === 'function') {
                showMessage('❌ Erreur lors de la synchronisation automatique', 'error');
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    // Synchroniser les données du tableau principal
    async syncTableData() {
        try {
            const draft = localStorage.getItem('staffTableDraft');
            if (draft && typeof window.saveToSupabase === 'function') {
                console.log('🔄 Synchronisation du brouillon du tableau...');
                await window.saveToSupabase();
                localStorage.removeItem('staffTableDraft');
                console.log('✅ Brouillon du tableau synchronisé');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation du tableau:', error);
        }
    }

    // Synchroniser les images en attente
    async syncPendingImages() {
        try {
            if (typeof window.syncPendingImages === 'function') {
                console.log('🔄 Synchronisation des images en attente...');
                await window.syncPendingImages();
                console.log('✅ Images synchronisées');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation des images:', error);
        }
    }

    // Synchroniser les autres données en attente
    async syncPendingData() {
        const syncPromises = [];

        for (const [key, item] of this.pendingData.entries()) {
            if (!item.synced) {
                syncPromises.push(this.syncSingleItem(key, item));
            }
        }

        if (syncPromises.length > 0) {
            console.log(`🔄 Synchronisation de ${syncPromises.length} éléments en attente...`);
            await Promise.allSettled(syncPromises);
            
            // Nettoyer les éléments synchronisés
            this.cleanupSyncedData();
        }
    }

    // Synchroniser un élément individuel
    async syncSingleItem(key, item) {
        try {
            switch (item.type) {
                case 'table_update':
                    if (typeof window.syncToSupabase === 'function') {
                        await window.syncToSupabase(item.data);
                    }
                    break;
                    
                case 'image_upload':
                    if (typeof window.uploadToSupabaseStorage === 'function') {
                        await window.uploadToSupabaseStorage(item.data);
                    }
                    break;
                    
                case 'row_delete':
                    if (typeof window.deleteFromSupabase === 'function') {
                        await window.deleteFromSupabase(item.data);
                    }
                    break;
                    
                default:
                    console.warn(`⚠️ Type de synchronisation non supporté: ${item.type}`);
            }
            
            // Marquer comme synchronisé
            item.synced = true;
            console.log(`✅ Élément synchronisé: ${key}`);
            
        } catch (error) {
            console.error(`❌ Erreur lors de la synchronisation de l'élément ${key}:`, error);
        }
    }

    // Nettoyer les données déjà synchronisées
    cleanupSyncedData() {
        let cleaned = 0;
        for (const [key, item] of this.pendingData.entries()) {
            if (item.synced) {
                this.pendingData.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.savePendingData();
            console.log(`🧹 ${cleaned} éléments synchronisés supprimés du stockage`);
        }
    }

    // Obtenir le nombre d'éléments en attente
    getPendingCount() {
        return Array.from(this.pendingData.values()).filter(item => !item.synced).length;
    }

    // Forcer la synchronisation manuelle
    async forcSync() {
        if (!this.isOnline) {
            if (typeof showMessage === 'function') {
                showMessage('❌ Connexion requise pour la synchronisation', 'error');
            }
            return false;
        }

        await this.autoSyncWhenOnline();
        return true;
    }

    // Vérifier l'état de la connexion
    checkConnectionStatus() {
        // Test de connexion plus fiable que navigator.onLine
        return fetch('/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
        }).then(() => {
            return true;
        }).catch(() => {
            return false;
        });
    }
}

// Initialiser le gestionnaire
let offlineSyncManager = null;

// Initialisation après chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    offlineSyncManager = new OfflineSyncManager();
    
    // Exposer globalement pour utilisation depuis index.html
    window.offlineSyncManager = offlineSyncManager;
    
    // Ajouter un indicateur de statut de connexion dans l'interface
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus && !document.getElementById('connection-status')) {
        const connectionStatus = document.createElement('div');
        connectionStatus.id = 'connection-status';
        connectionStatus.className = 'connection-status';
        connectionStatus.style.cssText = `
            display: inline-block;
            margin-left: 8px;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        `;
        
        syncStatus.appendChild(connectionStatus);
        offlineSyncManager.updateConnectionStatus(navigator.onLine);
    }
});

// Exporter pour utilisation en tant que module
export default OfflineSyncManager;