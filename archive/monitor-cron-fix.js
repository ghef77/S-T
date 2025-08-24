// =====================================================
// SURVEILLANCE DU CRON APRÈS CORRECTION
// =====================================================
// Ce script surveille que le cron fonctionne maintenant correctement
// (quotidien à 10h00 au lieu de chaque minute)

// Configuration Supabase
const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Variables de surveillance
let monitoringActive = false;
let lastSnapshotTime = null;
let snapshotCount = 0;
let startTime = new Date();

// Fonction principale de surveillance
async function startCronMonitoring() {
    console.log('🕐 DÉMARRAGE DE LA SURVEILLANCE DU CRON CORRIGÉ');
    console.log('=' .repeat(60));
    console.log('🎯 Objectif: Vérifier que le cron fonctionne quotidiennement à 10h00');
    console.log('❌ Problème précédent: Snapshots créés chaque minute');
    console.log('✅ Solution appliquée: Nettoyage table + nouveau cron quotidien');
    
    monitoringActive = true;
    startTime = new Date();
    
    // Vérifier l'état initial
    await checkInitialState();
    
    // Démarrer la surveillance en temps réel
    const monitorInterval = setInterval(async () => {
        if (!monitoringActive) {
            clearInterval(monitorInterval);
            return;
        }
        
        await checkForNewSnapshots();
    }, 30000); // Vérifier toutes les 30 secondes
    
    // Arrêt automatique après 2 heures
    setTimeout(() => {
        stopCronMonitoring();
    }, 7200000);
    
    console.log('📊 Surveillance active. Arrêt automatique dans 2 heures...');
}

// Arrêter la surveillance
function stopCronMonitoring() {
    monitoringActive = false;
    console.log('⏹️ Surveillance arrêtée');
    generateMonitoringReport();
}

