# 🔍 Analyse du Comportement du Système de Snapshots - Stockage Plein

## 📊 Vue d'Ensemble du Système

**Bucket de stockage** : `table-snapshots`  
**Base de données** : `table_snapshots_index`  
**Fonction de création** : `createDemoSnapshot()`  
**Gestion des erreurs** : Basique (pas de rotation automatique)

---

## 🚨 **RÉPONSE DIRECTE À VOTRE QUESTION :**

### **❌ Le système VA S'ARRÊTER si le stockage est plein !**

**Aucun mécanisme automatique d'effacement des anciens snapshots n'est implémenté.**

---

## 🔍 Analyse Détaillée du Code

### **1. Fonction `createDemoSnapshot()` - Lignes 5341-5580**

```javascript
// Upload vers le bucket Supabase
const { data: uploadData, error: uploadError } = await supabaseStorage.storage
    .from('table-snapshots')
    .upload(fileName, jsonBlob);

if (uploadError) {
    console.error('❌ Error uploading file to storage:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
}
```

**Problème identifié** : Si l'upload échoue (stockage plein), la fonction lance une erreur et s'arrête.

### **2. Gestion des Erreurs de Stockage**

```javascript
if (uploadError) {
    console.error('❌ Error uploading file to storage:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
}
```

**Comportement** : 
- ❌ **Pas de retry automatique**
- ❌ **Pas de nettoyage automatique**
- ❌ **Pas de rotation des snapshots**
- ❌ **Pas de gestion de la capacité**

---

## ⚠️ Scénarios de Défaillance

### **Scénario 1 : Bucket Plein**
```
❌ Erreur : "Storage quota exceeded"
❌ Action : Aucune création de snapshot
❌ Impact : Système de sauvegarde inopérant
```

### **Scénario 2 : Limite de Fichiers Atteinte**
```
❌ Erreur : "Too many files in bucket"
❌ Action : Aucune création de snapshot
❌ Impact : Système de sauvegarde inopérant
```

### **Scénario 3 : Limite de Taille de Fichier**
```
❌ Erreur : "File size limit exceeded"
❌ Action : Aucune création de snapshot
❌ Impact : Système de sauvegarde inopérant
```

---

## 🛠️ Solutions Recommandées

### **Solution 1 : Rotation Automatique des Snapshots (RECOMMANDÉE)**

```javascript
async function createSnapshotWithRotation() {
    try {
        // 1. Vérifier l'espace disponible
        const { data: bucketInfo } = await supabaseStorage.storage
            .from('table-snapshots')
            .list();
        
        // 2. Si trop de snapshots, supprimer les plus anciens
        if (bucketInfo.length > MAX_SNAPSHOTS) {
            await cleanupOldSnapshots(MAX_SNAPSHOTS);
        }
        
        // 3. Créer le nouveau snapshot
        await createDemoSnapshot();
        
    } catch (error) {
        console.error('❌ Error in rotation system:', error);
    }
}
```

### **Solution 2 : Gestion Intelligente de la Capacité**

```javascript
async function checkStorageCapacity() {
    try {
        // Vérifier l'espace utilisé
        const { data: files } = await supabaseStorage.storage
            .from('table-snapshots')
            .list();
        
        let totalSize = 0;
        files.forEach(file => {
            totalSize += file.metadata?.size || 0;
        });
        
        // Si > 80% de la capacité, nettoyer
        if (totalSize > MAX_BUCKET_SIZE * 0.8) {
            await cleanupOldSnapshots(10); // Garder 10 snapshots
        }
        
    } catch (error) {
        console.error('❌ Error checking capacity:', error);
    }
}
```

### **Solution 3 : Système de Priorité des Snapshots**

```javascript
const SNAPSHOT_PRIORITIES = {
    CRITICAL: 30,    // Garder 30 jours
    IMPORTANT: 7,    // Garder 7 jours
    NORMAL: 3        // Garder 3 jours
};

async function cleanupByPriority() {
    try {
        // Supprimer les snapshots non-critiques en premier
        await cleanupOldSnapshots(SNAPSHOT_PRIORITIES.CRITICAL);
        
    } catch (error) {
        console.error('❌ Error in priority cleanup:', error);
    }
}
```

