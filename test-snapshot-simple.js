#!/usr/bin/env node

/**
 * Test simplifié de la fonction de snapshot Supabase
 */

const https = require('https');

// Configuration
const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

console.log('🧪 Test Simplifié de la Fonction Snapshot');
console.log('==========================================');
console.log(`🌐 URL Supabase: ${SUPABASE_URL}`);
console.log(`🕐 Heure actuelle: ${new Date().toLocaleString('fr-FR')}`);
console.log(`🇫🇷 Fuseau horaire: Europe/Paris`);
console.log('');

// Test de la fonction snapshot
function testSnapshotFunction() {
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
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log('🔄 Appel de la fonction snapshot...');
        console.log(`📤 Méthode: ${options.method}`);
        console.log(`🔗 Chemin: ${options.path}`);
        console.log(`🔑 Clé: ${ANON_KEY.substring(0, 20)}...`);

        const req = https.request(options, (res) => {
            console.log(`📡 Réponse reçue: HTTP ${res.statusCode}`);
            console.log(`📋 Headers:`, res.headers);
            
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📥 Données reçues: ${data.length} caractères`);
                
                try {
                    const result = JSON.parse(data);
                    console.log(`✅ Réponse parsée:`, JSON.stringify(result, null, 2));
                    resolve({ status: res.statusCode, data: result });
                } catch (error) {
                    console.log(`⚠️ Réponse non-JSON: ${data}`);
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Erreur de requête: ${error.message}`);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Test de la configuration cron
function testCronConfig() {
    console.log('📅 Test de la Configuration Cron');
    console.log('===============================');
    
    const cronExpression = '0 10 * * *';
    console.log(`⏰ Expression cron: ${cronExpression}`);
    console.log(`🌍 Signification: À 10h00 tous les jours`);
    console.log(`🇫🇷 Fuseau horaire: Europe/Paris`);
    
    // Vérifier l'heure actuelle
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    console.log(`\n🕐 Heures actuelles:`);
    console.log(`   Local: ${now.toLocaleString('fr-FR')}`);
    console.log(`   Paris: ${parisTime.toLocaleString('fr-FR')}`);
    console.log(`   UTC: ${utcTime.toLocaleString('fr-FR')}`);
    
    // Calculer la prochaine exécution à 10h00
    const nextRun = new Date(parisTime);
    nextRun.setHours(10, 0, 0, 0);
    
    if (parisTime.getHours() >= 10) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    
    const timeUntilNext = nextRun.getTime() - parisTime.getTime();
    const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesUntilNext = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`\n⏳ Prochaine exécution:`);
    console.log(`   Date: ${nextRun.toLocaleDateString('fr-FR')}`);
    console.log(`   Heure: ${nextRun.toLocaleTimeString('fr-FR')}`);
    console.log(`   Dans: ${hoursUntilNext}h ${minutesUntilNext}m`);
    
    return true;
}

// Fonction principale
async function main() {
    try {
        // Test 1: Configuration cron
        console.log('=' * 50);
        testCronConfig();
        console.log('\n' + '=' * 50);
        
        // Test 2: Fonction snapshot
        const result = await testSnapshotFunction();
        
        console.log('\n📊 Résumé du Test');
        console.log('==================');
        console.log(`✅ Statut HTTP: ${result.status}`);
        
        if (result.status === 200) {
            console.log(`🎉 Fonction snapshot fonctionne correctement !`);
            if (result.data.success) {
                console.log(`📊 Snapshot créé: ${result.data.message}`);
            }
        } else if (result.status === 401) {
            console.log(`🔒 Erreur d'authentification - Vérifiez la clé API`);
        } else if (result.status === 404) {
            console.log(`❌ Fonction non trouvée - Vérifiez le déploiement`);
        } else {
            console.log(`⚠️ Erreur HTTP ${result.status}: ${result.data.error || 'Inconnue'}`);
        }
        
        console.log(`\n🎯 Configuration Cron: 0 10 * * * (10h00 tous les jours)`);
        console.log(`🌍 Fuseau horaire: Europe/Paris`);
        console.log(`📅 Prochaine exécution: ${nextRun.toLocaleString('fr-FR')}`);
        
    } catch (error) {
        console.error(`❌ Erreur lors du test: ${error.message}`);
    }
}

// Exécuter le test
main();
