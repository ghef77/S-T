// =====================================================
// MONITEUR TEMPS D'EXÉCUTION CRON JOB
// =====================================================
// Ce script surveille les temps d'exécution des cron jobs
// et détecte les patterns d'exécution anormaux

// Configuration Supabase
const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Variables de surveillance
let monitoringActive = false;
let executionLog = [];
let lastCheckTime = new Date();

// Fonction principale de surveillance
async function startCronTimingMonitor() {
    console.log('🕐 Démarrage du moniteur de timing cron...');
    monitoringActive = true;
    lastCheckTime = new Date();
    executionLog = [];
    
    // Afficher les informations initiales
    await displayInitialInfo();
    
    // Démarrer la surveillance en temps réel
    const monitorInterval = setInterval(async () => {
        if (!monitoringActive) {
            clearInterval(monitorInterval);
            return;
        }
        
        await checkForNewExecutions();
    }, 10000); // Vérifier toutes les 10 secondes
    
    // Arrêter automatiquement après 10 minutes
    setTimeout(() => {
        stopCronTimingMonitor();
    }, 600000);
    
    console.log('📊 Surveillance active. Arrêt automatique dans 10 minutes...');
}

// Fonction pour arrêter la surveillance
function stopCronTimingMonitor() {
    monitoringActive = false;
    console.log('⏹️ Surveillance arrêtée');
    generateTimingReport();
}

