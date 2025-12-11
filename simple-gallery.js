// Simple Gallery with Supabase Integration - Version Simplifiée et Robuste
// Galerie d'images simplifiée synchronisée avec Supabase

// Use global window.supabase.createClient instead of ES6 import

class SimpleGallery {
    constructor() {
        // Configuration Supabase intégrée
        this.supabaseUrl = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';
        this.supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUwNTY1NywiZXhwIjoyMDcwMDgxNjU3fQ.5m7nLHxHxOkxQf8maZis7Y7jynqu2dWqIzEbgWvOTcE';
        this.bucketName = 'patient-images'; // Utilise le bucket existant
        
        // Clients Supabase
        this.supabase = null;        // Client avec clé anonyme pour affichage
        this.serviceSupabase = null; // Client avec clé de service pour opérations admin
        
        // État de la galerie
        this.images = [];
        this.isInitialized = false;
        this.currentImageIndex = 0;
        
        // Real-time synchronization
        this.realtimeSubscription = null;
        this.lastChangeTimestamp = null;
        this.pollingInterval = null;
        this.lastFileHash = null;
        this.patientNames = {}; // Stockage des associations images-patients
        
        // Proactive Bucket Management
        this.bucketManager = null;
        this.currentBucket = this.bucketName; // Track which bucket we're using
        
        // Initialisation
        this.init();
        
        // Initialize scroll indicators for buttons
        this.initScrollIndicators();
    }

    async init() {
        try {
    
            
            // Initialiser les clients Supabase
            await this.initializeSupabase();
            
            // Configurer les événements
            this.setupEventListeners();
            
            // Charger les images
            await this.loadImages();
            
            // Setup real-time synchronization
            await this.setupRealtimeSync();
            
            // Always start intelligent polling for automatic refresh every 3 seconds
            this.startIntelligentPolling();
            
            // Setup page unload cleanup
            window.addEventListener('beforeunload', () => {
                this.cleanupRealtimeSync();
                if (this.bucketManager) {
                    this.bucketManager.dispose();
                }
            });
            
            // Initialize proactive bucket management
            await this.initializeBucketManager();
            

            
        } catch (error) {
            console.error('❌ Erreur d\'initialisation:', error);
            this.showMessage(`Erreur d'initialisation: ${error.message}`, 'error');
        }
    }