---

## 📋 Implémentation Recommandée

### **Phase 1 : Gestion Basique de la Capacité**
```javascript
// Ajouter dans createDemoSnapshot()
const MAX_SNAPSHOTS = 50; // Limite arbitraire
const MAX_BUCKET_SIZE = 100 * 1024 * 1024; // 100 MB

// Vérifier avant création
if (currentSnapshotCount >= MAX_SNAPSHOTS) {
    await cleanupOldSnapshots(MAX_SNAPSHOTS - 10);
}
```

### **Phase 2 : Rotation Automatique**
```javascript
// Fonction de nettoyage automatique
async function cleanupOldSnapshots(keepCount = 20) {
    try {
        // Récupérer tous les snapshots triés par date
        const { data: snapshots } = await supabase
            .from('table_snapshots_index')
            .select('*')
            .order('snapshot_date', { ascending: false });
        
        if (snapshots.length > keepCount) {
            // Supprimer les plus anciens
            const toDelete = snapshots.slice(keepCount);
            
            for (const snapshot of toDelete) {
                // Supprimer du stockage
                await supabaseStorage.storage
                    .from('table-snapshots')
                    .remove([snapshot.object_path]);
                
                // Supprimer de la base
                await supabase
                    .from('table_snapshots_index')
                    .delete()
                    .eq('id', snapshot.id);
            }
        }
    } catch (error) {
        console.error('❌ Error cleaning up snapshots:', error);
    }
}
```

### **Phase 3 : Monitoring et Alertes**
```javascript
// Fonction de monitoring
async function monitorStorageHealth() {
    try {
        const { data: snapshots } = await supabase
            .from('table_snapshots_index')
            .select('*');
        
        const totalSize = snapshots.reduce((sum, s) => sum + (s.file_size_bytes || 0), 0);
        const snapshotCount = snapshots.length;
        
        // Alertes
        if (snapshotCount > 80) {
            showMessage('⚠️ Beaucoup de snapshots - nettoyage recommandé', 'warning');
        }
        
        if (totalSize > MAX_BUCKET_SIZE * 0.9) {
            showMessage('🚨 Stockage presque plein - nettoyage urgent !', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error monitoring storage:', error);
    }
}
```

---

## 🎯 Recommandations Immédiates

### **1. Implémenter la Rotation Automatique**
- **Priorité** : 🔴 **HAUTE**
- **Effort** : 2-3 heures
- **Impact** : Évite les pannes de stockage

### **2. Ajouter des Limites de Capacité**
- **Priorité** : 🟡 **MOYENNE**
- **Effort** : 1-2 heures
- **Impact** : Prévention proactive

### **3. Monitoring et Alertes**
- **Priorité** : 🟢 **BASSE**
- **Effort** : 1 heure
- **Impact** : Visibilité et maintenance

---

## 📊 État Actuel vs État Recommandé

| Aspect | État Actuel | État Recommandé |
|--------|-------------|-----------------|
| **Gestion de la capacité** | ❌ Aucune | ✅ Rotation automatique |
| **Limite de snapshots** | ❌ Aucune | ✅ 50 snapshots max |
| **Nettoyage automatique** | ❌ Aucun | ✅ Suppression des anciens |
| **Monitoring** | ❌ Aucun | ✅ Alertes de capacité |
| **Résilience** | ❌ Fragile | ✅ Robuste et auto-réparant |

---

## 🚨 **CONCLUSION CRITIQUE :**

**Votre système actuel VA S'ARRÊTER si le stockage est plein !**

**Recommandation immédiate** : Implémenter la rotation automatique des snapshots pour éviter les pannes.

**Impact sans correction** : 
- ❌ Aucun nouveau snapshot créé
- ❌ Système de sauvegarde inopérant
- ❌ Perte potentielle de données historiques
- ❌ Expérience utilisateur dégradée

---

**⚠️ ACTION REQUISE : Implémenter la gestion automatique de la capacité de stockage !**
