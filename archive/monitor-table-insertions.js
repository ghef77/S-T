// =====================================================
// SCRIPT DE SURVEILLANCE DE LA TABLE SNAPSHOTS
// =====================================================
// Ce script surveille la table table_snapshots_index pour détecter
// des insertions automatiques qui indiqueraient un cron job caché

const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Configuration du monitoring
const MONITORING_DURATION = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL = 15 * 1000; // Vérifier toutes les 15 secondes
const ALERT_THRESHOLD = 1; // Alerter si plus de 1 insertion en 10 minutes

let monitoringStartTime;
let initialSnapshotCount = 0;
let currentSnapshotCount = 0;
let insertionsDetected = 0;
let lastInsertionTime = null;
let monitoringActive = false;
let insertionHistory = [];

// Fonction principale de surveillance
async function startTableMonitoring() {
    console.log('🔍 DÉMARRAGE DE LA SURVEILLANCE DE LA TABLE SNAPSHOTS');
    console.log('⏱️  Durée de surveillance: 10 minutes');
    console.log('🔍 Vérification toutes les 15 secondes');
    console.log('⚠️  Alerte si insertion automatique détectée');
    console.log('=' .repeat(70));

    try {
        // Obtenir le nombre initial de snapshots
        await getInitialSnapshotCount();
        
        monitoringStartTime = Date.now();
        monitoringActive = true;

        // Démarrer la surveillance
        await monitorTableInsertions();

        // Arrêter après la durée définie
        setTimeout(() => {
            monitoringActive = false;
            console.log('=' .repeat(70));
            console.log('🏁 Surveillance terminée !');
            generateMonitoringReport();
        }, MONITORING_DURATION);

    } catch (error) {
        console.error('❌ Erreur lors du démarrage de la surveillance:', error);
    }
}

// Obtenir le nombre initial de snapshots
async function getInitialSnapshotCount() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=id&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const snapshots = await response.json();
            initialSnapshotCount = snapshots.length;
            currentSnapshotCount = initialSnapshotCount;
            
            console.log(`📊 Nombre initial de snapshots: ${initialSnapshotCount}`);
            
            if (initialSnapshotCount > 0) {
                const latestSnapshot = snapshots[0];
                console.log(`📅 Dernier snapshot: ${new Date(latestSnapshot.created_at).toLocaleString('fr-FR')}`);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du nombre initial:', error);
    }
}

// Surveiller les insertions dans la table
async function monitorTableInsertions() {
    if (!monitoringActive) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=id,created_at,object_path&order=created_at.desc&limit=20`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const snapshots = await response.json();
            const newSnapshotCount = snapshots.length;
            
            // Détecter les nouvelles insertions
            if (newSnapshotCount > currentSnapshotCount) {
                const newInsertions = newSnapshotCount - currentSnapshotCount;
                insertionsDetected += newInsertions;
                lastInsertionTime = new Date();
                
                console.log(`🚨 NOUVELLE INSERTION DÉTECTÉE !`);
                console.log(`   📊 Snapshots avant: ${currentSnapshotCount}`);
                console.log(`   📊 Snapshots maintenant: ${newSnapshotCount}`);
                console.log(`   📈 Nouvelles insertions: ${newInsertions}`);
                console.log(`   ⏰ Heure de détection: ${lastInsertionTime.toLocaleString('fr-FR')}`);
                
                // Analyser les nouveaux snapshots
                const newSnapshots = snapshots.slice(0, newInsertions);
                for (const snapshot of newSnapshots) {
                    console.log(`   📁 Nouveau snapshot: ${snapshot.object_path}`);
                    console.log(`   ⏰ Créé: ${new Date(snapshot.created_at).toLocaleString('fr-FR')}`);
                    
                    insertionHistory.push({
                        time: new Date(snapshot.created_at),
                        objectPath: snapshot.object_path,
                        id: snapshot.id
                    });
                }
                
                // Vérifier la fréquence
                if (insertionsDetected > ALERT_THRESHOLD) {
                    console.log('🚨 ALERTE: Trop d\'insertions détectées !');
                    console.log('   Il y a probablement un cron job caché qui tourne !');
                }
            }
            
            currentSnapshotCount = newSnapshotCount;
        }

        // Afficher le statut actuel
        const elapsed = Math.round((Date.now() - monitoringStartTime) / 1000);
        const remaining = Math.round((MONITORING_DURATION - (Date.now() - monitoringStartTime)) / 1000);

        console.log(`\n📊 Statut de la surveillance:`);
        console.log(`   ⏱️  Temps écoulé: ${elapsed}s`);
        console.log(`   ⏳ Temps restant: ${remaining}s`);
        console.log(`   📊 Snapshots initiaux: ${initialSnapshotCount}`);
        console.log(`   📊 Snapshots actuels: ${currentSnapshotCount}`);
        console.log(`   📈 Insertions détectées: ${insertionsDetected}`);
        console.log(`   🎯 Limite d'alerte: ${ALERT_THRESHOLD}`);

        if (insertionsDetected === 0) {
            console.log('✅ Aucune insertion détectée - Table stable !');
        } else if (insertionsDetected <= ALERT_THRESHOLD) {
            console.log('⚠️  Insertions détectées mais dans la limite normale');
        } else {
            console.log('🚨 ALERTE: Trop d\'insertions - Cron job caché probable !');
        }

        console.log('─' .repeat(40));

    } catch (error) {
        console.error('❌ Erreur lors de la surveillance:', error);
    }

    // Continuer la surveillance si actif
    if (monitoringActive) {
        setTimeout(monitorTableInsertions, CHECK_INTERVAL);
    }
}

