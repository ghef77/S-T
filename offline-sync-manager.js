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
            
            if (hasDraft || hasPendingImages) {
                console.log('💾 Données détectées, début de la sauvegarde...');
                
                // Sauvegarder le tableau si brouillon existe
                if (hasDraft && typeof window.syncToMaster === 'function') {
                    console.log('🔄 Sauvegarde du tableau...');
                    await window.syncToMaster(true); // true = manual save
                    console.log('✅ Tableau sauvegardé');
                }
                
                // Sauvegarder les images en attente
                if (hasPendingImages && typeof window.syncPendingImages === 'function') {
                    console.log('🔄 Sauvegarde des images...');
                    await window.syncPendingImages();
                    console.log('✅ Images sauvegardées');
                }
                
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