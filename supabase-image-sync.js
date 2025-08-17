// Supabase Image Synchronization System
// Synchronisation des images avec Supabase Storage Bucket

class SupabaseImageSync {
    constructor(bucketName, serviceRoleKey) {
        this.bucketName = bucketName;
        this.serviceRoleKey = serviceRoleKey;
        this.supabase = null;
        this.isInitialized = false;
        this.supabaseUrl = null;
        
        if (bucketName && serviceRoleKey) {
            this.initializeSupabase();
        }
    }

    // Réinitialiser avec de nouveaux paramètres
    reinitialize(bucketName, serviceRoleKey) {
        this.bucketName = bucketName;
        this.serviceRoleKey = serviceRoleKey;
        this.isInitialized = false;
        this.supabase = null;
        
        if (bucketName && serviceRoleKey) {
            this.initializeSupabase();
        }
    }

    // Initialiser Supabase
    async initializeSupabase() {
        try {
            console.log('🔄 Initialisation de Supabase Image Sync...');
            
            // Utiliser l'URL de votre projet
            this.supabaseUrl = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
            
            // Si window.supabase existe, utiliser son URL (pour la cohérence)
            if (window.supabase && window.supabase.supabaseUrl) {
                this.supabaseUrl = window.supabase.supabaseUrl;
            }
            
            console.log('🔗 URL Supabase utilisée pour Image Sync:', this.supabaseUrl);
            
            // Créer le client Supabase avec la clé de service
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            this.supabase = createClient(this.supabaseUrl, this.serviceRoleKey);
            
            console.log('✅ Client Supabase (Service Role Key) créé pour Image Sync.');
            
            // Vérifier que le bucket existe
            await this.ensureBucketExists();
            
            this.isInitialized = true;
            console.log('✅ Supabase Image Sync initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de Supabase Image Sync:', error);
            this.isInitialized = false;
        }
    }