    async initializeSupabase() {
        try {
            // Wait for Supabase to be initialized (it's loaded asynchronously in index.html)
            // First, try to wait for the supabaseReady event
            if (!window.supabaseReady) {
                console.log('⏳ Waiting for Supabase initialization...');
                
                // Wait for either the event or the global flag
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        window.removeEventListener('supabaseReady', onReady);
                        reject(new Error('Timeout waiting for Supabase initialization'));
                    }, 10000); // 10 second timeout
                    
                    const onReady = () => {
                        clearTimeout(timeout);
                        window.removeEventListener('supabaseReady', onReady);
                        resolve();
                    };
                    
                    if (window.supabaseReady && window.createSupabaseClient) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        window.addEventListener('supabaseReady', onReady);
                    }
                });
            }
            
            // Additional check with retries (fallback if event doesn't fire)
            let attempts = 0;
            while ((!window.supabaseReady || !window.createSupabaseClient) && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.createSupabaseClient) {
                console.error('❌ Supabase createClient not available after waiting');
                console.error('   window.supabase:', !!window.supabase);
                console.error('   window.supabaseReady:', window.supabaseReady);
                console.error('   window.createSupabaseClient:', !!window.createSupabaseClient);
                throw new Error('Supabase library not loaded. Please ensure Supabase is initialized in index.html.');
            }
            
            const createClient = window.createSupabaseClient;
            
            // Client avec clé anonyme pour affichage et upload
            this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
            
            // Client avec clé de service pour opérations admin
            this.serviceSupabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
            
            // Tester la connexion avec la clé de service (plus de permissions)
            const { data: buckets, error } = await this.serviceSupabase.storage.listBuckets();
            
            if (error) {
                throw new Error(`Erreur de connexion Supabase: ${error.message}`);
            }
            

            
            // Vérifier que le bucket existe
            const bucketExists = buckets.some(b => b.name === this.bucketName);
            if (!bucketExists) {
                throw new Error(`Bucket '${this.bucketName}' non trouvé. Buckets disponibles: ${buckets.map(b => b.name).join(', ')}`);
            }
            

            
            // Tester l'accès avec la clé anonyme
            const { data: testFiles, error: accessError } = await this.supabase.storage
                .from(this.bucketName)
                .list('', { limit: 1 });
            
            if (accessError) {
                throw new Error(`Erreur d'accès au bucket: ${accessError.message}`);
            }
            

            this.isInitialized = true;
            
            console.log('✅ SimpleGallery initialized successfully');
            
        } catch (error) {
            console.error('❌ Erreur initialisation Supabase:', error);
            throw error;
        }
    }

    async initializeBucketManager() {
        try {
            console.log('🔄 Initializing proactive bucket management...');
            
            // Import and initialize the bucket manager
            const { default: ImageBucketManager } = await import('./image-bucket-manager.js');
            
            this.bucketManager = new ImageBucketManager({
                supabaseUrl: this.supabaseUrl,
                supabaseAnonKey: this.supabaseAnonKey,
                supabaseServiceKey: this.supabaseServiceKey
            });
            
            // Wait for manager to initialize
            await new Promise(resolve => {
                const checkInitialized = () => {
                    if (this.bucketManager.supabase && this.bucketManager.serviceSupabase) {
                        resolve();
                    } else {
                        setTimeout(checkInitialized, 100);
                    }
                };
                checkInitialized();
            });
            
            console.log('✅ Bucket manager initialized successfully');
            
            // Show bucket statistics on initialization
            setTimeout(async () => {
                try {
                    const stats = await this.bucketManager.getBucketStatistics();
                    if (stats) {
                        console.log('📊 Bucket Statistics:', {
                            bucketsCount: stats.buckets.length,
                            totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
                            totalFiles: stats.totalFiles,
                            averageUsage: `${stats.averageUsage}%`
                        });
                    }
                } catch (error) {
                    console.warn('⚠️ Could not fetch initial bucket statistics:', error);
                }
            }, 2000);
            
        } catch (error) {
            console.error('❌ Failed to initialize bucket manager:', error);
            this.showMessage('⚠️ Gestion automatique des buckets désactivée', 'warning');
        }
    }

    async setupRealtimeSync() {
        try {
            if (!this.supabase || !this.isInitialized) {
                console.log('⚠️ Realtime sync not available - Supabase not initialized');
                return;
            }

            // Clean up existing subscription
            if (this.realtimeSubscription) {
                try {
                    await this.realtimeSubscription.unsubscribe();
                } catch (e) {
                    console.log('⚠️ Error cleaning up old subscription:', e.message);
                }
                this.realtimeSubscription = null;
            }

            console.log('🔄 Setting up real-time sync for gallery...');
            
            // Subscribe to storage changes
            this.realtimeSubscription = this.supabase
                .channel('gallery-storage-changes')
                .on('storage', 
                    { 
                        event: '*', 
                        bucket: this.bucketName 
                    }, 
                    async (payload) => {
                        console.log('🔄 Storage event received:', payload);
                        await this.handleStorageChange(payload);
                    }
                )
                .on('postgres_changes', 
                    {
                        event: '*',
                        schema: 'public',
                        table: 'image_patient_associations'
                    },
                    async (payload) => {
                        console.log('🔄 Patient association change received:', payload);
                        await this.handlePatientAssociationChange(payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Gallery real-time sync active');
                        // Start intelligent polling as backup
                        this.startIntelligentPolling();
                    } else if (status === 'CHANNEL_ERROR') {
                        console.log('❌ Gallery real-time sync error');
                        // Fallback to polling
                        this.startIntelligentPolling();
                    } else if (status === 'TIMED_OUT') {
                        console.log('⚠️ Gallery real-time sync timed out, retrying...');
                        setTimeout(() => this.setupRealtimeSync(), 5000);
                    }
                });

        } catch (error) {
            console.error('❌ Error setting up gallery real-time sync:', error);
            // Fallback to polling if real-time fails
            this.startIntelligentPolling();
        }
    }

    // Intelligent polling for automatic refresh every 3 seconds
    startIntelligentPolling() {
        // Always cleanup existing interval first
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        // Poll every 3 seconds for automatic refresh
        this.pollingInterval = setInterval(async () => {
            try {
                // Additional check to prevent execution if cleaned up
                if (!this.pollingInterval) return;
                await this.checkForChanges();
            } catch (error) {
                console.log('⚠️ Gallery polling error:', error.message);
            }
        }, 3000);
        
        console.log('🔄 Gallery automatic refresh started (every 3 seconds)');
    }

    // Check for changes by comparing file lists
    async checkForChanges() {
        try {
            const { data: currentFiles, error } = await this.supabase.storage
                .from(this.bucketName)
                .list('', { limit: 1000 });
            
            if (error) return;
            
            // Create a hash of current files for comparison
            const currentHash = this.createFileHash(currentFiles);
            
            if (this.lastFileHash && this.lastFileHash !== currentHash) {
                console.log('🔄 Gallery change detected via automatic refresh, updating...');
                this.lastFileHash = currentHash;
                await this.loadImages();
                this.forceRefreshDisplay();
            } else if (!this.lastFileHash) {
                // First time, just store the hash
                this.lastFileHash = currentHash;
            }
            
        } catch (error) {
            console.log('⚠️ Error checking for changes:', error.message);
        }
    }

    // Create a hash of file list for change detection
    createFileHash(files) {
        if (!files || files.length === 0) return 'empty';
        
        const fileInfo = files.map(f => `${f.name}-${f.updated_at}-${f.metadata?.size || 0}`).sort().join('|');
        return btoa(fileInfo).substring(0, 32); // Simple hash
    }

    async handleStorageChange(payload) {
        try {
            console.log('🔄 Storage change detected:', payload);
            
            // Prevent infinite loops by checking if this change was made by the current device
            if (payload.timestamp === this.lastChangeTimestamp) {
                console.log('🔄 Ignoring own change in real-time update');
                return;
            }

            // Update timestamp
            this.lastChangeTimestamp = payload.timestamp;
            
            // Immediate update without delay for better responsiveness
            await this.loadImages();
            this.forceRefreshDisplay();
            
            console.log('✅ Gallery updated from real-time sync');
            
        } catch (error) {
            console.error('❌ Error handling storage change:', error);
        }
    }

    // Handle patient association changes in real-time
    async handlePatientAssociationChange(payload) {
        try {
            console.log('🔄 Patient association change detected:', payload);
            
            // Recharger les associations patients
            await this.loadAndUpdatePatientNames();
            
            // Update the display for the specific image if it's visible
            if (payload.new) {
                // New association or update
                const imageName = payload.new.image_name;
                const patientName = payload.new.patient_name;
                
                // Update the display immediately
                this.updateSelectedPatientDisplay(imageName, patientName);
                
                // Si l'image viewer est ouvert, mettre à jour l'affichage
                if (document.getElementById('image-viewer') && !document.getElementById('image-viewer').classList.contains('hidden')) {
                    this.displayCurrentImage();
                }
                
                // Show notification
                this.showMessage(`🔄 Patient associé mis à jour: ${patientName}`, 'info');
                
            } else if (payload.old) {
                // Association deleted
                const imageName = payload.old.image_name;
                
                // Update the display immediately
                this.updateSelectedPatientDisplay(imageName, '');
                
                // Si l'image viewer est ouvert, mettre à jour l'affichage
                if (document.getElementById('image-viewer') && !document.getElementById('image-viewer').classList.contains('hidden')) {
                    this.displayCurrentImage();
                }
                
                // Show notification
                this.showMessage(`🔄 Association patient supprimée`, 'info');
            }
            
            console.log('✅ Patient associations updated from real-time sync');
            
        } catch (error) {
            console.error('❌ Error handling patient association change:', error);
        }
    }

    // Force refresh the display to ensure real-time changes are visible
    forceRefreshDisplay() {
        try {
            console.log('🔄 Force refreshing gallery display...');
            
            // Re-render the gallery
            this.renderGallery();
            
            // Update image count
            this.updateImageCount();
            
            // Force a DOM update by triggering a reflow
            const galleryGrid = document.getElementById('gallery-grid');
            if (galleryGrid) {
                // Force reflow to ensure display updates
                galleryGrid.style.display = 'none';
                galleryGrid.offsetHeight; // Trigger reflow
                galleryGrid.style.display = '';
                
                // Ensure proper visibility
                if (this.images.length > 0) {
                    galleryGrid.classList.remove('hidden');
                    const emptyState = document.getElementById('empty-state');
                    if (emptyState) {
                        emptyState.classList.add('hidden');
                    }
                } else {
                    galleryGrid.classList.add('hidden');
                    const emptyState = document.getElementById('empty-state');
                    if (emptyState) {
                        emptyState.classList.remove('hidden');
                    }
                }
                
                // Force browser to repaint
                galleryGrid.style.transform = 'translateZ(0)';
                galleryGrid.offsetHeight;
                galleryGrid.style.transform = '';
            }
            
            // Update any other UI elements that might need refreshing
            this.updateUIElements();
            
            console.log('✅ Gallery display force refreshed');
            
        } catch (error) {
            console.error('❌ Error force refreshing display:', error);
        }
    }

    // Force real-time synchronization after upload
    async forceRealtimeSync() {
        try {
            console.log('🔄 Forcing real-time sync after upload...');
            
            // Force a change detection by updating the file hash
            await this.checkForChanges();
            
            // If real-time subscription is active, trigger a manual sync
            if (this.realtimeSubscription) {
                console.log('🔄 Real-time subscription active, triggering manual sync...');
                
                // Force reload images to ensure latest state
                await this.loadImages();
                this.forceRefreshDisplay();
                
                // Update the file hash to prevent duplicate detection
                const { data: currentFiles } = await this.supabase.storage
                    .from(this.bucketName)
                    .list('', { limit: 1000 });
                
                if (currentFiles) {
                    this.lastFileHash = this.createFileHash(currentFiles);
                }
            }
            
            console.log('✅ Real-time sync forced after upload');
            
        } catch (error) {
            console.error('❌ Error forcing real-time sync:', error);
        }
    }

    // Update UI elements that might need refreshing
    updateUIElements() {
        try {
            // Update image count display
            const countElement = document.getElementById('image-count');
            if (countElement) {
                countElement.textContent = `${this.images.length} image(s)`;
            }
            
            // Update select-all checkbox state
            const selectAllCheckbox = document.getElementById('select-all-images');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
            
            // Clear any selected images
            const checkboxes = document.querySelectorAll('.image-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = false;
            });
            
            // Update delete button state
            const deleteBtn = document.getElementById('delete-selected-btn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            
        } catch (error) {
            console.log('⚠️ Error updating UI elements:', error.message);
        }
    }

    async loadImages() {
        if (!this.isInitialized) {

            return;
        }

        try {
            this.showLoading(true);

            let allFiles = [];

            // If bucket manager is available, load from all image buckets
            if (this.bucketManager) {
                try {
                    const imageBuckets = await this.bucketManager.getImageBuckets();
                    console.log(`📁 Loading images from ${imageBuckets.length} bucket(s)`);

                    for (const bucket of imageBuckets) {
                        const { data: files, error } = await this.supabase.storage
                            .from(bucket.name)
                            .list('', { limit: 1000 });
                        
                        if (!error && files) {
                            // Add bucket info to each file
                            const bucketFiles = files.map(file => ({
                                ...file,
                                bucketName: bucket.name
                            }));
                            allFiles.push(...bucketFiles);
                        } else {
                            console.warn(`⚠️ Error loading from bucket ${bucket.name}:`, error);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Error loading from multiple buckets, falling back to single bucket:', error);
                    // Fallback to single bucket
                    const { data: files, error: singleError } = await this.supabase.storage
                        .from(this.bucketName)
                        .list('', { limit: 1000 });
                    
                    if (singleError) {
                        throw new Error(`Erreur chargement images: ${singleError.message}`);
                    }
                    allFiles = files.map(file => ({ ...file, bucketName: this.bucketName }));
                }
            } else {
                // Fallback to original single bucket loading
                const { data: files, error } = await this.supabase.storage
                    .from(this.bucketName)
                    .list('', { limit: 1000 });
                
                if (error) {
                    throw new Error(`Erreur chargement images: ${error.message}`);
                }
                allFiles = files.map(file => ({ ...file, bucketName: this.bucketName }));
            }
            
            // Traiter les fichiers avec URL directe Supabase
            this.images = allFiles.map(file => {
                // URL directe Supabase pour éviter les erreurs
                const bucketName = file.bucketName || this.bucketName;
                const directUrl = `${this.supabaseUrl}/storage/v1/object/public/${bucketName}/${encodeURIComponent(file.name)}`;
                
                return {
                    name: file.name,
                    size: file.metadata?.size || 0,
                    created_at: file.created_at,
                    updated_at: file.updated_at,
                    url: directUrl,
                    bucketName: bucketName
                };
            });
            
                        // Trier les images par date de création (plus récentes en premier)
            this.images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Charger aussi les associations patients
            await this.loadAndUpdatePatientNames();
            
            // Afficher la galerie
            this.renderGallery();
            this.updateImageCount();
            
            // Initialiser le filtre par patient
            await this.initializePatientFilter();
            
            // Valider les URLs des images
            await this.validateImageUrls();
            
        } catch (error) {
            console.error('❌ Erreur chargement images:', error);
            this.showMessage(`Erreur chargement: ${error.message}`, 'error');
            
            // Même en cas d'erreur, essayer d'afficher la galerie si des images existent
            if (this.images.length > 0) {
    
                this.renderGallery();
            }
        } finally {
            this.showLoading(false);
            
            // Vérifier que la galerie est bien visible après le chargement
            setTimeout(() => {
                const galleryGrid = document.getElementById('gallery-grid');
                const emptyState = document.getElementById('empty-state');
                
                if (galleryGrid && this.images.length > 0) {
                    if (galleryGrid.classList.contains('hidden')) {
                        console.warn('⚠️ La galerie est masquée après le chargement - correction...');
                        galleryGrid.classList.remove('hidden');
                    }
                    if (emptyState && !emptyState.classList.contains('hidden')) {
                        console.warn('⚠️ L\'état vide est visible alors qu\'il y a des images - correction...');
                        emptyState.classList.add('hidden');
                    }
                }
            }, 100);
        }
    }

    // Nouvelle fonction pour charger et mettre à jour les noms de patients
    async loadAndUpdatePatientNames() {
        try {
            const patientNames = await this.loadPatientNames();
            this.patientNames = patientNames;
            console.log('✅ Noms de patients chargés et stockés:', Object.keys(patientNames).length);
        } catch (error) {
            console.error('❌ Erreur chargement noms patients:', error);
            this.patientNames = {};
        }
    }

    async renderGallery() {
        try {
            console.log('🔄 Rendu de la galerie...');
            
            const galleryGrid = document.getElementById('gallery-grid');
            const emptyState = document.getElementById('empty-state');
            
            if (!galleryGrid) {
                console.error('❌ Élément gallery-grid non trouvé !');
                return;
            }

            if (this.images.length === 0) {
                galleryGrid.classList.add('hidden');
                if (emptyState) {
                    emptyState.classList.remove('hidden');
                }
                return;
            }

            // Masquer l'état vide et afficher la grille
            if (emptyState) {
                emptyState.classList.add('hidden');
            }
            galleryGrid.classList.remove('hidden');

            // Charger les noms des patients sauvegardés et la liste des patients
            const patientNames = await this.loadPatientNames();
            const patientsList = await this.loadPatientsList();
            
            console.log('📋 Noms de patients chargés:', patientNames);
            console.log('👥 Liste des patients:', patientsList?.length || 0, 'patients');

            const galleryHTML = this.images.map((image, index) => `
                <div class="image-card bg-white rounded-lg shadow-sm border overflow-hidden relative group" style="border: 2px solid #e5e7eb;">
                    <!-- Selection Checkbox -->
                    <div class="absolute top-2 left-2 z-10">
                        <input type="checkbox" 
                               class="image-checkbox w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                               data-filename="${image.name}"
                               onchange="window.simpleGallery.updateSelection()">
                    </div>
                    
                    <div class="aspect-square bg-gray-100 relative group" style="min-height: 200px;">
                        <img src="${image.url}" 
                             alt="${image.name}" 
                             class="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                             style="min-width: 100px; min-height: 100px; border: 1px solid #d1d5db;"
                             loading="lazy"
                             data-image-index="${index}"
                             onclick="window.simpleGallery.openImageViewerByIndex(${index})"
                             onload="this.style.border='2px solid green';"
                             onerror="this.style.border='2px solid red'; this.style.backgroundColor='#fee2e2';">
                        
                        <!-- Delete Button - Plus petit et mieux visible -->
                        <button onclick="window.simpleGallery.deleteImage('${image.name}', '${image.url}')" 
                                class="delete-btn absolute bg-red-500 hover:bg-red-600 text-white rounded-full hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400 shadow-lg z-50 transition-all duration-200"
                                style="display: flex; align-items: center; justify-content: center; left: 50%; bottom: 8px; transform: translateX(-50%); border: 2px solid white;"
                                title="Supprimer cette image">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    
                    <div class="p-3">
                        <label class="block text-xs font-medium text-gray-700 mb-2 font-semibold">📋 Associer à un Patient:</label>
                        
                        <!-- Patient actuellement sélectionné -->
                        <div class="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 ${patientNames[image.name] ? '' : 'hidden'}" id="selected-patient-${image.name}">
                            <strong>Patient actuel:</strong> ${patientNames[image.name] || 'Aucun'}
                        </div>
                        
                        <!-- Sélecteur de patient avec recherche -->
                        <div class="relative">
                            <select class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                                    data-image-name="${image.name}"
                                    onchange="window.simpleGallery.savePatientName('${image.name}', this.value)"
                                    style="font-size: 13px; max-height: 200px; overflow-y: auto;">
                                <option value="">🔍 Choisir un patient dans la liste...</option>
                                ${patientsList.map(patient => `
                                    <option value="${patient.Nom_Prénom}" ${patientNames[image.name] === patient.Nom_Prénom ? 'selected' : ''}>
                                        👤 ${patient.Nom_Prénom}
                                    </option>
                                `).join('')}
                            </select>
                            
                            <!-- Indicateur de statut -->
                            <div class="mt-1 text-xs text-gray-500">
                                ${patientsList.length} patient(s) disponible(s)
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            galleryGrid.innerHTML = galleryHTML;
            console.log('✅ Galerie rendue avec', this.images.length, 'images et sélecteurs de patients');
            
        } catch (error) {
            console.error('❌ Erreur lors du rendu de la galerie:', error);
        }
    }

    async handleFileSelect(files) {
        if (!this.isInitialized) {
            this.showMessage('Veuillez d\'abord configurer Supabase', 'warning');
            return;
        }

        if (files.length === 0) return;

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showMessage('Aucun fichier image valide sélectionné', 'warning');
            return;
        }


        
        this.showUploadProgress(true);
        this.resetUploadProgress();

        let uploadedCount = 0;
        let errorCount = 0;

        for (const file of imageFiles) {
            try {
                await this.uploadImage(file);
                uploadedCount++;
                this.updateUploadProgress(file.name, 'success');
            } catch (error) {
                console.error(`❌ Erreur upload ${file.name}:`, error);
                errorCount++;
                this.updateUploadProgress(file.name, 'error', error.message);
            }
        }

        // Masquer le progrès après 3 secondes
        setTimeout(() => {
            this.showUploadProgress(false);
        }, 3000);
        
        // Attendre un peu pour que Supabase traite l'upload
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recharger les images
        await this.loadImages();
        
        // Forcer la synchronisation en temps réel
        this.forceRealtimeSync();
    }

    async uploadImage(file) {
        if (file.size > 10485760) { // 10MB
            throw new Error('Fichier trop volumineux (max 10MB)');
        }

        const fileName = `${Date.now()}_${file.name}`;
        let targetBucket = this.bucketName; // Default fallback
        
        try {
            // Use bucket manager to find optimal bucket if available
            if (this.bucketManager) {
                try {
                    targetBucket = await this.bucketManager.findOptimalBucket();
                    console.log(`📁 Using optimal bucket for upload: ${targetBucket}`);
                } catch (bucketError) {
                    console.warn('⚠️ Could not find optimal bucket, using default:', bucketError);
                    targetBucket = this.bucketName;
                }
            }

            // Utiliser la clé de service pour l'upload (bypass RLS)
            const { error } = await this.serviceSupabase.storage
                .from(targetBucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                // If upload fails due to bucket capacity, try to create new bucket and retry
                if (error.message.includes('storage') && this.bucketManager) {
                    console.log('🔄 Upload failed, attempting with new bucket...');
                    try {
                        const newBucket = await this.bucketManager.createOverflowBucket();
                        const { error: retryError } = await this.serviceSupabase.storage
                            .from(newBucket)
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: false
                            });
                        
                        if (retryError) {
                            throw new Error(retryError.message);
                        }
                        
                        console.log(`✅ Upload successful to new bucket: ${newBucket}`);
                        targetBucket = newBucket;
                    } catch (retryError) {
                        throw new Error(error.message);
                    }
                } else {
                    throw new Error(error.message);
                }
            }

            // Set timestamp for real-time sync
            this.lastChangeTimestamp = Date.now();
            
            // Update image_patient_associations table for real-time sync
            await this.updateImagePatientAssociation(fileName, this.currentPatientName, targetBucket);
            
            // Immediately update the gallery to show the new image
            await this.loadImages();
            this.forceRefreshDisplay();
            
            // Show success message with bucket info
            const bucketInfo = targetBucket !== this.bucketName ? ` (bucket: ${targetBucket})` : '';
            this.showMessage(`Image "${file.name}" uploadée avec succès${bucketInfo}.`, 'success');

            return fileName;
            
        } catch (error) {
            console.error(`❌ Erreur upload ${file.name}:`, error);
            throw error;
        }
    }

    async deleteImage(fileName, imageUrl) {
        if (!this.isInitialized) {
            this.showMessage('Veuillez d\'abord configurer Supabase', 'warning');
            return;
        }

        // Suppression immédiate sans confirmation
        try {
            this.showLoading(true);

            // Utiliser la clé de service pour la suppression
            const { error } = await this.serviceSupabase.storage
                .from(this.bucketName)
                .remove([fileName]);

            if (error) {
                throw new Error(`Erreur de suppression: ${error.message}`);
            }

            // Set timestamp for real-time sync
            this.lastChangeTimestamp = Date.now();

            // Remove from image_patient_associations table for real-time sync
            await this.removeImagePatientAssociation(fileName);

            // Immediately update the gallery to reflect the deletion
            await this.loadImages();
            this.forceRefreshDisplay();

            this.showMessage(`Image "${fileName}" supprimée avec succès.`, 'success');

        } catch (error) {
            console.error('❌ Erreur de suppression:', error);
            this.showMessage(`Erreur de suppression: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteSelectedImages() {
        const checkboxes = document.querySelectorAll('.image-checkbox:checked');
        
        if (checkboxes.length === 0) {
            this.showMessage('Aucune image sélectionnée', 'warning');
            return;
        }

        const fileNames = Array.from(checkboxes).map(cb => cb.dataset.filename).filter(name => name);
        
        if (fileNames.length === 0) {
            this.showMessage('Erreur: Noms de fichiers non trouvés', 'error');
            return;
        }
        
        console.log('🗑️ Suppression de:', fileNames);
        
        if (!confirm(`Voulez-vous vraiment supprimer ${fileNames.length} image(s) sélectionnée(s)?`)) {
            return;
        }

        try {
            this.showLoading(true);

            console.log('🔄 Suppression en cours...', fileNames);
            const { error } = await this.serviceSupabase.storage
                .from(this.bucketName)
                .remove(fileNames);

            if (error) {
                throw new Error(`Erreur de suppression: ${error.message}`);
            }

            // Set timestamp for real-time sync
            this.lastChangeTimestamp = Date.now();

            this.showMessage(`${fileNames.length} image(s) supprimée(s) avec succès.`, 'success');

            // Effacer la sélection et recharger une seule fois
            this.clearSelection();
            await this.loadImages();
            this.forceRefreshDisplay();

        } catch (error) {
            console.error('❌ Erreur de suppression en lot:', error);
            this.showMessage(`Erreur de suppression: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Navigation dans le visualiseur
    openImageViewer(imageUrl, imageName) {
        this.currentImageIndex = this.images.findIndex(img => img.url === imageUrl);
        if (this.currentImageIndex === -1) this.currentImageIndex = 0;
        
        this.displayCurrentImage();
        this.addViewerKeyboardListeners();
        this.addViewerButtonListeners();
        
        const viewer = document.getElementById('image-viewer');
        if (viewer) viewer.classList.remove('hidden');
        
        // Masquer tous les boutons de suppression
        this.hideDeleteButtons();
    }

    // Nouvelle méthode pour ouvrir le visualiseur par index (évite les problèmes d'URL)
    openImageViewerByIndex(index) {
        if (index >= 0 && index < this.images.length) {
            this.currentImageIndex = index;
            this.displayCurrentImage();
            this.addViewerKeyboardListeners();
            this.addViewerButtonListeners();
            
            // Initialiser le zoom
            this.initZoom();
            
            const viewer = document.getElementById('image-viewer');
            if (viewer) viewer.classList.remove('hidden');
            
            // Masquer tous les boutons de suppression
            this.hideDeleteButtons();
        }
    }

    displayCurrentImage() {
        if (this.currentImageIndex < 0 || this.currentImageIndex >= this.images.length) return;
        
        const image = this.images[this.currentImageIndex];
        const viewerImage = document.getElementById('viewer-image');
        const viewerCaption = document.getElementById('viewer-caption');
        const viewerCounter = document.getElementById('viewer-counter');
        
        if (viewerImage && viewerCaption && viewerCounter) {
            viewerImage.src = image.url;
            viewerImage.alt = image.name;
            
            // Afficher le nom du patient depuis les associations stockées
            const patientName = this.patientNames[image.name];
            
            if (patientName && patientName.trim()) {
                viewerCaption.textContent = `Patient: ${patientName}`;
            } else {
                viewerCaption.textContent = 'Patient: Non assigné';
            }
            
            viewerCounter.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
        }
    }

    nextImage() {
        console.log('➡️ nextImage appelé, index actuel:', this.currentImageIndex, 'total images:', this.images.length);
        
        if (this.currentImageIndex < this.images.length - 1) {
            this.currentImageIndex++;
            console.log('✅ Passage à l\'image suivante, nouvel index:', this.currentImageIndex);
            this.displayCurrentImage();
        } else {
            console.log('⚠️ Déjà à la dernière image, index:', this.currentImageIndex);
        }
    }

    previousImage() {
        console.log('⬅️ previousImage appelé, index actuel:', this.currentImageIndex, 'total images:', this.images.length);
        
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            console.log('✅ Passage à l\'image précédente, nouvel index:', this.currentImageIndex);
            this.displayCurrentImage();
        } else {
            console.log('⚠️ Déjà à la première image, index:', this.currentImageIndex);
        }
    }

    closeImageViewer() {
        const viewer = document.getElementById('image-viewer');
        if (viewer) {
            viewer.classList.add('hidden');
            if (this.currentKeydownHandler) {
                document.removeEventListener('keydown', this.currentKeydownHandler);
                this.currentKeydownHandler = null;
            }
        }
        
        // Remontrer tous les boutons de suppression
        this.showDeleteButtons();
    }
    
    // Masquer tous les boutons de suppression
    hideDeleteButtons() {
        try {
            const deleteButtons = document.querySelectorAll('.delete-btn');
            deleteButtons.forEach(btn => {
                btn.style.display = 'none';
                btn.style.visibility = 'hidden';
                btn.style.opacity = '0';
                btn.style.pointerEvents = 'none';
                btn.style.zIndex = '-1';
            });
            console.log('✅ Boutons de suppression masqués');
        } catch (error) {
            console.error('❌ Erreur masquage boutons suppression:', error);
        }
    }
    
    // Remontrer tous les boutons de suppression
    showDeleteButtons() {
        try {
            const deleteButtons = document.querySelectorAll('.delete-btn');
            deleteButtons.forEach(btn => {
                btn.style.display = '';
                btn.style.visibility = '';
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
                btn.style.zIndex = '';
            });
            console.log('✅ Boutons de suppression remontrés');
        } catch (error) {
            console.error('❌ Erreur remontrage boutons suppression:', error);
        }
    }

    addViewerKeyboardListeners() {
        const handleKeyDown = (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextImage();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.closeImageViewer();
                    break;
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        this.currentKeydownHandler = handleKeyDown;
    }

    addViewerButtonListeners() {
        const prevBtn = document.getElementById('prev-image');
        const nextBtn = document.getElementById('next-image');
        const closeBtn = document.getElementById('close-viewer');
        
        console.log('🔍 Boutons de navigation trouvés:', { prevBtn: !!prevBtn, nextBtn: !!nextBtn, closeBtn: !!closeBtn });
        
        if (prevBtn) {
            // Supprimer les anciens event listeners pour éviter les doublons
            prevBtn.replaceWith(prevBtn.cloneNode(true));
            const newPrevBtn = document.getElementById('prev-image');
            newPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('⬅️ Bouton précédent cliqué, index actuel:', this.currentImageIndex);
                this.previousImage();
            });
            console.log('✅ Event listener attaché au bouton précédent');
        } else {
            console.error('❌ Bouton précédent non trouvé');
        }
        
        if (nextBtn) {
            // Supprimer les anciens event listeners pour éviter les doublons
            nextBtn.replaceWith(nextBtn.cloneNode(true));
            const newNextBtn = document.getElementById('next-image');
            newNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('➡️ Bouton suivant cliqué, index actuel:', this.currentImageIndex);
                this.nextImage();
            });
            console.log('✅ Event listener attaché au bouton suivant');
        } else {
            console.error('❌ Bouton suivant non trouvé');
        }
        
        if (closeBtn) {
            // Supprimer les anciens event listeners pour éviter les doublons
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = document.getElementById('close-viewer');
            newCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('❌ Bouton fermer cliqué');
                this.closeImageViewer();
            });
            console.log('✅ Event listener attaché au bouton fermer');
        } else {
            console.error('❌ Bouton fermer non trouvé');
        }
    }

    // Gestion de la sélection
    updateSelection() {
        const checkboxes = document.querySelectorAll('.image-checkbox:checked');
        const bulkActions = document.getElementById('bulk-actions');
        const deleteCount = document.getElementById('delete-count');
        
        if (checkboxes.length > 0) {
            bulkActions?.classList.remove('hidden');
            if (deleteCount) {
                deleteCount.textContent = checkboxes.length;
            }
        } else {
            bulkActions?.classList.add('hidden');
        }
    }

    clearSelection() {
        const checkboxes = document.querySelectorAll('.image-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateSelection();
    }

    // Configuration et informations
    openInfoModal() {
        const modal = document.getElementById('info-modal');
        if (modal) {
            this.populateInfoFields();
            modal.classList.remove('hidden');
        }
    }

    closeInfoModal() {
        const modal = document.getElementById('info-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    populateInfoFields() {
        const fields = {
            'info-supabase-url': this.supabaseUrl,
            'info-bucket-name': this.bucketName,
            'info-supabase-anon-key': this.supabaseAnonKey,
            'info-supabase-service-key': this.supabaseServiceKey
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || 'Non configuré';
            }
        });
    }

    async copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        try {
            await navigator.clipboard.writeText(element.value);
            this.showMessage('Copié dans le presse-papiers !', 'success');
        } catch (err) {
            element.select();
            document.execCommand('copy');
            this.showMessage('Copié dans le presse-papiers !', 'success');
        }
    }

    // Gestion de l'interface
    setupEventListeners() {
        // Boutons principaux
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadImages());
        document.getElementById('info-btn')?.addEventListener('click', () => this.openInfoModal());
        
        // Modal d'information
        document.getElementById('close-info')?.addEventListener('click', () => this.closeInfoModal());
        document.getElementById('close-info-btn')?.addEventListener('click', () => this.closeInfoModal());
        
        // Actions en lot
        document.getElementById('delete-selected-btn')?.addEventListener('click', () => this.deleteSelectedImages());
        document.getElementById('clear-selection-btn')?.addEventListener('click', () => this.clearSelection());
        
        // Tri
        document.getElementById('sort-select')?.addEventListener('change', (e) => this.sortImages(e.target.value));
        
        // Upload
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handleFileSelect(e.dataTransfer.files);
            });
        }
        
        // Visualiseur
        document.getElementById('close-viewer')?.addEventListener('click', () => this.closeImageViewer());
        
        // Modals
        document.getElementById('info-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'info-modal') this.closeInfoModal();
        });
    }

    // Utilitaires
    showLoading(show) {
        const loadingState = document.getElementById('loading-state');
        
        if (loadingState) {
            loadingState.classList.toggle('hidden', !show);
    
        }
        
        // Ne pas masquer la galerie ou l'état vide ici - laissez renderGallery gérer cela
        // La galerie doit être visible même pendant le chargement si elle contient des images
    }

    // Récupérer la liste des patients depuis staffTable
    async loadPatientsList() {
        try {
    
            
            // Test de connexion d'abord

            const { data: testData, error: testError } = await this.supabase
                .from('staffTable')
                .select('*')
                .limit(1);
            
            if (testError) {
                console.error('❌ Erreur test connexion staffTable:', testError);
                throw testError;
            }
            

            
            // Vérifier d'abord la structure de la table

            const { data: structureData, error: structureError } = await this.supabase
                .from('staffTable')
                .select('*')
                .limit(3);
            
            if (structureError) {
                console.error('❌ Erreur vérification structure:', structureError);
                throw structureError;
            }
            

            
            // Identifier les colonnes disponibles
            if (structureData && structureData.length > 0) {
                const columns = Object.keys(structureData[0]);

                
                // Utiliser directement la colonne Nom_Prénom connue
                const selectColumns = 'No, Nom_Prénom';

                
                // Récupérer la liste avec les bonnes colonnes
                const { data, error } = await this.supabase
                    .from('staffTable')
                    .select(selectColumns)
                    .order('Nom_Prénom', { ascending: true });
                
                if (error) {
                    console.error('❌ Erreur récupération finale:', error);
                    throw error;
                }
                

                return data || [];
            } else {

                return [];
            }
            
        } catch (error) {
            console.error('❌ Erreur chargement liste patients:', error);
            console.error('Détails de l\'erreur:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return [];
        }
    }

    // Sauvegarder le nom du patient dans Supabase pour la synchronisation
    async savePatientName(imageName, patientName) {
        try {
            if (patientName.trim()) {
                // Sauvegarder dans Supabase pour la synchronisation en temps réel
                const { error } = await this.supabase
                    .from('image_patient_associations')
                    .upsert({
                        image_name: imageName,
                        patient_name: patientName,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'image_name'
                    });

                if (error) {
                    console.error('❌ Erreur sauvegarde association patient:', error);
                    // Fallback vers localStorage en cas d'erreur
                    this.savePatientNameToLocalStorage(imageName, patientName);
                } else {
                    console.log('✅ Association patient sauvegardée dans Supabase:', imageName, '→', patientName);
                    
                    // Mettre à jour l'état local
                    this.patientNames[imageName] = patientName;
                    
                    // Mettre à jour l'affichage du patient sélectionné
                    this.updateSelectedPatientDisplay(imageName, patientName);
                    
                    this.showMessage(`✅ Image associée au patient: ${patientName}`, 'success');
                }
            } else {
                // Supprimer l'association
                const { error } = await this.supabase
                    .from('image_patient_associations')
                    .delete()
                    .eq('image_name', imageName);

                if (error) {
                    console.error('❌ Erreur suppression association patient:', error);
                    // Fallback vers localStorage en cas d'erreur
                    this.savePatientNameToLocalStorage(imageName, '');
                } else {
                    console.log('✅ Association patient supprimée de Supabase:', imageName);
                    
                    // Mettre à jour l'état local
                    delete this.patientNames[imageName];
                    
                    // Mettre à jour l'affichage
                    this.updateSelectedPatientDisplay(imageName, '');
                    
                    this.showMessage(`🔄 Association patient supprimée`, 'info');
                }
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde association patient:', error);
            // Fallback vers localStorage en cas d'erreur
            this.savePatientNameToLocalStorage(imageName, patientName);
        }
    }

    // Fallback vers localStorage en cas d'erreur Supabase
    savePatientNameToLocalStorage(imageName, patientName) {
        try {
            if (patientName.trim()) {
                const patientNames = JSON.parse(localStorage.getItem('patientNames') || '{}');
                patientNames[imageName] = patientName;
                localStorage.setItem('patientNames', JSON.stringify(patientNames));
                
                // Mettre à jour l'état local
                this.patientNames[imageName] = patientName;
                
                this.updateSelectedPatientDisplay(imageName, patientName);
                this.showMessage(`✅ Image associée au patient (local): ${patientName}`, 'success');
            } else {
                const patientNames = JSON.parse(localStorage.getItem('patientNames') || '{}');
                delete patientNames[imageName];
                localStorage.setItem('patientNames', JSON.stringify(patientNames));
                
                // Mettre à jour l'état local
                delete this.patientNames[imageName];
                
                this.updateSelectedPatientDisplay(imageName, '');
                this.showMessage(`🔄 Association patient supprimée (local)`, 'info');
            }
        } catch (error) {
            console.error('❌ Erreur fallback localStorage:', error);
        }
    }
    
    // Mettre à jour l'affichage du patient sélectionné
    updateSelectedPatientDisplay(imageName, patientName) {
        const selectedPatientDiv = document.getElementById(`selected-patient-${imageName}`);
        if (selectedPatientDiv) {
            if (patientName) {
                selectedPatientDiv.innerHTML = `<strong>Patient actuel:</strong> ${patientName}`;
                selectedPatientDiv.classList.remove('hidden');
                selectedPatientDiv.className = 'mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800';
            } else {
                selectedPatientDiv.classList.add('hidden');
            }
        }
    }

    // Charger les noms des patients depuis Supabase pour la synchronisation
    async loadPatientNames() {
        try {
            // Essayer de charger depuis Supabase d'abord
            const { data: associations, error } = await this.supabase
                .from('image_patient_associations')
                .select('image_name, patient_name');

            if (error) {
                console.error('❌ Erreur chargement associations Supabase:', error);
                // Fallback vers localStorage
                return this.loadPatientNamesFromLocalStorage();
            }

            if (associations && associations.length > 0) {
                // Convertir en format {imageName: patientName}
                const patientNames = {};
                associations.forEach(assoc => {
                    patientNames[assoc.image_name] = assoc.patient_name;
                });
                
                console.log('✅ Associations patients chargées depuis Supabase:', Object.keys(patientNames).length);
                return patientNames;
            } else {
                console.log('ℹ️ Aucune association patient trouvée dans Supabase');
                // Fallback vers localStorage
                return this.loadPatientNamesFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ Erreur chargement associations patients:', error);
            // Fallback vers localStorage
            return this.loadPatientNamesFromLocalStorage();
        }
    }

    // Fallback vers localStorage en cas d'erreur Supabase
    loadPatientNamesFromLocalStorage() {
        try {
            const patientNames = JSON.parse(localStorage.getItem('patientNames') || '{}');
            console.log('ℹ️ Associations patients chargées depuis localStorage (fallback)');
            return patientNames;
        } catch (error) {
            console.error('❌ Erreur chargement localStorage:', error);
            return {};
        }
    }

    // Tester la validité des URLs d'images
    async testImageUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
            // Timeout après 5 secondes
            setTimeout(() => resolve(false), 5000);
        });
    }

    // Valider toutes les URLs d'images
    async validateImageUrls() {

        for (let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
            const isValid = await this.testImageUrl(image.url);

            if (!isValid) {
                console.warn(`⚠️ URL invalide pour ${image.name}:`, image.url);
            }
        }
    }

    updateImageCount() {
        const countSpan = document.getElementById('image-count');
        if (countSpan) {
            countSpan.textContent = `${this.images.length} image${this.images.length > 1 ? 's' : ''}`;
        }
    }

    sortImages(sortBy) {
        switch (sortBy) {
            case 'newest':
                this.images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                this.images.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'name':
                this.images.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'size':
                this.images.sort((a, b) => b.size - a.size);
                break;
        }
        
        this.renderGallery();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Upload progress
    showUploadProgress(show) {
        const progressDiv = document.getElementById('upload-progress');
        if (progressDiv) {
            progressDiv.classList.toggle('hidden', !show);
        }
    }

    resetUploadProgress() {
        const progressList = document.getElementById('progress-list');
        if (progressList) {
            progressList.innerHTML = '';
        }
    }

    updateUploadProgress(fileName, status, errorMessage = '') {
        const progressList = document.getElementById('progress-list');
        if (!progressList) return;

        const progressItem = document.createElement('div');
        progressItem.className = 'flex items-center justify-between p-2 rounded border';
        
        if (status === 'success') {
            progressItem.className += ' border-green-200 bg-green-50';
            progressItem.innerHTML = `
                <span class="text-sm text-green-700">${fileName}</span>
                <i class="fas fa-check text-green-600"></i>
            `;
        } else {
            progressItem.className += ' border-red-200 bg-red-50';
            progressItem.innerHTML = `
                <span class="text-sm text-red-700">${fileName}</span>
                <div class="flex items-center space-x-2">
                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                    <span class="text-xs text-red-600">${errorMessage}</span>
                </div>
            `;
        }

        progressList.appendChild(progressItem);
    }

    showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    // ===== FONCTIONS DE ZOOM =====
    
    // Variables de zoom et pan
    currentZoom = 1;
    minZoom = 0.1;
    maxZoom = 5;
    panX = 0;
    panY = 0;
    
    // Variables pour le pan avec clic droit
    isPanning = false;
    lastPanX = 0;
    lastPanY = 0;
    
    // Initialiser le zoom
    initZoom() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();
        this.setupZoomEventListeners();
        this.setupPanEventListeners();
    }
    
    // Zoom in (5% increment)
    zoomIn() {
        if (this.currentZoom < this.maxZoom) {
            this.currentZoom = Math.min(this.maxZoom, this.currentZoom + 0.05);
            this.applyZoom();
        }
    }
    
    // Zoom out (5% decrement)
    zoomOut() {
        if (this.currentZoom > this.minZoom) {
            this.currentZoom = Math.max(this.minZoom, this.currentZoom - 0.05);
            this.applyZoom();
        }
    }
    
    // Reset zoom
    resetZoom() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyZoom();
    }
    
    // Appliquer le zoom et pan (version ultra-fluide avec hardware acceleration)
    applyZoom() {
        const viewerImage = document.getElementById('viewer-image');
        const zoomLevel = document.getElementById('zoom-level');
        
        if (viewerImage) {
            // Utiliser translate3d pour l'accélération hardware
            viewerImage.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.currentZoom})`;
            viewerImage.style.transformOrigin = 'center center';
            
            // Optimisations pour la fluidité
            if (!this.isPanning) {
                viewerImage.style.willChange = 'auto'; // Économiser les ressources quand pas en mouvement
            }
        }
        
        if (zoomLevel) {
            zoomLevel.textContent = `Zoom: ${Math.round(this.currentZoom * 100)}%`;
        }
    }
    
    // Mettre à jour l'affichage du zoom
    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `Zoom: ${Math.round(this.currentZoom * 100)}%`;
        }
    }
    
    // Configurer les événements de zoom
    setupZoomEventListeners() {
        // Boutons de zoom
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomResetBtn = document.getElementById('zoom-reset-btn');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => this.resetZoom());
        }
        
        // Zoom avec molette de souris
        const viewerImage = document.getElementById('viewer-image');
        if (viewerImage) {
            viewerImage.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            });
        }
        
        // Zoom avec touches + et -
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('image-viewer') && !document.getElementById('image-viewer').classList.contains('hidden')) {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.zoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.resetZoom();
                }
            }
        });
        
        // Zoom avec pincement sur mobile
        let initialDistance = 0;
        let initialZoom = 1;
        
        viewerImage.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialZoom = this.currentZoom;
            }
        });
        
        viewerImage.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                if (initialDistance > 0) {
                    const scale = currentDistance / initialDistance;
                    this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, initialZoom * scale));
                    this.applyZoom();
                }
            }
        });
    }
    
    // Configurer les événements de pan (déplacement avec clic droit)
    setupPanEventListeners() {
        const viewerImage = document.getElementById('viewer-image');
        const imageViewer = document.getElementById('image-viewer');
        
        if (!viewerImage || !imageViewer) {
            console.warn('⚠️ Pan setup failed: missing viewer elements');
            return;
        }
        
        console.log('🔧 Setting up pan event listeners...');
        
        // Désactiver le menu contextuel sur l'image
        viewerImage.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Variables pour le pan
        let startX = 0;
        let startY = 0;
        let startPanX = 0;
        let startPanY = 0;
        let cachedViewerImage = null;
        
        // Démarrer le pan avec clic droit, Ctrl+clic gauche, OU simple clic gauche  
        viewerImage.addEventListener('mousedown', (e) => {
            if (e.button === 2 || (e.button === 0 && e.ctrlKey) || e.button === 0) { // Clic droit, Ctrl+clic gauche, OU simple clic gauche
                e.preventDefault();
                e.stopPropagation();
                
                // Démarrage immédiat du pan avec optimisations hardware
                this.isPanning = true;
                cachedViewerImage = viewerImage; // Cache l'élément image
                startX = e.clientX;
                startY = e.clientY;
                startPanX = this.panX;
                startPanY = this.panY;
                
                // Optimisations pour un panning ultra-fluide
                cachedViewerImage.style.willChange = 'transform';
                cachedViewerImage.style.pointerEvents = 'none';
                
                // Feedback visuel immédiat
                viewerImage.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
                document.body.style.cursor = 'grabbing';
            }
        }, { passive: false });
        
        // Continuer le pan pendant le mouvement (ultra-optimisé pour fluidité)
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning && cachedViewerImage) {
                e.preventDefault();
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                this.panX = startPanX + deltaX;
                this.panY = startPanY + deltaY;
                
                // Application avec translate3d pour accélération hardware maximale
                cachedViewerImage.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.currentZoom})`;
            }
        }, { passive: false });
        
        // Arrêter le pan
        document.addEventListener('mouseup', (e) => {
            if (this.isPanning && (e.button === 2 || e.button === 0)) {
                console.log('🛑 Stopping pan');
                this.isPanning = false;
                
                // Nettoyage des optimisations
                if (cachedViewerImage) {
                    cachedViewerImage.style.willChange = 'auto';
                    cachedViewerImage.style.pointerEvents = 'auto';
                }
                cachedViewerImage = null; // Reset du cache
                
                viewerImage.style.cursor = 'grab';
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        });
        
        // Pan avec touches fléchées (bonus)
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('image-viewer') && !document.getElementById('image-viewer').classList.contains('hidden')) {
                const panSpeed = 50;
                let moved = false;
                
                switch(e.key) {
                    case 'ArrowLeft':
                        this.panX += panSpeed;
                        moved = true;
                        break;
                    case 'ArrowRight':
                        this.panX -= panSpeed;
                        moved = true;
                        break;
                    case 'ArrowUp':
                        this.panY += panSpeed;
                        moved = true;
                        break;
                    case 'ArrowDown':
                        this.panY -= panSpeed;
                        moved = true;
                        break;
                }
                
                if (moved) {
                    e.preventDefault();
                    this.applyZoom();
                }
            }
        });
        
        // Pan avec molette + shift (bonus pour déplacement horizontal)
        viewerImage.addEventListener('wheel', (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                const panSpeed = 30;
                this.panX -= e.deltaY > 0 ? panSpeed : -panSpeed;
                this.applyZoom();
            }
        });
        
        // Support du pan sur mobile (touch)
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartPanX = 0;
        let touchStartPanY = 0;
        let isTouchPanning = false;
        
        viewerImage.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartPanX = this.panX;
                touchStartPanY = this.panY;
                isTouchPanning = true;
            }
        });
        
        viewerImage.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isTouchPanning) {
                e.preventDefault();
                
                const deltaX = e.touches[0].clientX - touchStartX;
                const deltaY = e.touches[0].clientY - touchStartY;
                
                this.panX = touchStartPanX + deltaX;
                this.panY = touchStartPanY + deltaY;
                
                this.applyZoom();
            }
        });
        
        viewerImage.addEventListener('touchend', () => {
            isTouchPanning = false;
        });
        
        // Définir le curseur par défaut et styles de base
        viewerImage.style.cursor = 'grab';
        viewerImage.style.userSelect = 'none'; // Empêcher la sélection de l'image
    }
    
    // Initialiser le filtre par patient
    async initializePatientFilter() {
        try {
            const patients = await this.loadPatientsList();
            const patientFilter = document.getElementById('patient-filter');
            
            if (patientFilter && patients.length > 0) {
                // Vider les options existantes sauf "Tous les patients"
                patientFilter.innerHTML = '<option value="">Tous les patients</option>';
                
                // Ajouter les options pour chaque patient
                patients.forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.Nom_Prénom;
                    option.textContent = patient.Nom_Prénom;
                    patientFilter.appendChild(option);
                });
                
                // Ajouter l'événement de filtrage
                patientFilter.addEventListener('change', (e) => {
                    this.filterImagesByPatient(e.target.value);
                });
                
                console.log('✅ Filtre par patient initialisé avec', patients.length, 'patients');
            }
        } catch (error) {
            console.error('❌ Erreur initialisation filtre patient:', error);
        }
    }
    
    // Filtrer les images par patient
    filterImagesByPatient(patientName) {
        if (!patientName) {
            // Afficher toutes les images
            this.displayImages(this.images);
            return;
        }
        
        // Filtrer les images par nom de patient
        const patientNames = this.loadPatientNames();
        const filteredImages = this.images.filter(image => {
            return patientNames[image.name] === patientName;
        });
        
        // Afficher les images filtrées
        this.displayImages(filteredImages);
        
        // Mettre à jour le compteur
        this.updateImageCount();
        
        console.log(`🔍 Images filtrées pour ${patientName}:`, filteredImages.length);
    }

    // Cleanup real-time subscription
    cleanupRealtimeSync() {
        try {
            if (this.realtimeSubscription) {
                this.realtimeSubscription.unsubscribe();
                this.realtimeSubscription = null;
                console.log('✅ Gallery real-time sync cleaned up');
            }
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
                console.log('✅ Intelligent polling cleaned up');
            }
        } catch (error) {
            console.error('❌ Error cleaning up gallery real-time sync:', error);
        }
    }

    // Initialize scroll indicators for button container
    initScrollIndicators() {
        const scrollContainer = document.getElementById('button-scroll-container');
        const leftIndicator = document.getElementById('left-scroll-indicator');
        const rightIndicator = document.getElementById('right-scroll-indicator');
        const scrollIndicators = document.querySelector('.scroll-indicators');
        
        if (!scrollContainer || !leftIndicator || !rightIndicator || !scrollIndicators) {
            console.log('⚠️ Scroll indicators elements not found');
            return;
        }
        
        // Function to update scroll indicators visibility
        const updateScrollIndicators = () => {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
            const maxScrollLeft = scrollWidth - clientWidth;
            
            // Show/hide left indicator
            if (scrollLeft > 10) {
                scrollIndicators.classList.add('show-left');
            } else {
                scrollIndicators.classList.remove('show-left');
            }
            
            // Show/hide right indicator
            if (scrollLeft < maxScrollLeft - 10) {
                scrollIndicators.classList.add('show-right');
            } else {
                scrollIndicators.classList.remove('show-right');
            }
        };
        
        // Function to scroll smoothly
        const smoothScroll = (direction) => {
            const scrollAmount = 200;
            const targetScroll = direction === 'left' 
                ? Math.max(0, scrollContainer.scrollLeft - scrollAmount)
                : Math.min(scrollContainer.scrollWidth - scrollContainer.clientWidth, scrollContainer.scrollLeft + scrollAmount);
            
            scrollContainer.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        };
        
        // Add event listeners
        leftIndicator.addEventListener('click', () => smoothScroll('left'));
        rightIndicator.addEventListener('click', () => smoothScroll('right'));
        
        // Update indicators on scroll
        scrollContainer.addEventListener('scroll', updateScrollIndicators);
        
        // Update indicators on resize
        window.addEventListener('resize', () => {
            setTimeout(updateScrollIndicators, 100);
        });
        
        // Initial update
        setTimeout(updateScrollIndicators, 100);
        
        console.log('✅ Scroll indicators initialized');
    }

    // ===== BUCKET MANAGEMENT METHODS =====

    /**
     * Manually trigger cleanup of old images
     */
    async manualCleanup() {
        if (!this.bucketManager) {
            this.showMessage('⚠️ Gestion de bucket non disponible', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            const deletedCount = await this.bucketManager.forceCleanup();
            
            if (deletedCount > 0) {
                this.showMessage(`🧹 ${deletedCount} anciennes images supprimées`, 'success');
                // Reload images to reflect changes
                await this.loadImages();
            } else {
                this.showMessage('ℹ️ Aucune image ancienne à supprimer', 'info');
            }
        } catch (error) {
            console.error('❌ Error during manual cleanup:', error);
            this.showMessage(`❌ Erreur de nettoyage: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Show bucket usage statistics
     */
    async showBucketStatistics() {
        if (!this.bucketManager) {
            this.showMessage('⚠️ Gestion de bucket non disponible', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            const stats = await this.bucketManager.getBucketStatistics();
            
            if (stats) {
                const totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
                const bucketDetails = stats.buckets.map(bucket => 
                    `• ${bucket.bucketName}: ${bucket.totalFiles} images, ${(bucket.totalSize / 1024 / 1024).toFixed(2)} MB (${bucket.usagePercent}%)`
                ).join('\n');

                const statsMessage = `
📊 Statistiques des buckets:

${bucketDetails}

📈 Total: ${stats.totalFiles} images
💾 Taille totale: ${totalSizeMB} MB
📊 Utilisation moyenne: ${stats.averageUsage}%
                `.trim();

                // Create a modal or use console for now
                console.log(statsMessage);
                this.showMessage(`📊 Statistiques: ${stats.buckets.length} bucket(s), ${stats.totalFiles} images, ${totalSizeMB} MB`, 'info');

                // If there's a modal available, show detailed stats there
                this.showDetailedStats(stats);
            } else {
                this.showMessage('❌ Impossible de récupérer les statistiques', 'error');
            }
        } catch (error) {
            console.error('❌ Error getting bucket statistics:', error);
            this.showMessage(`❌ Erreur statistiques: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Show detailed statistics in a modal or dedicated area
     */
    showDetailedStats(stats) {
        try {
            // Try to find a stats container or create one
            let statsContainer = document.getElementById('bucket-stats-container');
            
            if (!statsContainer) {
                // Create a temporary stats display
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 left-4 p-6 rounded-lg shadow-lg z-50 max-w-md bg-white border';
                toast.style.maxHeight = '80vh';
                toast.style.overflow = 'auto';
                
                const totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
                
                toast.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">📊 Statistiques des Buckets</h3>
                        <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div class="space-y-3 text-sm">
                        <div class="bg-blue-50 p-3 rounded">
                            <div class="font-medium">Résumé Global</div>
                            <div>• ${stats.buckets.length} bucket(s) actif(s)</div>
                            <div>• ${stats.totalFiles} images au total</div>
                            <div>• ${totalSizeMB} MB utilisés</div>
                            <div>• ${stats.averageUsage}% utilisation moyenne</div>
                        </div>
                        <div>
                            <div class="font-medium mb-2">Détail par Bucket:</div>
                            ${stats.buckets.map(bucket => `
                                <div class="bg-gray-50 p-2 rounded mb-2">
                                    <div class="font-medium text-xs">${bucket.bucketName}</div>
                                    <div class="text-xs text-gray-600">
                                        ${bucket.totalFiles} images • ${(bucket.totalSize / 1024 / 1024).toFixed(2)} MB
                                        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                            <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${Math.min(bucket.usagePercent, 100)}%"></div>
                                        </div>
                                        <span class="text-xs">${bucket.usagePercent}% utilisé</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                document.body.appendChild(toast);
                
                // Auto-remove after 15 seconds
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 15000);
            }
        } catch (error) {
            console.warn('⚠️ Could not show detailed stats UI:', error);
        }
    }

    // Update image_patient_associations table for real-time sync
    async updateImagePatientAssociation(fileName, patientName, bucketName) {
        try {
            if (!this.serviceSupabase || !patientName) {
                console.log('⚠️ Cannot update association - missing Supabase or patient name');
                return;
            }

            const { error } = await this.serviceSupabase
                .from('image_patient_associations')
                .insert({
                    image_name: fileName,
                    patient_name: patientName,
                    bucket_name: bucketName || this.bucketName,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('❌ Error updating image_patient_associations:', error);
            } else {
                console.log('✅ Image-patient association updated for real-time sync');
            }
        } catch (error) {
            console.error('❌ Error in updateImagePatientAssociation:', error);
        }
    }

    // Remove image_patient_associations table entry for real-time sync
    async removeImagePatientAssociation(fileName) {
        try {
            if (!this.serviceSupabase) {
                console.log('⚠️ Cannot remove association - missing Supabase');
                return;
            }

            const { error } = await this.serviceSupabase
                .from('image_patient_associations')
                .delete()
                .eq('image_name', fileName);

            if (error) {
                console.error('❌ Error removing image_patient_associations:', error);
            } else {
                console.log('✅ Image-patient association removed for real-time sync');
            }
        } catch (error) {
            console.error('❌ Error in removeImagePatientAssociation:', error);
        }
    }
}

// Initialisation quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    window.simpleGallery = new SimpleGallery();
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.simpleGallery) {
            window.simpleGallery.cleanupRealtimeSync();
        }
    });
});

// Export pour usage module
export default SimpleGallery;
