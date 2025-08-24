// =====================================================
// SCRIPT DE MONITORING DU CRON JOB
// =====================================================
// Ce script vérifie que le cron job ne tourne plus toutes les minutes

const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Configuration du monitoring
const MONITORING_DURATION = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL = 30 * 1000; // Vérifier toutes les 30 secondes
const ALERT_THRESHOLD = 2; // Alerter si plus de 2 snapshots en 5 minutes

let monitoringStartTime;
let snapshotCount = 0;
let lastSnapshotTime = null;
let monitoringActive = false;

// Fonction principale de monitoring
async function startCronMonitoring() {
    console.log('🚀 Démarrage du monitoring du cron job...');
    console.log('⏱️  Durée de monitoring: 5 minutes');
    console.log('🔍 Vérification toutes les 30 secondes');
    console.log('⚠️  Alerte si plus de 2 snapshots en 5 minutes');
    console.log('=' .repeat(60));
    
    monitoringStartTime = Date.now();
    monitoringActive = true;
    
    // Démarrer le monitoring
    await monitorSnapshots();
    
    // Arrêter après la durée définie
    setTimeout(() => {
        monitoringActive = false;
        console.log('=' .repeat(60));
        console.log('🏁 Monitoring terminé !');
        generateFinalReport();
    }, MONITORING_DURATION);
}

// Fonction de monitoring des snapshots
async function monitorSnapshots() {
    if (!monitoringActive) return;
    
    try {
        // Vérifier les snapshots récents
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&order=created_at.desc&limit=10`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const snapshots = await response.json();
        
        if (snapshots && snapshots.length > 0) {
            const now = Date.now();
            const recentSnapshots = snapshots.filter(snapshot => {
                const snapshotTime = new Date(snapshot.created_at).getTime();
                return (now - snapshotTime) <= MONITORING_DURATION;
            });
            
            if (recentSnapshots.length > 0) {
                const latestSnapshot = recentSnapshots[0];
                const snapshotTime = new Date(latestSnapshot.created_at);
                const timeDiff = Math.round((now - snapshotTime.getTime()) / 1000);
                
                // Vérifier si c'est un nouveau snapshot
                if (!lastSnapshotTime || snapshotTime > lastSnapshotTime) {
                    snapshotCount++;
                    lastSnapshotTime = snapshotTime;
                    
                    console.log(`📸 Nouveau snapshot détecté #${snapshotCount}:`);
                    console.log(`   📅 Date: ${snapshotTime.toLocaleString('fr-FR')}`);
                    console.log(`   ⏱️  Il y a: ${timeDiff} secondes`);
                    console.log(`   📊 Lignes: ${latestSnapshot.row_count}`);
                    console.log(`   📁 Fichier: ${latestSnapshot.object_path}`);
                    
                    // Vérifier la fréquence
                    if (snapshotCount > ALERT_THRESHOLD) {
                        console.log('🚨 ALERTE: Trop de snapshots détectés !');
                        console.log('   Le cron job tourne probablement encore toutes les minutes !');
                    }
                }
            }
        }
        
        // Afficher le statut actuel
        const elapsed = Math.round((Date.now() - monitoringStartTime) / 1000);
        const remaining = Math.round((MONITORING_DURATION - (Date.now() - monitoringStartTime)) / 1000);
        
        console.log(`\n📊 Statut du monitoring:`);
        console.log(`   ⏱️  Temps écoulé: ${elapsed}s`);
        console.log(`   ⏳ Temps restant: ${remaining}s`);
        console.log(`   📸 Snapshots détectés: ${snapshotCount}`);
        console.log(`   🎯 Limite d'alerte: ${ALERT_THRESHOLD}`);
        
        if (snapshotCount === 0) {
            console.log('✅ Aucun snapshot détecté - Le cron job semble arrêté !');
        } else if (snapshotCount <= ALERT_THRESHOLD) {
            console.log('✅ Fréquence normale - Le cron job semble correct !');
        } else {
            console.log('❌ Fréquence anormale - Le cron job tourne trop souvent !');
        }
        
        console.log('─' .repeat(40));
        
    } catch (error) {
        console.error('❌ Erreur lors du monitoring:', error.message);
    }
    
    // Continuer le monitoring si actif
    if (monitoringActive) {
        setTimeout(monitorSnapshots, CHECK_INTERVAL);
    }
}

// Générer le rapport final
function generateFinalReport() {
    console.log('\n📋 RAPPORT FINAL DU MONITORING');
    console.log('=' .repeat(50));
    
    if (snapshotCount === 0) {
        console.log('🎉 SUCCÈS: Aucun snapshot créé pendant le monitoring');
        console.log('✅ Le cron job est correctement arrêté !');
        console.log('✅ Il ne tourne plus toutes les minutes');
    } else if (snapshotCount <= ALERT_THRESHOLD) {
        console.log('✅ SUCCÈS: Fréquence normale détectée');
        console.log(`📸 Snapshots créés: ${snapshotCount}`);
        console.log('✅ Le cron job semble fonctionner correctement');
    } else {
        console.log('❌ PROBLÈME: Fréquence anormale détectée');
        console.log(`📸 Snapshots créés: ${snapshotCount}`);
        console.log('🚨 Le cron job tourne encore trop souvent !');
        console.log('🔧 Actions recommandées:');
        console.log('   1. Vérifier le dashboard Supabase');
        console.log('   2. Supprimer les anciens cron jobs');
        console.log('   3. Redémarrer la fonction');
    }
    
    console.log('\n📊 Statistiques:');
    console.log(`   ⏱️  Durée de monitoring: ${Math.round(MONITORING_DURATION / 1000)}s`);
    console.log(`   📸 Total snapshots: ${snapshotCount}`);
    console.log(`   🎯 Limite d'alerte: ${ALERT_THRESHOLD}`);
    
    if (lastSnapshotTime) {
        const lastSnapshotAge = Math.round((Date.now() - lastSnapshotTime.getTime()) / 1000);
        console.log(`   📅 Dernier snapshot: il y a ${lastSnapshotAge}s`);
    }
}

// Fonction pour démarrer le monitoring
function startMonitoring() {
    console.log('🚀 Démarrage du monitoring du cron job...');
    startCronMonitoring();
}

// Exposer la fonction globalement
if (typeof window !== 'undefined') {
    window.startCronMonitoring = startMonitoring;
} else {
    // Mode Node.js
    startMonitoring();
}

// Auto-démarrage si exécuté directement
if (typeof require !== 'undefined' && require.main === module) {
    startMonitoring();
}
