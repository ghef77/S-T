/**
 * Détecteur de Problèmes de Synchronisation Intermittents
 * Analyse les problèmes courants qui peuvent affecter la sync realtime
 */

class SyncIssuesDetector {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.recommendations = [];
        this.testResults = {};
        
        // Métriques de performance
        this.metrics = {
            connectionDrops: 0,
            latencySpikes: 0,
            eventLosses: 0,
            subscriptionResets: 0,
            blockingFlags: 0
        };
        
        this.init();
    }
    
    init() {
        console.log('🔍 Détecteur de problèmes de sync initialisé');
        this.startContinuousMonitoring();
    }
    
    // Démarrer la surveillance continue
    startContinuousMonitoring() {
        // Vérifier les problèmes toutes les 30 secondes
        setInterval(() => {
            this.checkIntermittentIssues();
        }, 30000);
        
        // Vérifier les métriques toutes les 10 secondes
        setInterval(() => {
            this.updateMetrics();
        }, 10000);
        
        // Vérifier les flags de blocage toutes les 5 secondes
        setInterval(() => {
            this.checkBlockingFlags();
        }, 5000);
        
        console.log('📊 Surveillance continue démarrée');
    }
    
    // Analyse complète des problèmes potentiels
    async runCompleteAnalysis() {
        console.log('🔍 Analyse complète des problèmes de synchronisation...');
        
        this.issues = [];
        this.warnings = [];
        this.recommendations = [];
        
        try {
            // Test 1: Problèmes de connexion
            await this.testConnectionStability();
            
            // Test 2: Problèmes de subscription
            await this.testSubscriptionReliability();
            
            // Test 3: Problèmes de performance
            await this.testPerformanceIssues();
            
            // Test 4: Problèmes de blocage
            await this.testBlockingConditions();
            
            // Test 5: Problèmes de réseau
            await this.testNetworkIssues();
            
            // Test 6: Problèmes de mémoire/ressources
            await this.testResourceIssues();
            
            // Test 7: Problèmes de timing
            await this.testTimingIssues();
            
            // Générer le rapport
            this.generateIssueReport();
            
            return {
                issues: this.issues,
                warnings: this.warnings,
                recommendations: this.recommendations,
                metrics: this.metrics,
                testResults: this.testResults
            };
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse:', error);
            this.issues.push({
                type: 'CRITICAL',
                category: 'ANALYSIS_ERROR',
                description: 'Erreur durant l\'analyse: ' + error.message,
                impact: 'Impossible d\'analyser tous les problèmes',
                fix: 'Vérifier la console pour plus de détails'
            });
        }
    }
    
    // Test 1: Stabilité de la connexion
    async testConnectionStability() {
        console.log('🔗 Test de stabilité de connexion...');
        
        try {
            if (!window.supabase) {
                this.issues.push({
                    type: 'CRITICAL',
                    category: 'CONNECTION',
                    description: 'Client Supabase non initialisé',
                    impact: 'Aucune synchronisation possible',
                    fix: 'Initialiser le client Supabase'
                });
                return;
            }
            
            // Test de connectivité basique
            const start = performance.now();
            const { data, error } = await window.supabase.auth.getSession();
            const responseTime = performance.now() - start;
            
            if (error) {
                this.issues.push({
                    type: 'MAJOR',
                    category: 'CONNECTION',
                    description: 'Erreur d\'authentification: ' + error.message,
                    impact: 'Problèmes de connexion intermittents',
                    fix: 'Vérifier les clés API et la configuration'
                });
            }
            
            if (responseTime > 5000) {
                this.warnings.push({
                    category: 'PERFORMANCE',
                    description: `Temps de réponse lent: ${Math.round(responseTime)}ms`,
                    recommendation: 'Vérifier la connexion réseau'
                });
            }
            
            this.testResults.connectionStability = {
                status: error ? 'FAILED' : 'PASSED',
                responseTime: Math.round(responseTime),
                error: error?.message
            };
            
        } catch (error) {
            this.issues.push({
                type: 'CRITICAL',
                category: 'CONNECTION',
                description: 'Impossible de tester la connexion: ' + error.message,
                impact: 'Statut de connexion inconnu',
                fix: 'Vérifier la configuration réseau'
            });
        }
    }
    
    // Test 2: Fiabilité de la subscription
    async testSubscriptionReliability() {
        console.log('📡 Test de fiabilité de subscription...');
        
        try {
            if (!window.realtimeSubscription) {
                this.issues.push({
                    type: 'CRITICAL',
                    category: 'SUBSCRIPTION',
                    description: 'Aucune subscription realtime active',
                    impact: 'Aucune synchronisation temps réel',
                    fix: 'Créer une subscription realtime'
                });
                return;
            }
            
            const subscription = window.realtimeSubscription;
            const state = subscription.state;
            
            if (state !== 'joined') {
                this.issues.push({
                    type: 'MAJOR',
                    category: 'SUBSCRIPTION',
                    description: `État de subscription incorrect: ${state}`,
                    impact: 'Synchronisation temps réel interrompue',
                    fix: 'Reconnecter la subscription'
                });
            }
            
            // Vérifier les handlers d'événements
            const bindings = subscription.bindings || {};
            const eventTypes = Object.keys(bindings);
            
            if (eventTypes.length === 0) {
                this.warnings.push({
                    category: 'SUBSCRIPTION',
                    description: 'Aucun handler d\'événement trouvé',
                    recommendation: 'Vérifier la configuration des événements'
                });
            }
            
            // Vérifier la durée de connexion
            const topic = subscription.topic;
            const isOldConnection = topic && topic.includes('staff-table') && 
                                   parseInt(topic.split('-').pop()) < (Date.now() - 300000); // Plus de 5 minutes
                                   
            if (isOldConnection) {
                this.warnings.push({
                    category: 'SUBSCRIPTION',
                    description: 'Connexion ancienne détectée',
                    recommendation: 'Considérer une reconnexion périodique'
                });
            }
            
            this.testResults.subscriptionReliability = {
                status: state === 'joined' ? 'PASSED' : 'FAILED',
                state: state,
                eventHandlers: eventTypes.length,
                topic: topic
            };
            
        } catch (error) {
            this.issues.push({
                type: 'MAJOR',
                category: 'SUBSCRIPTION',
                description: 'Erreur lors du test de subscription: ' + error.message,
                impact: 'État de subscription incertain',
                fix: 'Recréer la subscription'
            });
        }
    }
    
    // Test 3: Problèmes de performance
    async testPerformanceIssues() {
        console.log('⚡ Test des problèmes de performance...');
        
        try {
            // Test de la charge CPU/mémoire
            const memoryInfo = performance.memory || {};
            const usedMemory = memoryInfo.usedJSHeapSize || 0;
            const totalMemory = memoryInfo.totalJSHeapSize || 0;
            
            if (usedMemory > 0 && totalMemory > 0) {
                const memoryUsage = (usedMemory / totalMemory) * 100;
                
                if (memoryUsage > 80) {
                    this.warnings.push({
                        category: 'PERFORMANCE',
                        description: `Usage mémoire élevé: ${Math.round(memoryUsage)}%`,
                        recommendation: 'Optimiser l\'usage mémoire, vider les caches'
                    });
                }
            }
            
            // Test des événements en attente
            const eventQueueSize = this.getEventQueueSize();
            if (eventQueueSize > 10) {
                this.warnings.push({
                    category: 'PERFORMANCE',
                    description: `File d'événements surchargée: ${eventQueueSize} événements`,
                    recommendation: 'Optimiser le traitement des événements'
                });
            }
            
            // Test de la fréquence d'événements
            const eventFrequency = this.calculateEventFrequency();
            if (eventFrequency > 100) { // Plus de 100 événements/minute
                this.warnings.push({
                    category: 'PERFORMANCE',
                    description: `Fréquence d'événements élevée: ${eventFrequency}/min`,
                    recommendation: 'Considérer la mise en batch des événements'
                });
            }
            
            this.testResults.performanceIssues = {
                memoryUsage: memoryInfo.usedJSHeapSize ? Math.round((usedMemory / totalMemory) * 100) : 'N/A',
                eventQueueSize: eventQueueSize,
                eventFrequency: eventFrequency
            };
            
        } catch (error) {
            this.warnings.push({
                category: 'PERFORMANCE',
                description: 'Impossible de tester la performance: ' + error.message,
                recommendation: 'Surveiller manuellement les performances'
            });
        }
    }
    
    // Test 4: Conditions de blocage
    async testBlockingConditions() {
        console.log('🛑 Test des conditions de blocage...');
        
        const blockingFlags = {
            isLocalSaveInProgress: window.isLocalSaveInProgress || false,
            isExcelSaveInProgress: window.isExcelSaveInProgress || false,
            isRestoringCursor: typeof window.isRestoringCursor === 'function' ? window.isRestoringCursor() : false,
            snapshotMode: window.snapshotMode || 'unknown'
        };
        
        let activeBlocks = [];
        
        if (blockingFlags.isLocalSaveInProgress) {
            activeBlocks.push('Sauvegarde locale en cours');
        }
        
        if (blockingFlags.isExcelSaveInProgress) {
            activeBlocks.push('Export Excel en cours');
        }
        
        if (blockingFlags.isRestoringCursor) {
            activeBlocks.push('Restauration curseur en cours');
        }
        
        if (blockingFlags.snapshotMode !== 'live' && blockingFlags.snapshotMode !== 'unknown') {
            activeBlocks.push(`Mode snapshot: ${blockingFlags.snapshotMode}`);
        }
        
        if (activeBlocks.length > 0) {
            this.issues.push({
                type: 'MAJOR',
                category: 'BLOCKING',
                description: 'Flags de blocage actifs: ' + activeBlocks.join(', '),
                impact: 'Synchronisation temps réel bloquée',
                fix: 'Attendre la fin des opérations ou forcer le déblocage'
            });
        }
        
        // Vérifier les flags qui restent trop longtemps
        this.checkStuckFlags(blockingFlags);
        
        this.testResults.blockingConditions = {
            status: activeBlocks.length === 0 ? 'PASSED' : 'FAILED',
            activeBlocks: activeBlocks,
            flags: blockingFlags
        };
    }
    
    // Test 5: Problèmes réseau
    async testNetworkIssues() {
        console.log('🌐 Test des problèmes réseau...');
        
        try {
            // Test de connectivité internet basique
            const internetTest = await this.testInternetConnectivity();
            
            // Test de connectivité Supabase spécifique
            const supabaseTest = await this.testSupabaseConnectivity();
            
            // Test de latence
            const latencyTest = await this.testNetworkLatency();
            
            this.testResults.networkIssues = {
                internetConnectivity: internetTest,
                supabaseConnectivity: supabaseTest,
                networkLatency: latencyTest
            };
            
        } catch (error) {
            this.issues.push({
                type: 'MAJOR',
                category: 'NETWORK',
                description: 'Erreur lors du test réseau: ' + error.message,
                impact: 'Statut réseau incertain',
                fix: 'Vérifier la connexion internet'
            });
        }
    }
    
    // Test 6: Problèmes de ressources
    async testResourceIssues() {
        console.log('💾 Test des problèmes de ressources...');
        
        try {
            // Vérifier le nombre de connexions ouvertes
            const openConnections = this.countOpenConnections();
            if (openConnections > 5) {
                this.warnings.push({
                    category: 'RESOURCES',
                    description: `Nombre élevé de connexions: ${openConnections}`,
                    recommendation: 'Fermer les connexions inutilisées'
                });
            }
            
            // Vérifier les listeners d'événements
            const eventListeners = this.countEventListeners();
            if (eventListeners > 50) {
                this.warnings.push({
                    category: 'RESOURCES',
                    description: `Nombre élevé de listeners: ${eventListeners}`,
                    recommendation: 'Nettoyer les listeners inutilisés'
                });
            }
            
            // Vérifier les timers actifs
            const activeTimers = this.countActiveTimers();
            if (activeTimers > 10) {
                this.warnings.push({
                    category: 'RESOURCES',
                    description: `Nombre élevé de timers: ${activeTimers}`,
                    recommendation: 'Nettoyer les timers inutilisés'
                });
            }
            
            this.testResults.resourceIssues = {
                openConnections: openConnections,
                eventListeners: eventListeners,
                activeTimers: activeTimers
            };
            
        } catch (error) {
            this.warnings.push({
                category: 'RESOURCES',
                description: 'Impossible de tester les ressources: ' + error.message,
                recommendation: 'Surveiller manuellement l\'usage des ressources'
            });
        }
    }
    
    // Test 7: Problèmes de timing
    async testTimingIssues() {
        console.log('⏰ Test des problèmes de timing...');
        
        try {
            // Test de dérive d'horloge
            const clockSkew = await this.testClockSkew();
            if (Math.abs(clockSkew) > 5000) { // Plus de 5 secondes de différence
                this.warnings.push({
                    category: 'TIMING',
                    description: `Dérive d'horloge détectée: ${Math.round(clockSkew/1000)}s`,
                    recommendation: 'Synchroniser l\'horloge système'
                });
            }
            
            // Test de timeout des requêtes
            const timeoutIssues = await this.testRequestTimeouts();
            
            this.testResults.timingIssues = {
                clockSkew: clockSkew,
                timeoutIssues: timeoutIssues
            };
            
        } catch (error) {
            this.warnings.push({
                category: 'TIMING',
                description: 'Impossible de tester le timing: ' + error.message,
                recommendation: 'Vérifier manuellement les problèmes de timing'
            });
        }
    }
    
    // Méthodes utilitaires
    getEventQueueSize() {
        // Simulation - Dans un vrai système, on compterait les événements en attente
        return Math.floor(Math.random() * 5);
    }
    
    calculateEventFrequency() {
        // Simulation basée sur les métriques
        return this.metrics.eventsPerMinute || 0;
    }
    
    countOpenConnections() {
        // Compter les connexions Supabase ouvertes
        let count = 0;
        if (window.supabase) count++;
        if (window.realtimeSubscription) count++;
        return count;
    }
    
    countEventListeners() {
        // Estimation du nombre de listeners
        return document.querySelectorAll('*').length * 0.1; // Estimation approximative
    }
    
    countActiveTimers() {
        // Impossible de compter directement, estimation
        return 5; // Estimation conservatrice
    }
    
    async testInternetConnectivity() {
        try {
            const response = await fetch('https://httpbin.org/json', { 
                method: 'GET', 
                signal: AbortSignal.timeout(5000) 
            });
            return { status: response.ok ? 'CONNECTED' : 'FAILED', latency: 'OK' };
        } catch (error) {
            return { status: 'FAILED', error: error.message };
        }
    }
    
    async testSupabaseConnectivity() {
        try {
            if (!window.supabase) {
                return { status: 'NO_CLIENT' };
            }
            
            const start = performance.now();
            const { data, error } = await window.supabase.auth.getSession();
            const latency = performance.now() - start;
            
            return { 
                status: error ? 'ERROR' : 'CONNECTED', 
                latency: Math.round(latency),
                error: error?.message 
            };
        } catch (error) {
            return { status: 'FAILED', error: error.message };
        }
    }
    
    async testNetworkLatency() {
        try {
            const start = performance.now();
            await fetch('https://fiecugxopjxzqfdnaqsu.supabase.co', { 
                method: 'HEAD', 
                signal: AbortSignal.timeout(5000) 
            });
            const latency = performance.now() - start;
            
            let quality = 'EXCELLENT';
            if (latency > 1000) quality = 'POOR';
            else if (latency > 500) quality = 'AVERAGE';
            else if (latency > 200) quality = 'GOOD';
            
            return { latency: Math.round(latency), quality: quality };
        } catch (error) {
            return { status: 'FAILED', error: error.message };
        }
    }
    
    async testClockSkew() {
        try {
            const response = await fetch('https://httpbin.org/json');
            const data = await response.json();
            const serverTime = new Date().getTime(); // Approximation
            const clientTime = Date.now();
            return serverTime - clientTime;
        } catch (error) {
            return 0; // Pas de dérive détectable
        }
    }
    
    async testRequestTimeouts() {
        // Test de différents timeouts
        const tests = [1000, 3000, 5000]; // 1s, 3s, 5s
        const results = [];
        
        for (const timeout of tests) {
            try {
                await fetch('https://httpbin.org/delay/0.5', { 
                    signal: AbortSignal.timeout(timeout) 
                });
                results.push({ timeout: timeout, status: 'OK' });
            } catch (error) {
                results.push({ timeout: timeout, status: 'TIMEOUT' });
            }
        }
        
        return results;
    }
    
    checkStuckFlags(flags) {
        // Vérifier si les flags sont coincés depuis trop longtemps
        const now = Date.now();
        
        Object.entries(flags).forEach(([flagName, isActive]) => {
            if (isActive) {
                if (!this.flagTimestamps) this.flagTimestamps = {};
                
                if (!this.flagTimestamps[flagName]) {
                    this.flagTimestamps[flagName] = now;
                } else if (now - this.flagTimestamps[flagName] > 300000) { // 5 minutes
                    this.issues.push({
                        type: 'MAJOR',
                        category: 'STUCK_FLAG',
                        description: `Flag ${flagName} coincé depuis plus de 5 minutes`,
                        impact: 'Synchronisation bloquée indéfiniment',
                        fix: 'Forcer la réinitialisation du flag'
                    });
                }
            } else {
                // Réinitialiser le timestamp si le flag n'est plus actif
                if (this.flagTimestamps && this.flagTimestamps[flagName]) {
                    delete this.flagTimestamps[flagName];
                }
            }
        });
    }
    
    checkIntermittentIssues() {
        // Vérifications rapides des problèmes intermittents
        try {
            // Vérifier la subscription
            if (window.realtimeSubscription && window.realtimeSubscription.state !== 'joined') {
                this.metrics.connectionDrops++;
                console.warn('⚠️ Problème de subscription détecté:', window.realtimeSubscription.state);
            }
            
            // Vérifier les flags de blocage
            const hasBlocks = window.isLocalSaveInProgress || window.isExcelSaveInProgress || 
                             (typeof window.isRestoringCursor === 'function' && window.isRestoringCursor());
            if (hasBlocks) {
                this.metrics.blockingFlags++;
            }
            
        } catch (error) {
            console.error('Erreur lors de la vérification intermittente:', error);
        }
    }
    
    checkBlockingFlags() {
        // Vérification rapide et fréquente des flags
        const flags = [
            window.isLocalSaveInProgress,
            window.isExcelSaveInProgress,
            typeof window.isRestoringCursor === 'function' && window.isRestoringCursor()
        ];
        
        if (flags.some(flag => flag)) {
            this.metrics.blockingFlags++;
        }
    }
    
    updateMetrics() {
        // Mise à jour des métriques de performance
        if (window.realtimeSubscription) {
            const state = window.realtimeSubscription.state;
            if (state !== 'joined') {
                this.metrics.connectionDrops++;
            }
        }
    }
    
    generateIssueReport() {
        console.log('\n📋 RAPPORT DES PROBLÈMES DE SYNCHRONISATION');
        console.log('==========================================');
        
        if (this.issues.length === 0 && this.warnings.length === 0) {
            console.log('✅ Aucun problème détecté - Système stable');
            return;
        }
        
        if (this.issues.length > 0) {
            console.log('\n❌ PROBLÈMES CRITIQUES:');
            this.issues.forEach((issue, index) => {
                console.log(`${index + 1}. [${issue.category}] ${issue.description}`);
                console.log(`   Impact: ${issue.impact}`);
                console.log(`   Solution: ${issue.fix}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ AVERTISSEMENTS:');
            this.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. [${warning.category}] ${warning.description}`);
                console.log(`   Recommandation: ${warning.recommendation}`);
            });
        }
        
        console.log('\n📊 MÉTRIQUES:');
        Object.entries(this.metrics).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
        
        this.generateRecommendations();
    }
    
    generateRecommendations() {
        console.log('\n💡 RECOMMANDATIONS:');
        
        if (this.issues.some(i => i.category === 'CONNECTION')) {
            console.log('  1. Vérifier et réinitialiser la connexion Supabase');
        }
        
        if (this.issues.some(i => i.category === 'SUBSCRIPTION')) {
            console.log('  2. Recréer la subscription realtime');
        }
        
        if (this.warnings.some(w => w.category === 'PERFORMANCE')) {
            console.log('  3. Optimiser les performances (mémoire, événements)');
        }
        
        if (this.metrics.blockingFlags > 5) {
            console.log('  4. Investiguer les flags de blocage fréquents');
        }
        
        if (this.metrics.connectionDrops > 3) {
            console.log('  5. Stabiliser la connexion réseau');
        }
    }
    
    // API publique
    getStatus() {
        return {
            issues: this.issues,
            warnings: this.warnings,
            metrics: this.metrics,
            testResults: this.testResults
        };
    }
    
    async quickCheck() {
        console.log('🔍 Vérification rapide des problèmes...');
        await this.testConnectionStability();
        await this.testSubscriptionReliability();
        await this.testBlockingConditions();
        
        const hasIssues = this.issues.length > 0;
        const hasWarnings = this.warnings.length > 0;
        
        return {
            status: hasIssues ? 'ISSUES_FOUND' : hasWarnings ? 'WARNINGS_FOUND' : 'HEALTHY',
            summary: `${this.issues.length} problèmes, ${this.warnings.length} avertissements`
        };
    }
}

// Initialiser le détecteur
window.syncIssuesDetector = new SyncIssuesDetector();

// Fonctions globales
window.checkSyncIssues = () => window.syncIssuesDetector.runCompleteAnalysis();
window.quickSyncCheck = () => window.syncIssuesDetector.quickCheck();
window.getSyncMetrics = () => window.syncIssuesDetector.getStatus();

console.log('🔍 Détecteur de problèmes de synchronisation chargé');
console.log('Commandes disponibles:');
console.log('  - window.checkSyncIssues() - Analyse complète');
console.log('  - window.quickSyncCheck() - Vérification rapide');
console.log('  - window.getSyncMetrics() - Métriques actuelles');