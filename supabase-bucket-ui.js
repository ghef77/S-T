// Supabase Bucket Configuration UI
// Interface utilisateur pour configurer le bucket Supabase

class SupabaseBucketUI {
    constructor() {
        this.bucketName = '';
        this.serviceRoleKey = '';
        this.loadSavedConfig();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Bouton de fermeture
        const closeBtn = document.getElementById('close-supabase-bucket-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Bouton de test
        const testBtn = document.getElementById('test-supabase-connection');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testConnection());
        }

        // Bouton de sauvegarde
        const saveBtn = document.getElementById('save-supabase-config');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfig());
        }

        // Bouton de vérification d'état
        const statusBtn = document.getElementById('check-supabase-status');
        if (statusBtn) {
            statusBtn.addEventListener('click', () => this.checkSupabaseStatus());
        }

        // Bouton de vérification de qualité des images
        const qualityBtn = document.getElementById('check-image-quality');
        if (qualityBtn) {
            qualityBtn.addEventListener('click', () => this.checkImageQuality());
        }
    }

    loadSavedConfig() {
        this.bucketName = localStorage.getItem('supabaseBucketName') || '';
        this.serviceRoleKey = localStorage.getItem('supabaseServiceRoleKey') || '';
        
        // Charger dans les champs
        const bucketInput = document.getElementById('bucket-name');
        const keyInput = document.getElementById('service-role-key');
        
        if (bucketInput) bucketInput.value = this.bucketName;
        if (keyInput) keyInput.value = this.serviceRoleKey;
    }

    openModal() {
        const modal = document.getElementById('supabase-bucket-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.loadSavedConfig(); // Recharger la config
        }
    }

    closeModal() {
        const modal = document.getElementById('supabase-bucket-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async testConnection() {
        try {
            const statusDiv = document.getElementById('connection-status');
            if (statusDiv) {
                statusDiv.innerHTML = '<div class="text-blue-600"><i class="fa-solid fa-spinner fa-spin"></i> Test de connexion...</div>';
            }

            // Récupérer les valeurs des champs
            const bucketInput = document.getElementById('bucket-name');
            const keyInput = document.getElementById('service-role-key');
            
            if (!bucketInput || !keyInput) {
                throw new Error('Champs de configuration non trouvés');
            }

            const bucketName = bucketInput.value.trim();
            const serviceRoleKey = keyInput.value.trim();

            if (!bucketName || !serviceRoleKey) {
                throw new Error('Veuillez remplir tous les champs');
            }

            console.log('🧪 Test de connexion avec:');
            console.log('  - Bucket:', bucketName);
            console.log('  - Clé (début):', serviceRoleKey.substring(0, 20) + '...');
            console.log('  - URL Supabase:', window.supabase?.supabaseUrl || 'Non disponible');

            // Tester la connexion avec la nouvelle clé
            const result = await this.testSupabaseConnection(bucketName, serviceRoleKey);
            
            if (result.success) {
                if (statusDiv) {
                    statusDiv.innerHTML = '<div class="text-green-600"><i class="fa-solid fa-check-circle"></i> Connexion réussie !</div>';
                }
                this.showBucketInfo(result.bucketInfo);
                console.log('🎉 Test de connexion réussi !');
            } else {
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="text-red-600"><i class="fa-solid fa-exclamation-triangle"></i> Échec: ${result.error}</div>`;
                }
                console.error('❌ Test de connexion échoué:', result.error);
            }
        } catch (error) {
            console.error('❌ Erreur lors du test de connexion:', error);
            const statusDiv = document.getElementById('connection-status');
            if (statusDiv) {
                statusDiv.innerHTML = `<div class="text-red-600"><i class="fa-solid fa-exclamation-triangle"></i> Erreur: ${error.message}</div>`;
            }
        }
    }

    async testSupabaseConnection(bucketName, serviceRoleKey) {
        try {
            console.log('🧪 Test de connexion Supabase (via client temporaire)...');
            
            // Utiliser l'URL de votre projet (sans le @ au début)
            let supabaseUrl = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
            
            // Créer un client Supabase temporaire avec la clé de service
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            const supabase = createClient(supabaseUrl, serviceRoleKey);
            
            console.log('✅ Client Supabase temporaire créé pour le test.');
            
            // Tester la connexion en listant les buckets
            console.log('🔍 Test d\'accès au storage...');
            const { data: buckets, error } = await supabase.storage.listBuckets();
            
            if (error) {
                throw new Error(`Erreur d'accès au storage: ${error.message}`);
            }

            console.log('✅ Connexion Supabase établie, buckets disponibles:', buckets);

            // Vérifier si le bucket existe
            const bucketExists = buckets.some(bucket => bucket.name === bucketName);
            
            if (!bucketExists) {
                console.log('🆕 Création du bucket:', bucketName);
                // Créer le bucket s'il n'existe pas
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: true,
                    allowedMimeTypes: ['image/*'],
                    fileSizeLimit: 52428800 // 50MB
                });
                
                if (createError) {
                    throw new Error(`Erreur création bucket: ${createError.message}`);
                }
                console.log('✅ Bucket créé avec succès');
            } else {
                console.log('✅ Bucket existe déjà:', bucketName);
            }

            // Tester l'upload d'un fichier de test (maintenant une image)
            const testFileBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='; // Petit GIF transparent
            const testFileName = 'test-connection.gif';
            const testFileType = 'image/gif';

            const testFile = new File([await (await fetch(testFileBase64)).blob()], testFileName, { type: testFileType });

            console.log('🧪 Test d\'upload d\'un fichier image...');
            
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(testFileName, testFile);
            
            if (uploadError) {
                throw new Error(`Erreur upload test: ${uploadError.message}`);
            }
            console.log('✅ Upload de test réussi');

            // Supprimer le fichier de test
            await supabase.storage.from(bucketName).remove([testFileName]);
            console.log('✅ Fichier de test supprimé');

            return {
                success: true,
                bucketInfo: {
                    name: bucketName,
                    exists: true,
                    public: true
                }
            };

        } catch (error) {
            console.error('❌ Erreur détaillée du test temporaire:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    saveConfig() {
        const bucketInput = document.getElementById('bucket-name');
        const keyInput = document.getElementById('service-role-key');
        
        if (!bucketInput || !keyInput) {
            alert('Champs de configuration non trouvés');
            return;
        }

        const bucketName = bucketInput.value.trim();
        const serviceRoleKey = keyInput.value.trim();

        if (!bucketName || !serviceRoleKey) {
            alert('Veuillez remplir tous les champs');
            return;
        }

        // Sauvegarder dans localStorage
        this.bucketName = bucketName;
        this.serviceRoleKey = serviceRoleKey;
        localStorage.setItem('supabaseBucketName', bucketName);
        localStorage.setItem('supabaseServiceRoleKey', serviceRoleKey);

        // Réinitialiser Supabase Image Sync avec la nouvelle configuration
        if (window.supabaseImageSync) {
            window.supabaseImageSync.reinitialize(bucketName, serviceRoleKey);
        }

        // Afficher le succès
        const statusDiv = document.getElementById('connection-status');
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="text-green-600"><i class="fa-solid fa-check-circle"></i> Configuration sauvegardée !</div>';
        }

        console.log('✅ Configuration Supabase sauvegardée:', { bucketName, serviceRoleKey: '***' });
    }

    // Vérifier l'état Supabase
    checkSupabaseStatus() {
        if (window.testSupabaseStatus) {
            window.testSupabaseStatus();
        } else {
            console.log('⚠️ Fonction testSupabaseStatus non disponible');
        }
    }

    // Vérifier la qualité des images
    checkImageQuality() {
        if (window.testImageQuality) {
            window.testImageQuality();
        } else {
            console.log('⚠️ Fonction testImageQuality non disponible');
        }
    }

    // Afficher le statut
    showStatus(type, message) {
        const statusDiv = document.getElementById('connection-status');
        if (!statusDiv) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            loading: 'fa-spinner fa-spin'
        };

        const colors = {
            success: 'text-green-600',
            error: 'text-red-600',
            loading: 'text-blue-600'
        };

        statusDiv.innerHTML = `<div class="${colors[type]}"><i class="fa-solid ${icons[type]}"></i> ${message}</div>`;
    }

    // Afficher les informations du bucket
    showBucketInfo(bucketInfo) {
        const infoDiv = document.getElementById('bucket-info');
        if (!infoDiv) return;

        if (bucketInfo) {
            infoDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded p-3">
                    <div class="text-green-800 text-sm">
                        <div><strong>Bucket:</strong> ${bucketInfo.name}</div>
                        <div><strong>Statut:</strong> ${bucketInfo.exists ? 'Existe' : 'Créé'}</div>
                        <div><strong>Public:</strong> ${bucketInfo.public ? 'Oui' : 'Non'}</div>
                    </div>
                </div>
            `;
        } else {
            infoDiv.innerHTML = '';
        }
    }

    // Getters
    getCurrentBucketName() {
        return this.bucketName;
    }

    getCurrentServiceRoleKey() {
        return this.serviceRoleKey;
    }

    isConfigured() {
        return !!(this.bucketName && this.serviceRoleKey);
    }
}

// Instance globale
let supabaseBucketUI = null;

// Fonctions globales pour l'interface HTML
function configureSupabaseBucket() {
    if (!supabaseBucketUI) {
        supabaseBucketUI = new SupabaseBucketUI();
    }
    supabaseBucketUI.openModal();
}

function closeSupabaseBucketModal() {
    if (supabaseBucketUI) {
        supabaseBucketUI.closeModal();
    }
}

function testSupabaseBucketConnection() {
    if (supabaseBucketUI) {
        supabaseBucketUI.testConnection();
    }
}

function saveSupabaseBucketConfig() {
    if (supabaseBucketUI) {
        supabaseBucketUI.saveConfig();
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Créer une instance de SupabaseBucketUI
    window.supabaseBucketUI = new SupabaseBucketUI();
});

// Exposer les fonctions globalement
window.configureSupabaseBucket = configureSupabaseBucket;
window.closeSupabaseBucketModal = closeSupabaseBucketModal;
window.testSupabaseBucketConnection = testSupabaseBucketConnection;
window.saveSupabaseBucketConfig = saveSupabaseBucketConfig;
window.SupabaseBucketUI = SupabaseBucketUI;
