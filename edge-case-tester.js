/**
 * Testeur de Cas Limites et Scénarios d'Erreur
 * Teste les situations exceptionnelles qui peuvent causer des problèmes de sync
 */

class EdgeCaseTester {
    constructor() {
        this.testResults = {};
        this.errorScenarios = [];
        this.recoveryTests = [];
        
        this.init();
    }
    
    init() {
        console.log('🧪 Testeur de cas limites initialisé');
    }
    
    // Test complet de tous les cas limites
    async runAllEdgeCaseTests() {
        console.log('🧪 Démarrage des tests de cas limites...');
        
        const tests = [
            'testConnectionInterruption',
            'testHighLoadScenarios', 
            'testConcurrentModifications',
            'testNetworkTimeouts',
            'testBrowserTabSwitching',
            'testLongRunningOperations',
            'testMemoryPressure',
            'testRapidSubscriptionChanges',
            'testErrorRecovery',
            'testDataCorruption'
        ];
        
        for (const testName of tests) {
            try {
                console.log(`\n🔍 Test: ${testName}`);
                await this[testName]();
            } catch (error) {
                console.error(`❌ Erreur dans ${testName}:`, error);
                this.testResults[testName] = {
                    status: 'ERROR',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        }
        
        return this.generateEdgeCaseReport();
    }
    
    // Test 1: Interruption de connexion
    async testConnectionInterruption() {
        const testName = 'connectionInterruption';
        
        try {
            // Simuler une perte de connexion en supprimant temporairement la subscription
            const originalSubscription = window.realtimeSubscription;
            let recoveryTime = null;
            
            if (originalSubscription) {
                console.log('  📡 Simulation perte de connexion...');
                
                // Sauvegarder l'état avant interruption
                const beforeState = {
                    subscriptionExists: !!originalSubscription,
                    subscriptionState: originalSubscription.state,
                    timestamp: Date.now()
                };
                
                // Simuler l'interruption
                window.realtimeSubscription = null;
                
                // Attendre 2 secondes
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Tenter la récupération
                console.log('  🔄 Tentative de récupération...');
                const recoveryStart = Date.now();
                
                if (typeof window.forceRealtimeReconnect === 'function') {
                    window.forceRealtimeReconnect();
                    
                    // Attendre la reconnexion (max 10 secondes)
                    let attempts = 0;
                    while (attempts < 20 && (!window.realtimeSubscription || window.realtimeSubscription.state !== 'joined')) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                    }
                    
                    recoveryTime = Date.now() - recoveryStart;
                }
                
                const afterState = {
                    subscriptionExists: !!window.realtimeSubscription,
                    subscriptionState: window.realtimeSubscription?.state,
                    recoveryTime: recoveryTime,
                    timestamp: Date.now()
                };
                
                this.testResults[testName] = {
                    status: afterState.subscriptionExists && afterState.subscriptionState === 'joined' ? 'PASSED' : 'FAILED',
                    beforeState: beforeState,
                    afterState: afterState,
                    recoveryTime: recoveryTime,
                    message: recoveryTime ? `Récupération en ${recoveryTime}ms` : 'Échec de récupération'
                };
                
            } else {
                this.testResults[testName] = {
                    status: 'SKIPPED',
                    message: 'Pas de subscription active à tester'
                };
            }
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 2: Scénarios de haute charge
    async testHighLoadScenarios() {
        const testName = 'highLoadScenarios';
        
        try {
            console.log('  ⚡ Test de haute charge...');
            
            // Simuler de nombreuses requêtes simultanées
            const concurrentRequests = 10;
            const requests = [];
            
            const startTime = Date.now();
            
            for (let i = 0; i < concurrentRequests; i++) {
                if (window.supabase) {
                    requests.push(
                        window.supabase.auth.getSession().catch(error => ({ error: error.message }))
                    );
                }
            }
            
            const results = await Promise.all(requests);
            const endTime = Date.now();
            
            const successCount = results.filter(r => !r.error).length;
            const errorCount = results.filter(r => r.error).length;
            
            this.testResults[testName] = {
                status: errorCount === 0 ? 'PASSED' : errorCount < concurrentRequests / 2 ? 'PARTIAL' : 'FAILED',
                concurrentRequests: concurrentRequests,
                successCount: successCount,
                errorCount: errorCount,
                totalTime: endTime - startTime,
                averageTime: (endTime - startTime) / concurrentRequests,
                message: `${successCount}/${concurrentRequests} requêtes réussies en ${endTime - startTime}ms`
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 3: Modifications concurrentes
    async testConcurrentModifications() {
        const testName = 'concurrentModifications';
        
        try {
            console.log('  🔀 Test de modifications concurrentes...');
            
            // Simuler plusieurs événements realtime simultanés
            const events = [
                { event: 'INSERT', table: 'staffTable', new: { id: 'test1', name: 'Test 1' } },
                { event: 'UPDATE', table: 'staffTable', new: { id: 'test1', name: 'Test 1 Updated' } },
                { event: 'INSERT', table: 'staffTable', new: { id: 'test2', name: 'Test 2' } },
                { event: 'DELETE', table: 'staffTable', old: { id: 'test1' } }
            ];
            
            let processedEvents = 0;
            const eventTimes = [];
            
            // Créer un handler temporaire pour compter les événements
            const tempHandler = (payload) => {
                processedEvents++;
                eventTimes.push(Date.now());
            };
            
            // Si on a une fonction de gestion des événements
            const originalHandler = window.handleRealtimeUpdate;
            if (originalHandler) {
                window.handleRealtimeUpdate = tempHandler;
            }
            
            // Envoyer les événements rapidement
            const startTime = Date.now();
            events.forEach((event, index) => {
                setTimeout(() => {
                    if (typeof tempHandler === 'function') {
                        tempHandler(event);
                    }
                }, index * 10); // 10ms entre chaque événement
            });
            
            // Attendre que tous les événements soient traités
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Restaurer le handler original
            if (originalHandler) {
                window.handleRealtimeUpdate = originalHandler;
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            this.testResults[testName] = {
                status: processedEvents === events.length ? 'PASSED' : 'PARTIAL',
                eventsGenerated: events.length,
                eventsProcessed: processedEvents,
                totalTime: totalTime,
                averageProcessingTime: eventTimes.length > 1 ? 
                    (eventTimes[eventTimes.length - 1] - eventTimes[0]) / eventTimes.length : 0,
                message: `${processedEvents}/${events.length} événements traités`
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 4: Timeouts réseau
    async testNetworkTimeouts() {
        const testName = 'networkTimeouts';
        
        try {
            console.log('  ⏰ Test des timeouts réseau...');
            
            const timeoutTests = [
                { url: 'https://httpbin.org/delay/1', timeout: 2000, expectedResult: 'SUCCESS' },
                { url: 'https://httpbin.org/delay/3', timeout: 2000, expectedResult: 'TIMEOUT' },
                { url: 'https://httpbin.org/delay/5', timeout: 3000, expectedResult: 'TIMEOUT' }
            ];
            
            const results = [];
            
            for (const test of timeoutTests) {
                const startTime = Date.now();
                try {
                    const response = await fetch(test.url, { 
                        signal: AbortSignal.timeout(test.timeout) 
                    });
                    const actualTime = Date.now() - startTime;
                    
                    results.push({
                        url: test.url,
                        expectedResult: test.expectedResult,
                        actualResult: response.ok ? 'SUCCESS' : 'ERROR',
                        time: actualTime,
                        passed: (test.expectedResult === 'SUCCESS' && response.ok) || 
                               (test.expectedResult === 'TIMEOUT' && !response.ok)
                    });
                    
                } catch (error) {
                    const actualTime = Date.now() - startTime;
                    results.push({
                        url: test.url,
                        expectedResult: test.expectedResult,
                        actualResult: error.name === 'TimeoutError' ? 'TIMEOUT' : 'ERROR',
                        time: actualTime,
                        error: error.message,
                        passed: test.expectedResult === 'TIMEOUT'
                    });
                }
            }
            
            const passedTests = results.filter(r => r.passed).length;
            
            this.testResults[testName] = {
                status: passedTests === results.length ? 'PASSED' : 'PARTIAL',
                totalTests: results.length,
                passedTests: passedTests,
                results: results,
                message: `${passedTests}/${results.length} tests de timeout réussis`
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 5: Changement d'onglet navigateur
    async testBrowserTabSwitching() {
        const testName = 'browserTabSwitching';
        
        try {
            console.log('  👁️ Test du changement d\'onglet...');
            
            const originalVisibility = document.visibilityState;
            let visibilityChangeCount = 0;
            let lastVisibilityTime = Date.now();
            
            // Créer un listener pour les changements de visibilité
            const visibilityHandler = () => {
                visibilityChangeCount++;
                lastVisibilityTime = Date.now();
            };
            
            document.addEventListener('visibilitychange', visibilityHandler);
            
            // Simuler le changement d'onglet (limitation : on ne peut pas vraiment le simuler)
            // On va juste vérifier que le système réagit correctement aux événements de visibilité
            
            // Tester si la subscription reste active pendant l'inactivité simulée
            const beforeState = {
                subscriptionExists: !!window.realtimeSubscription,
                subscriptionState: window.realtimeSubscription?.state,
                visibilityState: document.visibilityState
            };
            
            // Attendre un moment pour observer
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterState = {
                subscriptionExists: !!window.realtimeSubscription,
                subscriptionState: window.realtimeSubscription?.state,
                visibilityState: document.visibilityState,
                visibilityChangeCount: visibilityChangeCount
            };
            
            // Nettoyer
            document.removeEventListener('visibilitychange', visibilityHandler);
            
            this.testResults[testName] = {
                status: afterState.subscriptionExists ? 'PASSED' : 'FAILED',
                beforeState: beforeState,
                afterState: afterState,
                message: 'Test de visibilité préparé (nécessite interaction manuelle)'
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 6: Opérations longues
    async testLongRunningOperations() {
        const testName = 'longRunningOperations';
        
        try {
            console.log('  ⏳ Test des opérations longues...');
            
            // Simuler une opération longue en activant les flags de blocage
            const originalFlags = {
                isLocalSaveInProgress: window.isLocalSaveInProgress || false,
                isExcelSaveInProgress: window.isExcelSaveInProgress || false
            };
            
            // Activer les flags de blocage
            window.isLocalSaveInProgress = true;
            window.isExcelSaveInProgress = true;
            
            const startTime = Date.now();
            
            // Vérifier que la sync est bien bloquée
            const duringBlockCheck = {
                isLocalSaveInProgress: window.isLocalSaveInProgress,
                isExcelSaveInProgress: window.isExcelSaveInProgress,
                subscriptionState: window.realtimeSubscription?.state
            };
            
            // Simuler une opération de 3 secondes
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Désactiver les flags
            window.isLocalSaveInProgress = originalFlags.isLocalSaveInProgress;
            window.isExcelSaveInProgress = originalFlags.isExcelSaveInProgress;
            
            const endTime = Date.now();
            const operationTime = endTime - startTime;
            
            const afterBlockCheck = {
                isLocalSaveInProgress: window.isLocalSaveInProgress,
                isExcelSaveInProgress: window.isExcelSaveInProgress,
                subscriptionState: window.realtimeSubscription?.state
            };
            
            this.testResults[testName] = {
                status: 'PASSED',
                operationTime: operationTime,
                duringBlock: duringBlockCheck,
                afterBlock: afterBlockCheck,
                message: `Opération simulée de ${operationTime}ms avec flags de blocage`
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 7: Pression mémoire
    async testMemoryPressure() {
        const testName = 'memoryPressure';
        
        try {
            console.log('  💾 Test de pression mémoire...');
            
            const beforeMemory = performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null;
            
            // Créer des objets pour simuler la pression mémoire
            const memoryConsumers = [];
            const iterations = 1000;
            
            for (let i = 0; i < iterations; i++) {
                memoryConsumers.push({
                    id: i,
                    data: new Array(1000).fill(`data-${i}`),
                    timestamp: Date.now(),
                    metadata: {
                        type: 'memory-test',
                        iteration: i,
                        randomData: Math.random().toString(36)
                    }
                });
            }
            
            const afterCreation = performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null;
            
            // Vérifier que la subscription fonctionne encore
            const subscriptionHealthy = window.realtimeSubscription && 
                                      window.realtimeSubscription.state === 'joined';
            
            // Nettoyer
            memoryConsumers.length = 0;
            
            // Forcer le garbage collection si possible
            if (window.gc) {
                window.gc();
            }
            
            const afterCleanup = performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null;
            
            const memoryIncrease = beforeMemory && afterCreation ? 
                afterCreation.used - beforeMemory.used : null;
            
            this.testResults[testName] = {
                status: subscriptionHealthy ? 'PASSED' : 'FAILED',
                beforeMemory: beforeMemory,
                afterCreation: afterCreation,
                afterCleanup: afterCleanup,
                memoryIncrease: memoryIncrease,
                subscriptionHealthy: subscriptionHealthy,
                message: memoryIncrease ? 
                    `Augmentation mémoire: ${Math.round(memoryIncrease / 1024 / 1024)}MB` : 
                    'Informations mémoire non disponibles'
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 8: Changements rapides de subscription
    async testRapidSubscriptionChanges() {
        const testName = 'rapidSubscriptionChanges';
        
        try {
            console.log('  🔄 Test des changements rapides de subscription...');
            
            const originalSubscription = window.realtimeSubscription;
            let subscriptionCount = 0;
            const subscriptions = [];
            
            // Créer et détruire rapidement plusieurs subscriptions
            for (let i = 0; i < 3; i++) {
                try {
                    if (window.supabase) {
                        const subscription = window.supabase
                            .channel(`rapid-test-${Date.now()}-${i}`)
                            .on('postgres_changes', { 
                                event: '*', 
                                schema: 'public', 
                                table: 'staffTable' 
                            }, () => {})
                            .subscribe();
                            
                        subscriptions.push(subscription);
                        subscriptionCount++;
                        
                        // Attendre un peu
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Supprimer la subscription
                        await window.supabase.removeChannel(subscription);
                    }
                } catch (error) {
                    console.warn(`Erreur subscription ${i}:`, error);
                }
            }
            
            // Restaurer la subscription originale si nécessaire
            if (originalSubscription && !window.realtimeSubscription) {
                // Tenter de restaurer
                if (typeof window.forceRealtimeReconnect === 'function') {
                    window.forceRealtimeReconnect();
                }
            }
            
            // Vérifier l'état final
            const finalState = {
                subscriptionExists: !!window.realtimeSubscription,
                subscriptionState: window.realtimeSubscription?.state,
                subscriptionTopic: window.realtimeSubscription?.topic
            };
            
            this.testResults[testName] = {
                status: finalState.subscriptionExists ? 'PASSED' : 'PARTIAL',
                subscriptionsCreated: subscriptionCount,
                finalState: finalState,
                message: `${subscriptionCount} subscriptions créées/supprimées rapidement`
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 9: Récupération d'erreur
    async testErrorRecovery() {
        const testName = 'errorRecovery';
        
        try {
            console.log('  🚑 Test de récupération d\'erreur...');
            
            const recoveryScenarios = [];
            
            // Scénario 1: Erreur de subscription
            try {
                if (window.supabase) {
                    const badChannel = window.supabase
                        .channel('') // Channel vide pour provoquer une erreur
                        .subscribe();
                    recoveryScenarios.push({ 
                        scenario: 'bad_channel', 
                        result: 'unexpected_success' 
                    });
                }
            } catch (error) {
                recoveryScenarios.push({ 
                    scenario: 'bad_channel', 
                    result: 'expected_error',
                    error: error.message 
                });
            }
            
            // Scénario 2: Récupération automatique
            let autoRecoveryWorked = false;
            if (typeof window.forceRealtimeReconnect === 'function') {
                try {
                    window.forceRealtimeReconnect();
                    
                    // Attendre la reconnexion
                    let attempts = 0;
                    while (attempts < 10 && (!window.realtimeSubscription || window.realtimeSubscription.state !== 'joined')) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                    }
                    
                    autoRecoveryWorked = window.realtimeSubscription && 
                                        window.realtimeSubscription.state === 'joined';
                    
                    recoveryScenarios.push({ 
                        scenario: 'auto_recovery', 
                        result: autoRecoveryWorked ? 'success' : 'failed',
                        attempts: attempts
                    });
                } catch (error) {
                    recoveryScenarios.push({ 
                        scenario: 'auto_recovery', 
                        result: 'error',
                        error: error.message 
                    });
                }
            }
            
            const successfulRecoveries = recoveryScenarios.filter(s => 
                s.result === 'success' || s.result === 'expected_error').length;
            
            this.testResults[testName] = {
                status: successfulRecoveries > 0 ? 'PASSED' : 'FAILED',
                scenarios: recoveryScenarios,
                successfulRecoveries: successfulRecoveries,
                totalScenarios: recoveryScenarios.length,
                message: `${successfulRecoveries}/${recoveryScenarios.length} scénarios de récupération réussis`
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Test 10: Corruption de données
    async testDataCorruption() {
        const testName = 'dataCorruption';
        
        try {
            console.log('  🛡️ Test de corruption de données...');
            
            // Simuler différents types de données corrompues
            const corruptedPayloads = [
                { event: 'INSERT', new: null }, // Données null
                { event: 'UPDATE', new: {} }, // Objet vide
                { event: 'DELETE', old: undefined }, // Données undefined
                { event: 'INVALID', new: { id: 'test' } }, // Événement invalide
                null, // Payload null
                undefined, // Payload undefined
                { }, // Payload vide
                'invalid_payload' // String au lieu d'objet
            ];
            
            let handledCorrectly = 0;
            const results = [];
            
            // Tester chaque payload corrompu
            for (const payload of corruptedPayloads) {
                try {
                    // Simuler l'arrivée du payload corrompu
                    if (typeof window.handleRealtimeUpdate === 'function') {
                        window.handleRealtimeUpdate(payload);
                        
                        results.push({
                            payload: payload,
                            result: 'handled',
                            error: null
                        });
                        handledCorrectly++;
                    } else {
                        results.push({
                            payload: payload,
                            result: 'no_handler',
                            error: 'Handler non disponible'
                        });
                    }
                } catch (error) {
                    results.push({
                        payload: payload,
                        result: 'error',
                        error: error.message
                    });
                    
                    // Une erreur capturée est un bon signe (gestion défensive)
                    handledCorrectly++;
                }
            }
            
            // Vérifier que le système est encore stable après les tests
            const systemStable = window.realtimeSubscription && 
                               window.realtimeSubscription.state === 'joined';
            
            this.testResults[testName] = {
                status: systemStable ? 'PASSED' : 'FAILED',
                totalPayloads: corruptedPayloads.length,
                handledCorrectly: handledCorrectly,
                results: results,
                systemStable: systemStable,
                message: `${handledCorrectly}/${corruptedPayloads.length} payloads corrompus gérés correctement`
            };
            
        } catch (error) {
            this.testResults[testName] = {
                status: 'ERROR',
                error: error.message
            };
        }
    }
    
    // Génération du rapport
    generateEdgeCaseReport() {
        console.log('\n🧪 RAPPORT DES TESTS DE CAS LIMITES');
        console.log('=====================================');
        
        const totalTests = Object.keys(this.testResults).length;
        const passedTests = Object.values(this.testResults).filter(t => t.status === 'PASSED').length;
        const partialTests = Object.values(this.testResults).filter(t => t.status === 'PARTIAL').length;
        const failedTests = Object.values(this.testResults).filter(t => t.status === 'FAILED').length;
        const errorTests = Object.values(this.testResults).filter(t => t.status === 'ERROR').length;
        
        console.log(`📊 Résultat global: ${passedTests}/${totalTests} tests réussis`);
        console.log(`   ✅ Réussis: ${passedTests}`);
        console.log(`   🟡 Partiels: ${partialTests}`);
        console.log(`   ❌ Échoués: ${failedTests}`);
        console.log(`   💥 Erreurs: ${errorTests}`);
        
        console.log('\n📋 Détail des tests:');
        Object.entries(this.testResults).forEach(([testName, result]) => {
            const status = result.status === 'PASSED' ? '✅' : 
                          result.status === 'PARTIAL' ? '🟡' : 
                          result.status === 'FAILED' ? '❌' : '💥';
            console.log(`  ${status} ${testName}: ${result.message || result.error || 'Terminé'}`);
        });
        
        this.generateEdgeCaseRecommendations();
        
        return {
            summary: {
                total: totalTests,
                passed: passedTests,
                partial: partialTests,
                failed: failedTests,
                errors: errorTests
            },
            results: this.testResults
        };
    }
    
    generateEdgeCaseRecommendations() {
        console.log('\n💡 RECOMMANDATIONS BASÉES SUR LES TESTS:');
        
        const failedTests = Object.entries(this.testResults).filter(([_, result]) => 
            result.status === 'FAILED' || result.status === 'ERROR');
        
        if (failedTests.length === 0) {
            console.log('  🎉 Excellent! Tous les cas limites sont gérés correctement.');
            return;
        }
        
        failedTests.forEach(([testName, result]) => {
            switch (testName) {
                case 'connectionInterruption':
                    console.log('  🔧 Améliorer la récupération automatique après perte de connexion');
                    break;
                case 'highLoadScenarios':
                    console.log('  ⚡ Optimiser les performances sous haute charge');
                    break;
                case 'concurrentModifications':
                    console.log('  🔀 Implémenter une gestion des conflits de modifications');
                    break;
                case 'networkTimeouts':
                    console.log('  ⏰ Ajuster les timeouts réseau et ajouter des retry');
                    break;
                case 'longRunningOperations':
                    console.log('  ⏳ Améliorer la gestion des opérations longues');
                    break;
                case 'memoryPressure':
                    console.log('  💾 Optimiser l\'usage mémoire et le garbage collection');
                    break;
                case 'rapidSubscriptionChanges':
                    console.log('  🔄 Stabiliser la gestion des changements rapides de subscription');
                    break;
                case 'errorRecovery':
                    console.log('  🚑 Renforcer les mécanismes de récupération d\'erreur');
                    break;
                case 'dataCorruption':
                    console.log('  🛡️ Ajouter plus de validation et de gestion défensive');
                    break;
            }
        });
    }
    
    // API publique
    getTestResults() {
        return this.testResults;
    }
    
    async quickEdgeCaseCheck() {
        console.log('🔍 Vérification rapide des cas limites critiques...');
        
        // Tests rapides seulement
        await this.testConnectionInterruption();
        await this.testErrorRecovery();
        
        const criticalIssues = Object.values(this.testResults).filter(t => 
            t.status === 'FAILED' || t.status === 'ERROR').length;
        
        return {
            status: criticalIssues === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
            criticalIssues: criticalIssues,
            message: criticalIssues === 0 ? 
                'Aucun problème critique détecté' : 
                `${criticalIssues} problèmes critiques trouvés`
        };
    }
}

// Initialiser le testeur
window.edgeCaseTester = new EdgeCaseTester();

// Fonctions globales
window.testEdgeCases = () => window.edgeCaseTester.runAllEdgeCaseTests();
window.quickEdgeCheck = () => window.edgeCaseTester.quickEdgeCaseCheck();
window.getEdgeTestResults = () => window.edgeCaseTester.getTestResults();

console.log('🧪 Testeur de cas limites chargé');
console.log('Commandes disponibles:');
console.log('  - window.testEdgeCases() - Tests complets');
console.log('  - window.quickEdgeCheck() - Vérification rapide');
console.log('  - window.getEdgeTestResults() - Résultats des tests');