    // Vérifier si le bucket existe, sinon le créer
    async ensureBucketExists() {
        // Vérifier que le client supabase est disponible
        if (!this.supabase) {
            throw new Error('Client Supabase non disponible pour ensureBucketExists');
        }

        try {
            // Vérifier si le bucket existe
            const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
            
            if (listError) {
                console.error('Erreur lors de la liste des buckets:', listError);
                throw new Error(`Erreur lors du listage des buckets: ${listError.message}`);
            }

            const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);
            
            if (!bucketExists) {
                console.log(`Bucket '${this.bucketName}' non trouvé, création en cours...`);
                
                const { data: newBucket, error: createError } = await this.supabase.storage.createBucket(this.bucketName, {
                    public: true,
                    allowedMimeTypes: ['image/*'],
                    fileSizeLimit: 52428800 // 50MB
                });

                if (createError) {
                    console.error('❌ Erreur lors de la création du bucket:', createError);
                    throw new Error(`Erreur lors de la création du bucket: ${createError.message}`);
                }

                console.log(`✅ Bucket '${this.bucketName}' créé avec succès`);
                return true;
            } else {
                console.log(`✅ Bucket '${this.bucketName}' existe déjà`);
                return true;
            }
        } catch (error) {
            console.error('Erreur lors de la vérification/création du bucket:', error);
            throw error; // Propager l'erreur pour l'initialisation
        }
    }

    // Uploader une image vers Supabase
    async uploadImage(imageFile, patientKey, customFileName = null) {
        if (!this.supabase) { // Utiliser this.supabase au lieu de this.isInitialized
            throw new Error('Supabase non initialisé pour l\'upload');
        }

        try {
            // S'assurer que le bucket existe
            await this.ensureBucketExists();

            // Générer un nom de fichier unique
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 15);
            const fileExtension = imageFile.name.split('.').pop();
            const fileName = customFileName || `${patientKey}_${timestamp}_${randomId}.${fileExtension}`;
            
            // Chemin complet dans le bucket
            const filePath = `${patientKey}/${fileName}`;

            console.log(`📤 Upload de l'image: ${filePath}`);

            // Upload du fichier
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filePath, imageFile, {
                    cacheControl: '3600',
                    upsert: true // Permettre l'écrasement si le fichier existe
                });

            if (error) {
                // Si l'erreur est "resource already exists", essayer de récupérer l'URL existante
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log('⚠️ Fichier existe déjà, récupération de l\'URL existante...');
                    
                    // Obtenir l'URL publique du fichier existant
                    const { data: urlData } = this.supabase.storage
                        .from(this.bucketName)
                        .getPublicUrl(filePath);
                    
                    console.log(`✅ URL existante récupérée: ${filePath}`);
                    
                    return {
                        success: true,
                        filePath: filePath,
                        fileName: fileName,
                        publicUrl: urlData?.publicUrl || null,
                        size: imageFile.size,
                        type: imageFile.type,
                        uploadDate: new Date().toISOString(),
                        patientKey: patientKey,
                        alreadyExists: true
                    };
                }
                
                console.error('❌ Erreur lors de l\'upload:', error);
                throw error;
            }

            // Obtenir l'URL publique
            const { data: urlData } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(filePath);

            console.log(`✅ Image uploadée avec succès: ${filePath}`);
            console.log(`🔗 URL publique générée: ${urlData?.publicUrl || 'Non disponible'}`);
            
            return {
                success: true,
                filePath: filePath,
                fileName: fileName,
                publicUrl: urlData?.publicUrl || null,
                size: imageFile.size,
                type: imageFile.type,
                uploadDate: new Date().toISOString(),
                patientKey: patientKey
            };

        } catch (error) {
            console.error('❌ Erreur lors de l\'upload de l\'image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Télécharger toutes les images d'un patient depuis Supabase
    async downloadPatientImages(patientKey) {
        if (!this.supabase) { // Utiliser this.supabase au lieu de this.isInitialized
            throw new Error('Supabase non initialisé pour le téléchargement');
        }

        try {
            console.log(`📥 Téléchargement des images pour le patient: ${patientKey}`);

            // Lister tous les fichiers du patient
            const { data: files, error } = await this.supabase.storage
                .from(this.bucketName)
                .list(patientKey);

            if (error) {
                console.error('❌ Erreur lors de la liste des fichiers:', error);
                return [];
            }

            if (!files || files.length === 0) {
                console.log(`Aucune image trouvée pour le patient: ${patientKey}`);
                return [];
            }

            console.log(`📁 ${files.length} fichier(s) trouvé(s) pour ${patientKey}`);

            // Télécharger chaque image
            const images = [];
            for (const file of files) {
                try {
                    const { data, error: downloadError } = await this.supabase.storage
                        .from(this.bucketName)
                        .download(`${patientKey}/${file.name}`);

                    if (downloadError) {
                        console.error(`Erreur lors du téléchargement de ${file.name}:`, downloadError);
                        continue;
                    }

                    // Convertir en base64
                    const base64 = await this.fileToBase64(data);
                    
                    // Générer l'URL publique
                    const { data: publicUrlData } = this.supabase.storage
                        .from(this.bucketName)
                        .getPublicUrl(`${patientKey}/${file.name}`);
                    
                    images.push({
                        id: `${patientKey}_${file.name}`,
                        name: file.name,
                        data: base64,
                        type: file.metadata?.mimetype || 'image/*',
                        size: file.metadata?.size || 0,
                        uploadDate: file.updated_at,
                        patientKey: patientKey,
                        filePath: `${patientKey}/${file.name}`,
                        fromSupabase: true,
                        publicUrl: publicUrlData?.publicUrl || null
                    });

                } catch (fileError) {
                    console.error(`Erreur lors du traitement de ${file.name}:`, fileError);
                }
            }

            console.log(`✅ ${images.length} image(s) téléchargée(s) pour ${patientKey}`);
            return images;

        } catch (error) {
            console.error('❌ Erreur lors du téléchargement des images:', error);
            return [];
        }
    }

    // Supprimer une image de Supabase
    async deleteImage(filePath) {
        if (!this.supabase) { // Utiliser this.supabase au lieu de this.isInitialized
            throw new Error('Supabase non initialisé pour la suppression');
        }

        try {
            console.log(`🗑️ Suppression de l'image: ${filePath}`);

            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .remove([filePath]);

            if (error) {
                console.error('❌ Erreur lors de la suppression:', error);
                throw error;
            }

            console.log(`✅ Image supprimée avec succès: ${filePath}`);
            return { success: true, filePath: filePath };

        } catch (error) {
            console.error('❌ Erreur lors de la suppression de l\'image:', error);
            return {
                success: false,
                error: error.message,
                filePath: filePath
            };
        }
    }

    // Supprimer toutes les images d'un patient
    async deletePatientImages(patientKey) {
        if (!this.supabase) { // Utiliser this.supabase au lieu de this.isInitialized
            throw new Error('Supabase non initialisé pour la suppression par patient');
        }

        try {
            console.log(`🗑️ Suppression de toutes les images pour: ${patientKey}`);

            // Lister tous les fichiers du patient
            const { data: files, error } = await this.supabase.storage
                .from(this.bucketName)
                .list(patientKey);

            if (error) {
                console.error('❌ Erreur lors de la liste des fichiers:', error);
                return false;
            }

            if (!files || files.length === 0) {
                console.log(`Aucune image à supprimer pour ${patientKey}`);
                return true;
            }

            // Supprimer tous les fichiers
            const filePaths = files.map(file => `${patientKey}/${file.name}`);
            
            const { data, error: deleteError } = await this.supabase.storage
                .from(this.bucketName)
                .remove(filePaths);

            if (deleteError) {
                console.error('❌ Erreur lors de la suppression:', deleteError);
                return false;
            }

            console.log(`✅ ${files.length} image(s) supprimée(s) pour ${patientKey}`);
            return true;

        } catch (error) {
            console.error('❌ Erreur lors de la suppression des images:', error);
            return false;
        }
    }

    // Obtenir les statistiques du bucket
    async getBucketStats() {
        if (!this.supabase) { // Utiliser this.supabase au lieu de this.isInitialized
            throw new Error('Supabase non initialisé pour les statistiques du bucket');
        }
        try {
            const { data: buckets, error } = await this.supabase.storage.listBuckets();
            
            if (error) {
                throw error;
            }

            const bucket = buckets.find(b => b.name === this.bucketName);
            if (!bucket) {
                return { exists: false };
            }

            // Lister tous les fichiers pour obtenir les statistiques
            const { data: files, error: listError } = await this.supabase.storage
                .from(this.bucketName)
                .list('', { limit: 1000 });

            if (listError) {
                throw listError;
            }

            const stats = {
                exists: true,
                name: bucket.name,
                public: bucket.public,
                fileCount: files ? files.length : 0,
                createdAt: bucket.created_at,
                updatedAt: bucket.updated_at
            };

            return stats;

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des statistiques:', error);
            return { exists: false, error: error.message };
        }
    }

    // Utilitaires
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async base64ToFile(base64, fileName, mimeType) {
        const response = await fetch(base64);
        const blob = await response.blob();
        return new File([blob], fileName, { type: mimeType });
    }

    // Vérifier la connexion
    async testConnection() {
        if (!this.supabase) { // Utiliser this.supabase au lieu de this.isInitialized
            return { connected: false, error: 'Supabase non initialisé pour le test de connexion' };
        }
        try {
            const stats = await this.getBucketStats();
            return {
                connected: true,
                bucketExists: stats.exists,
                bucketName: this.bucketName,
                stats: stats
            };

        } catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }

    // Tester la connexion Supabase avec un client temporaire
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
}

// Instance globale
let supabaseImageSync = null;

// Fonctions globales pour l'interface
async function initializeSupabaseImageSync(bucketName, serviceRoleKey) {
    try {
        supabaseImageSync = new SupabaseImageSync(bucketName, serviceRoleKey);
        
        // Attendre l'initialisation
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts && !supabaseImageSync.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        if (supabaseImageSync.isInitialized) {
            console.log('✅ Supabase Image Sync initialisé avec succès');
            // Mettre à jour la référence globale
            window.supabaseImageSync = supabaseImageSync;
            return true;
        } else {
            console.error('❌ Échec de l\'initialisation de Supabase Image Sync');
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        return false;
    }
}

// Initialiser automatiquement avec la configuration sauvegardée
async function autoInitializeSupabaseImageSync() {
    const bucketName = localStorage.getItem('supabaseBucketName');
    const serviceRoleKey = localStorage.getItem('supabaseServiceRoleKey');
    
    if (bucketName && serviceRoleKey) {
        console.log('🔄 Initialisation automatique avec la configuration sauvegardée...');
        const result = await initializeSupabaseImageSync(bucketName, serviceRoleKey);
        if (result) {
            // Mettre à jour la référence globale après initialisation réussie
            window.supabaseImageSync = supabaseImageSync;
        }
        return result;
    } else {
        console.log('⚠️ Aucune configuration Supabase trouvée');
        return false;
    }
}

async function uploadImageToSupabase(imageFile, patientKey) {
    if (!supabaseImageSync) {
        throw new Error('Supabase Image Sync non initialisé');
    }
    return await supabaseImageSync.uploadImage(imageFile, patientKey);
}

async function downloadImagesFromSupabase(patientKey) {
    if (!supabaseImageSync) {
        throw new Error('Supabase Image Sync non initialisé');
    }
    return await supabaseImageSync.downloadPatientImages(patientKey);
}

async function deleteImageFromSupabase(filePath) {
    if (!supabaseImageSync) {
        throw new Error('Supabase Image Sync non initialisé');
    }
    return await supabaseImageSync.deleteImage(filePath);
}

async function syncImagesToSupabase(localImages, patientKey) {
    if (!supabaseImageSync) {
        throw new Error('Supabase Image Sync non initialisé');
    }
    // This function is no longer relevant as images are directly uploaded to Supabase Storage
    // The localImages parameter is kept for compatibility, but the actual upload logic is handled by uploadImage
    // For now, we'll just return a success message as the upload is now direct.
    console.warn('syncImagesToSupabase is deprecated. Images are now directly uploaded to Supabase Storage.');
    return { success: true, uploaded: 0, skipped: 0, total: 0 };
}

async function testSupabaseImageConnection() {
    if (!supabaseImageSync) {
        return { connected: false, error: 'Non initialisé' };
    }
    return await supabaseImageSync.testConnection();
}

// Exposer les fonctions globalement
window.initializeSupabaseImageSync = initializeSupabaseImageSync;
window.autoInitializeSupabaseImageSync = autoInitializeSupabaseImageSync;

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu que tout soit chargé
    setTimeout(async () => {
        console.log('🔄 Initialisation automatique de Supabase Image Sync...');
        const result = await autoInitializeSupabaseImageSync();
        if (result) {
            console.log('✅ Supabase Image Sync initialisé automatiquement');
        } else {
            console.warn('⚠️ Échec de l\'initialisation automatique de Supabase Image Sync');
        }
    }, 1000);
});