// Vérifier l'état initial
async function checkInitialState() {
    try {
        console.log('\n🔍 VÉRIFICATION DE L\'ÉTAT INITIAL');
        console.log('-'.repeat(40));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&order=created_at.desc&limit=10`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const snapshots = await response.json();
            console.log(`📋 ${snapshots.length} snapshots trouvés dans la table`);
            
            if (snapshots.length > 0) {
                const latest = snapshots[0];
                lastSnapshotTime = new Date(latest.created_at);
                console.log(`📅 Dernier snapshot: ${lastSnapshotTime.toLocaleString('fr-FR')}`);
                
                // Analyser la fréquence récente
                if (snapshots.length > 1) {
                    const intervals = [];
                    for (let i = 0; i < Math.min(5, snapshots.length - 1); i++) {
                        const current = new Date(snapshots[i].created_at);
                        const next = new Date(snapshots[i + 1].created_at);
                        const intervalMinutes = (current - next) / 1000 / 60;
                        intervals.push(intervalMinutes);
                    }
                    
                    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                    console.log(`📊 Intervalle moyen récent: ${avgInterval.toFixed(1)} minutes`);
                    
                    if (avgInterval < 2) {
                        console.log('🚨 ALERTE: Pattern de cron chaque minute DÉTECTÉ!');
                        console.log('💡 Le problème n\'est pas encore résolu');
                    } else if (avgInterval > 1000) {
                        console.log('✅ Pattern de cron quotidien normal détecté');
                    } else {
                        console.log('🤔 Pattern d\'exécution intermédiaire');
                    }
                }
            } else {
                console.log('✅ Table vide - prête pour le nouveau cron quotidien');
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification initiale:', error);
    }
}

// Vérifier les nouveaux snapshots
async function checkForNewSnapshots() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&created_at=gte.${startTime.toISOString()}&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const newSnapshots = await response.json();
        
        // Filtrer les nouveaux snapshots
        const trulyNewSnapshots = newSnapshots.filter(snap => {
            if (!lastSnapshotTime) return true;
            return new Date(snap.created_at) > lastSnapshotTime;
        });
        
        if (trulyNewSnapshots.length > 0) {
            console.log(`\n🆕 ${trulyNewSnapshots.length} nouveau(x) snapshot(s) détecté(s):`);
            
            trulyNewSnapshots.forEach(snap => {
                const snapTime = new Date(snap.created_at);
                snapshotCount++;
                
                console.log(`⏰ ${snapTime.toLocaleString('fr-FR')} - ${snap.row_count} lignes`);
                
                // Vérifier l'intervalle depuis le dernier snapshot
                if (lastSnapshotTime) {
                    const intervalHours = (snapTime - lastSnapshotTime) / 1000 / 60 / 60;
                    console.log(`   ⏱️ Intervalle depuis le dernier: ${intervalHours.toFixed(2)} heures`);
                    
                    // Détecter si c'est encore un cron chaque minute
                    if (intervalHours < 0.1) { // Moins de 6 minutes
                        console.log('🚨 ALERTE: Snapshot créé trop rapidement!');
                        console.log('💡 Le problème de cron chaque minute persiste');
                    } else if (intervalHours > 20) { // Plus de 20 heures
                        console.log('✅ Intervalle normal - probablement quotidien');
                    } else {
                        console.log('⚠️ Intervalle intermédiaire - à surveiller');
                    }
                }
                
                lastSnapshotTime = snapTime;
            });
            
            // Vérifier la fréquence globale
            const timeSpan = (new Date() - startTime) / 1000 / 60 / 60;
            const frequency = snapshotCount / timeSpan;
            
            if (frequency > 50) {
                console.log('🚨 PROBLÈME CONFIRMÉ: Plus de 50 snapshots/heure!');
                console.log('💡 Le cron chaque minute n\'est pas encore corrigé');
            } else if (frequency < 1) {
                console.log('✅ Fréquence normale - moins d\'1 snapshot/heure');
            } else {
                console.log(`⚠️ Fréquence intermédiaire: ${frequency.toFixed(2)} snapshots/heure`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

// Générer le rapport final
function generateMonitoringReport() {
    console.log('\n📊 RAPPORT FINAL DE SURVEILLANCE');
    console.log('=' .repeat(50));
    
    const timeSpan = (new Date() - startTime) / 1000 / 60 / 60;
    const frequency = snapshotCount / timeSpan;
    
    console.log(`📈 Total de snapshots détectés: ${snapshotCount}`);
    console.log(`⏱️ Durée de surveillance: ${timeSpan.toFixed(2)} heures`);
    console.log(`📊 Fréquence: ${frequency.toFixed(2)} snapshots/heure`);
    
    // Diagnostic final
    if (frequency > 50) {
        console.log('\n🚨 PROBLÈME NON RÉSOLU');
        console.log('Le cron chaque minute fonctionne encore');
        console.log('🔧 Actions recommandées:');
        console.log('   1. Exécuter fix-cron-daily-only.sql dans Supabase');
        console.log('   2. Supprimer la fonction Edge via Dashboard');
        console.log('   3. Redéployer avec la bonne configuration');
        
    } else if (frequency < 1) {
        console.log('\n✅ PROBLÈME RÉSOLU!');
        console.log('Le cron fonctionne maintenant correctement');
        console.log('🎯 Snapshots quotidiens à 10h00');
        
    } else {
        console.log('\n⚠️ AMÉLIORATION PARTIELLE');
        console.log('La fréquence a diminué mais n\'est pas encore optimale');
        console.log('🔧 Continuer la surveillance et appliquer les corrections');
    }
    
    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    if (frequency > 50) {
        console.log('   - Exécuter le script SQL de correction');
        console.log('   - Vérifier qu\'il n\'y a qu\'une seule fonction Edge');
        console.log('   - Surveiller les logs Supabase');
    } else {
        console.log('   - Continuer la surveillance');
        console.log('   - Vérifier le prochain snapshot à 10h00');
        console.log('   - Confirmer que la fréquence reste basse');
    }
}

// Fonctions utilitaires
function quickCheck() {
    console.log('🚀 Vérification rapide du cron...');
    checkInitialState();
}

function extendedMonitoring() {
    console.log('🔍 Surveillance étendue (4 heures)...');
    startCronMonitoring();
    
    setTimeout(() => {
        stopCronMonitoring();
    }, 14400000); // 4 heures
}

// Fonctions exportées
window.startCronMonitoring = startCronMonitoring;
window.stopCronMonitoring = stopCronMonitoring;
window.quickCheck = quickCheck;
window.extendedMonitoring = extendedMonitoring;

// Instructions d'utilisation
console.log('🕐 SURVEILLANCE DU CRON APRÈS CORRECTION CHARGÉE');
console.log('==================================================');
console.log('🚀 Utilisation:');
console.log('   startCronMonitoring() - Surveillance complète (2h)');
console.log('   extendedMonitoring() - Surveillance étendue (4h)');
console.log('   quickCheck() - Vérification rapide');
console.log('   stopCronMonitoring() - Arrêter la surveillance');
console.log('');
console.log('💡 Commencez par: startCronMonitoring()');
console.log('🎯 Objectif: Confirmer que le cron est maintenant quotidien');
