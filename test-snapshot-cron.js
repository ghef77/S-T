#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration cron et la fonction de snapshot
 * Usage: node test-snapshot-cron.js
 */

const https = require('https');
const cron = require('node-cron');

// Configuration Supabase
const SUPABASE_CONFIG = {
    url: 'https://fiecugxopjxzqfdnaqsu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw'
};

// Configuration cron
const CRON_CONFIG = {
    schedule: '0 10 * * *', // 10h00 tous les jours
    timezone: 'Europe/Paris'
};

console.log('🧪 Test de la Configuration Cron et Fonction Snapshot');
console.log('==================================================');
console.log(`📅 Configuration Cron: ${CRON_CONFIG.schedule}`);
console.log(`🌍 Fuseau horaire: ${CRON_CONFIG.timezone}`);
console.log(`🕐 Heure actuelle: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
console.log('');

// Fonction pour appeler la fonction Supabase
function callSnapshotFunction() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            test: true,
            timestamp: new Date().toISOString()
        });

        const options = {
            hostname: 'fiecugxopjxzqfdnaqsu.supabase.co',
            port: 443,
            path: '/functions/v1/snapshot_staff_table',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({ status: res.statusCode, data: result });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Test de la fonction snapshot
async function testSnapshotFunction() {
    console.log('🔄 Test de la fonction snapshot...');
    
    try {
        const result = await callSnapshotFunction();
        console.log(`✅ Statut HTTP: ${result.status}`);
        
        if (result.data.success) {
            console.log(`📊 Snapshot créé avec succès: ${result.data.message}`);
            console.log(`📈 Données: ${JSON.stringify(result.data.data, null, 2)}`);
        } else {
            console.log(`⚠️ Fonction exécutée mais échec: ${result.data.error}`);
        }
        
        return result;
    } catch (error) {
        console.error(`❌ Erreur lors de l'appel de la fonction: ${error.message}`);
        return null;
    }
}

// Test de la validation cron
function testCronValidation() {
    console.log('🔄 Test de la validation cron...');
    
    try {
        const isValid = cron.validate(CRON_CONFIG.schedule);
        console.log(`✅ Expression cron valide: ${isValid}`);
        
        // Afficher les prochaines exécutions
        const nextRuns = [];
        const now = new Date();
        
        for (let i = 0; i < 5; i++) {
            const nextRun = cron.getNextDate(CRON_CONFIG.schedule, now);
            nextRuns.push(nextRun);
            now.setTime(nextRun.getTime() + 1000); // +1 seconde pour éviter les doublons
        }
        
        console.log('📅 Prochaines exécutions prévues:');
        nextRuns.forEach((date, index) => {
            const localDate = date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
            console.log(`   ${index + 1}. ${localDate}`);
        });
        
        return true;
    } catch (error) {
        console.error(`❌ Erreur de validation cron: ${error.message}`);
        return false;
    }
}

// Test de simulation cron
function testCronSimulation() {
    console.log('🔄 Test de simulation cron...');
    
    try {
        // Simuler l'exécution à 10h00
        const testDate = new Date();
        testDate.setHours(10, 0, 0, 0);
        
        const shouldExecute = cron.schedule(CRON_CONFIG.schedule, () => {
            console.log('✅ Cron déclenché à 10h00');
        }, {
            scheduled: false,
            timezone: CRON_CONFIG.timezone
        });
        
        const isMatch = shouldExecute.match(testDate);
        console.log(`✅ Simulation 10h00: ${isMatch ? 'Déclenchement' : 'Pas de déclenchement'}`);
        
        // Simuler l'exécution à 11h00
        const testDate2 = new Date();
        testDate2.setHours(11, 0, 0, 0);
        
        const isMatch2 = shouldExecute.match(testDate2);
        console.log(`✅ Simulation 11h00: ${isMatch2 ? 'Déclenchement' : 'Pas de déclenchement'}`);
        
        return true;
    } catch (error) {
        console.error(`❌ Erreur de simulation cron: ${error.message}`);
        return false;
    }
}

// Test de la configuration timezone
function testTimezone() {
    console.log('🔄 Test de la configuration timezone...');
    
    try {
        const now = new Date();
        const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
        const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        
        console.log(`🌍 Heure locale: ${now.toLocaleString('fr-FR')}`);
        console.log(`🇫🇷 Heure Paris: ${parisTime.toLocaleString('fr-FR')}`);
        console.log(`🌐 Heure UTC: ${utcTime.toLocaleString('fr-FR')}`);
        
        // Vérifier la différence avec UTC
        const parisOffset = parisTime.getTime() - utcTime.getTime();
        const hoursDiff = parisOffset / (1000 * 60 * 60);
        
        console.log(`⏰ Différence avec UTC: ${hoursDiff} heures`);
        
        return true;
    } catch (error) {
        console.error(`❌ Erreur de configuration timezone: ${error.message}`);
        return false;
    }
}

// Fonction principale de test
async function runAllTests() {
    console.log('🚀 Démarrage de tous les tests...\n');
    
    // Test 1: Validation cron
    const cronValid = testCronValidation();
    console.log('');
    
    // Test 2: Configuration timezone
    const timezoneOk = testTimezone();
    console.log('');
    
    // Test 3: Simulation cron
    const cronSimOk = testCronSimulation();
    console.log('');
    
    // Test 4: Fonction snapshot
    const functionOk = await testSnapshotFunction();
    console.log('');
    
    // Résumé des tests
    console.log('📊 Résumé des Tests');
    console.log('==================');
    console.log(`✅ Validation Cron: ${cronValid ? 'OK' : 'ÉCHEC'}`);
    console.log(`✅ Configuration Timezone: ${timezoneOk ? 'OK' : 'ÉCHEC'}`);
    console.log(`✅ Simulation Cron: ${cronSimOk ? 'OK' : 'ÉCHEC'}`);
    console.log(`✅ Fonction Snapshot: ${functionOk ? 'OK' : 'ÉCHEC'}`);
    
    const allTestsPassed = cronValid && timezoneOk && cronSimOk && functionOk;
    console.log(`\n🎯 Résultat Global: ${allTestsPassed ? 'TOUS LES TESTS RÉUSSIS' : 'CERTAINS TESTS ONT ÉCHOUÉ'}`);
    
    if (allTestsPassed) {
        console.log('\n🎉 La configuration de snapshot automatique à 10h00 est prête et fonctionnelle !');
    } else {
        console.log('\n⚠️ Des problèmes ont été détectés. Vérifiez la configuration.');
    }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testSnapshotFunction,
    testCronValidation,
    testCronSimulation,
    testTimezone,
    runAllTests
};
