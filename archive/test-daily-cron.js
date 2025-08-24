// =====================================================
// SCRIPT DE TEST POUR VÉRIFIER LE CRON JOB QUOTIDIEN
// =====================================================
// Ce script teste que le cron job ne tourne plus toutes les minutes

const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Configuration du test
const TEST_DURATION = 3 * 60 * 1000; // 3 minutes
const CHECK_INTERVAL = 30 * 1000; // Vérifier toutes les 30 secondes
const MAX_SNAPSHOTS_PER_TEST = 1; // Maximum 1 snapshot en 3 minutes

let testStartTime;
let snapshotCount = 0;
let lastSnapshotTime = null;
let testActive = false;

// Fonction principale de test
async function testDailyCronJob() {
    console.log('🧪 DÉMARRAGE DU TEST DU CRON JOB QUOTIDIEN');
    console.log('⏱️  Durée du test: 3 minutes');
    console.log('🔍 Vérification toutes les 30 secondes');
    console.log('🎯 Objectif: Maximum 1 snapshot en 3 minutes');
    console.log('=' .repeat(60));

    testStartTime = Date.now();
    testActive = true;

    // Démarrer le test
    await monitorSnapshots();

    // Arrêter après la durée définie
    setTimeout(() => {
        testActive = false;
        console.log('=' .repeat(60));
        console.log('🏁 Test terminé !');
        generateTestReport();
    }, TEST_DURATION);
}

// Fonction de monitoring des snapshots
async function monitorSnapshots() {
    if (!testActive) return;

    try {
        // Vérifier les snapshots récents
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&order=created_at.desc&limit=5`, {
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
                return (now - snapshotTime) <= TEST_DURATION;
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
                    
                    // Vérifier le type d'exécution
                    if (latestSnapshot.metadata && latestSnapshot.metadata.executionType) {
                        console.log(`   🔄 Type: ${latestSnapshot.metadata.executionType}`);
                    }
                    
                    if (latestSnapshot.metadata && latestSnapshot.metadata.scheduledTime) {
                        console.log(`   ⏰ Planifié: ${latestSnapshot.metadata.scheduledTime}`);
                    }

                    // Vérifier la fréquence
                    if (snapshotCount > MAX_SNAPSHOTS_PER_TEST) {
                        console.log('🚨 ALERTE: Trop de snapshots détectés !');
                        console.log('   Le cron job tourne probablement encore trop souvent !');
                    }
                }
            }
        }

        // Afficher le statut actuel
        const elapsed = Math.round((Date.now() - testStartTime) / 1000);
        const remaining = Math.round((TEST_DURATION - (Date.now() - testStartTime)) / 1000);

        console.log(`\n📊 Statut du test:`);
        console.log(`   ⏱️  Temps écoulé: ${elapsed}s`);
        console.log(`   ⏳ Temps restant: ${remaining}s`);
        console.log(`   📸 Snapshots détectés: ${snapshotCount}`);
        console.log(`   🎯 Limite: ${MAX_SNAPSHOTS_PER_TEST}`);

        if (snapshotCount === 0) {
            console.log('✅ Aucun snapshot détecté - Le cron job semble arrêté !');
        } else if (snapshotCount <= MAX_SNAPSHOTS_PER_TEST) {
            console.log('✅ Fréquence normale - Le cron job semble correct !');
        } else {
            console.log('❌ Fréquence anormale - Le cron job tourne trop souvent !');
        }

        console.log('─' .repeat(40));

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
    }

    // Continuer le test si actif
    if (testActive) {
        setTimeout(monitorSnapshots, CHECK_INTERVAL);
    }
}

// Générer le rapport final du test
function generateTestReport() {
    console.log('\n📋 RAPPORT FINAL DU TEST');
    console.log('=' .repeat(50));

    if (snapshotCount === 0) {
        console.log('🎉 SUCCÈS: Aucun snapshot créé pendant le test');
        console.log('✅ Le cron job est correctement arrêté !');
        console.log('✅ Il ne tourne plus toutes les minutes');
        console.log('✅ Configuration quotidienne confirmée');
    } else if (snapshotCount <= MAX_SNAPSHOTS_PER_TEST) {
        console.log('✅ SUCCÈS: Fréquence normale détectée');
        console.log(`📸 Snapshots créés: ${snapshotCount}`);
        console.log('✅ Le cron job semble fonctionner correctement');
        console.log('✅ Configuration quotidienne probablement active');
    } else {
        console.log('❌ PROBLÈME: Fréquence anormale détectée');
        console.log(`📸 Snapshots créés: ${snapshotCount}`);
        console.log('🚨 Le cron job tourne encore trop souvent !');
        console.log('🔧 Actions recommandées:');
        console.log('   1. Vérifier le dashboard Supabase');
        console.log('   2. Vérifier le fichier cron.json');
        console.log('   3. Redémarrer la fonction');
    }

    console.log('\n📊 Statistiques du test:');
    console.log(`   ⏱️  Durée du test: ${Math.round(TEST_DURATION / 1000)}s`);
    console.log(`   📸 Total snapshots: ${snapshotCount}`);
    console.log(`   🎯 Limite d'alerte: ${MAX_SNAPSHOTS_PER_TEST}`);

    if (lastSnapshotTime) {
        const lastSnapshotAge = Math.round((Date.now() - lastSnapshotTime.getTime()) / 1000);
        console.log(`   📅 Dernier snapshot: il y a ${lastSnapshotAge}s`);
    }

    console.log('\n🔍 Prochaines étapes:');
    console.log('   1. Attendre 10h00 pour vérifier l\'exécution quotidienne');
    console.log('   2. Vérifier les logs dans le dashboard Supabase');
    console.log('   3. Utiliser le monitoring complet si nécessaire');
}

// Fonction pour démarrer le test
function startTest() {
    console.log('🧪 Démarrage du test du cron job quotidien...');
    testDailyCronJob();
}

// Exposer la fonction globalement
if (typeof window !== 'undefined') {
    window.testDailyCronJob = startTest;
} else {
    // Mode Node.js
    startTest();
}

// Auto-démarrage si exécuté directement
if (typeof require !== 'undefined' && require.main === module) {
    startTest();
}