// Générer le rapport final de surveillance
function generateMonitoringReport() {
    console.log('\n📋 RAPPORT FINAL DE SURVEILLANCE');
    console.log('=' .repeat(50));

    if (insertionsDetected === 0) {
        console.log('🎉 SUCCÈS: Aucune insertion automatique détectée !');
        console.log('✅ La table est stable et aucun cron job caché');
        console.log('✅ Le problème semble résolu');
    } else if (insertionsDetected <= ALERT_THRESHOLD) {
        console.log('⚠️  ATTENTION: Quelques insertions détectées');
        console.log(`📈 Total insertions: ${insertionsDetected}`);
        console.log('🔍 Vérification recommandée');
    } else {
        console.log('🚨 PROBLÈME: Trop d\'insertions détectées !');
        console.log(`📈 Total insertions: ${insertionsDetected}`);
        console.log('🚨 Il y a probablement un cron job caché !');
        console.log('🔧 Actions recommandées:');
        console.log('   1. Exécuter le script SQL de destruction/recréation');
        console.log('   2. Vérifier les Edge Functions cachées');
        console.log('   3. Contacter le support Supabase');
    }

    console.log('\n📊 Statistiques de surveillance:');
    console.log(`   ⏱️  Durée de surveillance: ${Math.round(MONITORING_DURATION / 1000)}s`);
    console.log(`   📊 Snapshots initiaux: ${initialSnapshotCount}`);
    console.log(`   📊 Snapshots finaux: ${currentSnapshotCount}`);
    console.log(`   📈 Insertions détectées: ${insertionsDetected}`);

    if (insertionHistory.length > 0) {
        console.log('\n📋 Historique des insertions:');
        insertionHistory.forEach((insertion, index) => {
            console.log(`   ${index + 1}. ${insertion.objectPath} - ${insertion.time.toLocaleString('fr-FR')}`);
        });
    }

    console.log('\n🚀 Actions recommandées:');
    if (insertionsDetected === 0) {
        console.log('   1. ✅ Le problème est résolu');
        console.log('   2. ✅ Continuer à surveiller');
    } else {
        console.log('   1. 🔧 Exécuter le script SQL de nettoyage');
        console.log('   2. 🔍 Vérifier les sources cachées');
        console.log('   3. 🚨 Contacter le support si nécessaire');
    }
}

// Fonction pour démarrer la surveillance
function startMonitoring() {
    console.log('🔍 Démarrage de la surveillance de la table snapshots...');
    startTableMonitoring();
}

// Exposer la fonction globalement
if (typeof window !== 'undefined') {
    window.startTableMonitoring = startMonitoring;
} else {
    // Mode Node.js
    startMonitoring();
}

// Auto-démarrage si exécuté directement
if (typeof require !== 'undefined' && require.main === module) {
    startMonitoring();
}

