// Simple système de détection offline/online avec sauvegarde automatique

console.log('🔄 Système de sauvegarde automatique offline/online initialisé');

// Écouter le retour en ligne
window.addEventListener('online', async () => {
    console.log('🌐 Connexion rétablie - Déclenchement de la sauvegarde automatique');
    
    // Attendre un peu que l'app se charge complètement
    setTimeout(async () => {
        try {
            // Vérifier s'il y a des données à sauvegarder
            const hasDraft = localStorage.getItem('staffTableDraft');
            const hasPendingImages = localStorage.getItem('pendingImageSync');
            const hasPendingDeletions = localStorage.getItem('pendingDeletions');
            
            if (hasDraft || hasPendingImages || hasPendingDeletions) {
                console.log('💾 Données détectées, début de la sauvegarde...');
                let syncNeeded = false;
                
                // ÉTAPE 1: Traiter les suppressions en attente AVANT tout autre chose
                if (hasPendingDeletions && typeof window.processPendingDeletions === 'function') {
                    console.log('🔄 Traitement des suppressions en attente...');
                    try {
                        const deletedCount = await window.processPendingDeletions();
                        if (deletedCount) {
                            console.log(`✅ ${deletedCount} suppression(s) traitée(s)`);
                            syncNeeded = true;
                        }
                    } catch (error) {
                        console.error('❌ Erreur lors du traitement des suppressions:', error);
                    }
                }
                
                // ÉTAPE 2: Sauvegarder le tableau si brouillon existe (sans rechargement)
                if (hasDraft && typeof window.syncToMaster === 'function') {
                    console.log('🔄 Sauvegarde du tableau...');
                    await window.syncToMaster(true, false); // true = manual save, false = pas de prune
                    console.log('✅ Tableau sauvegardé');
                }
                
                // ÉTAPE 3: Sauvegarder les images en attente
                if (hasPendingImages && typeof window.syncPendingImages === 'function') {
                    console.log('🔄 Sauvegarde des images...');
                    await window.syncPendingImages();
                    console.log('✅ Images sauvegardées');
                }
                
                // ÉTAPE 4: Forcer la réactivation du realtime après un délai
                setTimeout(() => {
                    if (typeof window.getSuppressRealtimeUntil === 'function' && window.getSuppressRealtimeUntil() > Date.now()) {
                        console.log('🔄 Forçage de la réactivation du realtime (sécurité)');
                        if (typeof window.setSuppressRealtimeUntil === 'function') {
                            window.setSuppressRealtimeUntil(0);
                        }
                        if (typeof window.setupRealtimeSubscription === 'function') {
                            window.setupRealtimeSubscription();
                        }
                    }
                }, 8000); // Sécurité: réactiver après 8 secondes max
                
                // Notification à l'utilisateur
                if (typeof showMessage === 'function') {
                    showMessage('✅ Sauvegarde automatique terminée', 'success');
                }
            } else {
                console.log('ℹ️ Aucune donnée en attente de sauvegarde');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde automatique:', error);
            if (typeof showMessage === 'function') {
                showMessage('❌ Erreur lors de la sauvegarde automatique', 'error');
            }
        }
    }, 2000); // Attendre 2 secondes que tout soit chargé
});

// Écouter la perte de connexion (optionnel, juste pour log)
window.addEventListener('offline', () => {
    console.log('📵 Connexion perdue - Mode hors ligne');
});