// Afficher les informations initiales
async function displayInitialInfo() {
    try {
        // Vérifier les dernières exécutions
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&order=created_at.desc&limit=20`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const snapshots = await response.json();
        
        console.log('📋 INFORMATIONS INITIALES:');
        console.log('=' .repeat(50));
        console.log(`🔍 Dernières exécutions trouvées: ${snapshots.length}`);
        
        if (snapshots.length > 0) {
            const latest = snapshots[0];
            const latestTime = new Date(latest.created_at);
            const minutesAgo = Math.round((new Date() - latestTime) / 1000 / 60);
            
            console.log(`📅 Dernière exécution: ${latestTime.toLocaleString('fr-FR')}`);
            console.log(`⏰ Il y a ${minutesAgo} minutes`);
            
            // Analyser les patterns récents
            analyzeRecentPattern(snapshots);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des données:', error);
    }
}

// Analyser les patterns d'exécution récents
function analyzeRecentPattern(snapshots) {
    console.log('\n🔍 ANALYSE DES PATTERNS:');
    console.log('=' .repeat(30));
    
    // Calculer les intervalles entre exécutions
    const intervals = [];
    for (let i = 0; i < snapshots.length - 1; i++) {
        const current = new Date(snapshots[i].created_at);
        const next = new Date(snapshots[i + 1].created_at);
        const intervalMinutes = (current - next) / 1000 / 60;
        intervals.push(intervalMinutes);
    }
    
    if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const minInterval = Math.min(...intervals);
        const maxInterval = Math.max(...intervals);
        
        console.log(`📊 Intervalle moyen: ${avgInterval.toFixed(1)} minutes`);
        console.log(`⏱️ Intervalle min: ${minInterval.toFixed(1)} minutes`);
        console.log(`⏱️ Intervalle max: ${maxInterval.toFixed(1)} minutes`);
        
        // Détection du type de cron
        if (avgInterval < 2) {
            console.log('🚨 ALERTE: Cron chaque minute détecté!');
        } else if (avgInterval < 60) {
            console.log('⚠️ Cron fréquent détecté (moins d\'une heure)');
        } else if (avgInterval > 1200) {
            console.log('✅ Cron quotidien normal');
        } else {
            console.log('🤔 Pattern d\'exécution à analyser');
        }
    }
    
    // Analyser les heures d'exécution
    const hours = snapshots.map(s => new Date(s.created_at).getHours());
    const uniqueHours = [...new Set(hours)];
    
    console.log(`🕐 Heures d'exécution: ${uniqueHours.sort((a, b) => a - b).join(', ')}h`);
    
    if (uniqueHours.includes(10)) {
        console.log('✅ Exécutions à 10h détectées (comme prévu)');
    } else {
        console.log('⚠️ Aucune exécution à 10h trouvée');
    }
}

// Vérifier les nouvelles exécutions
async function checkForNewExecutions() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&created_at=gte.${lastCheckTime.toISOString()}&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const newSnapshots = await response.json();
        
        if (newSnapshots.length > 0) {
            console.log(`\n🆕 ${newSnapshots.length} nouvelle(s) exécution(s) détectée(s):`);
            
            newSnapshots.forEach(snapshot => {
                const executionTime = new Date(snapshot.created_at);
                const logEntry = {
                    time: executionTime,
                    id: snapshot.id,
                    rowCount: snapshot.row_count,
                    objectPath: snapshot.object_path
                };
                
                executionLog.push(logEntry);
                
                console.log(`⏰ ${executionTime.toLocaleString('fr-FR')} - ${snapshot.row_count} lignes - ${snapshot.object_path}`);
                
                // Vérifier l'intervalle depuis la dernière exécution
                if (executionLog.length > 1) {
                    const prevExecution = executionLog[executionLog.length - 2];
                    const intervalMinutes = (executionTime - prevExecution.time) / 1000 / 60;
                    
                    if (intervalMinutes < 2) {
                        console.log('🚨 ALERTE: Exécution très fréquente (moins de 2 minutes)!');
                    }
                }
            });
            
            lastCheckTime = new Date();
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

// Générer le rapport final
function generateTimingReport() {
    console.log('\n📊 RAPPORT FINAL DE SURVEILLANCE:');
    console.log('=' .repeat(40));
    
    if (executionLog.length === 0) {
        console.log('✅ Aucune nouvelle exécution détectée pendant la surveillance');
        console.log('✅ Le cron semble fonctionner correctement (pas de minute-by-minute)');
        return;
    }
    
    console.log(`📈 Total d'exécutions détectées: ${executionLog.length}`);
    
    // Calculer la fréquence
    const timeSpan = (executionLog[executionLog.length - 1].time - executionLog[0].time) / 1000 / 60;
    const frequency = executionLog.length / (timeSpan / 60);
    
    console.log(`⏱️ Période de surveillance: ${timeSpan.toFixed(1)} minutes`);
    console.log(`📊 Fréquence: ${frequency.toFixed(2)} exécutions/heure`);
    
    // Diagnostic final
    if (frequency > 50) {
        console.log('🚨 PROBLÈME CONFIRMÉ: Cron chaque minute!');
        console.log('🔧 Actions recommandées:');
        console.log('   1. Vérifier cron.json: doit être "0 10 * * *"');
        console.log('   2. Redéployer la fonction');
        console.log('   3. Nettoyer la table avec simple-recreate-table.sql');
    } else if (frequency > 5) {
        console.log('⚠️ Fréquence élevée détectée');
        console.log('🔧 Vérifier la configuration du cron');
    } else {
        console.log('✅ Fréquence normale');
    }
    
    // Afficher le détail des exécutions
    console.log('\n📋 Détail des exécutions:');
    executionLog.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.time.toLocaleTimeString('fr-FR')} - ${entry.rowCount} lignes`);
    });
}

// Fonctions utilitaires pour les tests
function quickCronCheck() {
    console.log('🚀 Vérification rapide du cron...');
    startCronTimingMonitor();
    
    // Arrêter après 2 minutes pour un check rapide
    setTimeout(() => {
        stopCronTimingMonitor();
    }, 120000);
}

function extendedCronMonitor() {
    console.log('🔍 Surveillance étendue du cron (30 minutes)...');
    startCronTimingMonitor();
    
    // Arrêter après 30 minutes
    setTimeout(() => {
        stopCronTimingMonitor();
    }, 1800000);
}

// Fonctions exportées
window.startCronTimingMonitor = startCronTimingMonitor;
window.stopCronTimingMonitor = stopCronTimingMonitor;
window.quickCronCheck = quickCronCheck;
window.extendedCronMonitor = extendedCronMonitor;

// Instructions d'utilisation
console.log('📖 MONITEUR DE TIMING CRON CHARGÉ');
console.log('=====================================');
console.log('🚀 Utilisation:');
console.log('   startCronTimingMonitor() - Démarrer la surveillance');
console.log('   stopCronTimingMonitor() - Arrêter la surveillance');
console.log('   quickCronCheck() - Vérification rapide (2 min)');
console.log('   extendedCronMonitor() - Surveillance étendue (30 min)');
console.log('');
console.log('⚠️ N\'oubliez pas de configurer SUPABASE_URL et SUPABASE_ANON_KEY');
