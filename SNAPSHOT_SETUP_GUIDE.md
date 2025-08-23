# 🚀 Guide de Configuration des Snapshots Supabase

## 📋 Vue d'ensemble

Votre fonction `snapshot_staff_table` a été déployée avec succès et est configurée pour s'exécuter **chaque minute**. Cependant, elle nécessite une infrastructure de base de données et de stockage pour fonctionner correctement.

## ✅ État Actuel

- ✅ **Fonction déployée** : `snapshot_staff_table`
- ✅ **Configuration Cron** : `* * * * *` (chaque minute)
- ✅ **Fonction accessible** : Test OPTIONS réussi
- ❌ **Infrastructure manquante** : Tables et bucket de stockage

## 🔧 Configuration Requise

### 1. Table d'Index des Snapshots

Exécutez ce script SQL dans votre éditeur SQL Supabase :

```sql
-- Créer la table d'index des snapshots
CREATE TABLE IF NOT EXISTS table_snapshots_index (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index pour les recherches par date
CREATE INDEX IF NOT EXISTS idx_table_snapshots_date ON table_snapshots_index(snapshot_date);

-- Activer RLS
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;

-- Politique pour le rôle service
CREATE POLICY "Service role can manage snapshots" ON table_snapshots_index
    FOR ALL USING (auth.role() = 'service_role');

-- Politique pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read snapshots" ON table_snapshots_index
    FOR SELECT USING (auth.role() = 'authenticated');
```

### 2. Bucket de Stockage

1. Allez dans votre dashboard Supabase
2. Naviguez vers **Storage**
3. Cliquez sur **"Create new bucket"**
4. Nom du bucket : `table-snapshots`
5. Région : Sélectionnez votre région
6. **IMPORTANT** : Décochez "Public bucket" (doit rester privé)
7. Cliquez sur **"Create bucket"**

### 3. Politiques de Stockage

Après avoir créé le bucket, configurez les politiques de sécurité :

```sql
-- Permettre au rôle service de gérer les fichiers
CREATE POLICY "Service role can manage snapshots" ON storage.objects
    FOR ALL USING (bucket_id = 'table-snapshots' AND auth.role() = 'service_role');

-- Permettre aux utilisateurs authentifiés de lire les snapshots
CREATE POLICY "Authenticated users can read snapshots" ON storage.objects
    FOR SELECT USING (bucket_id = 'table-snapshots' AND auth.role() = 'authenticated');
```

## 🧪 Test de la Configuration

### Test 1 : Vérification de l'Infrastructure

Exécutez ce script SQL pour vérifier que tout est en place :

```sql
-- Vérifier la table
SELECT 
    'Table check' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name = 'table_snapshots_index';

-- Vérifier le bucket
SELECT 
    'Bucket check' as status,
    name as bucket_name,
    public as is_public
FROM storage.buckets 
WHERE name = 'table-snapshots';
```

### Test 2 : Test Manuel de la Fonction

1. Allez dans **Edge Functions** > **snapshot_staff_table**
2. Cliquez sur **"Invoke"**
3. Vérifiez les logs pour voir si la fonction s'exécute correctement

### Test 3 : Vérification des Logs

```bash
# Vérifier les logs de la fonction
supabase functions logs snapshot_staff_table --project-ref fiecugxopjxzqfdnaqsu
```

## 📊 Surveillance des Snapshots

### Vérifier les Snapshots Créés

```sql
-- Lister tous les snapshots
SELECT 
    snapshot_date,
    object_path,
    row_count,
    file_size_bytes,
    created_at
FROM table_snapshots_index
ORDER BY snapshot_date DESC;

-- Compter les snapshots par jour
SELECT 
    DATE(created_at) as date,
    COUNT(*) as snapshot_count
FROM table_snapshots_index
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Vérifier le Stockage

```sql
-- Lister les fichiers dans le bucket
SELECT 
    name,
    metadata,
    created_at,
    updated_at
FROM storage.objects
WHERE bucket_id = 'table-snapshots'
ORDER BY created_at DESC;
```

## 🚨 Dépannage

### Problème : Fonction retourne 401

**Cause** : Token d'authentification manquant ou invalide
**Solution** : La fonction fonctionne correctement - elle nécessite une authentification

### Problème : Erreur "table does not exist"

**Cause** : Table `table_snapshots_index` manquante
**Solution** : Exécuter le script SQL de création de table

### Problème : Erreur "bucket does not exist"

**Cause** : Bucket `table-snapshots` manquant
**Solution** : Créer le bucket via le dashboard Supabase

### Problème : Erreur "permission denied"

**Cause** : Politiques RLS manquantes
**Solution** : Exécuter les scripts de création des politiques

## 📅 Vérification du Cron

1. Allez dans **Settings** > **Cron Jobs**
2. Vérifiez que `snapshot_staff_table` est listé
3. Vérifiez que le statut est **"Active"**
4. Vérifiez que la planification est `* * * * *`

## 🎯 Prochaines Étapes

1. **Exécuter le script SQL** pour créer la table d'index
2. **Créer le bucket de stockage** `table-snapshots`
3. **Configurer les politiques de sécurité**
4. **Tester manuellement** la fonction
5. **Attendre quelques minutes** pour voir les snapshots automatiques
6. **Vérifier les logs** pour confirmer le bon fonctionnement

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs de la fonction
2. Vérifiez que l'infrastructure est en place
3. Testez manuellement la fonction
4. Consultez la documentation Supabase sur les Edge Functions

---

**Note** : Une fois configurée, la fonction créera automatiquement un snapshot de votre table `staffTable` chaque minute et le stockera dans le bucket `table-snapshots` avec un index dans `table_snapshots_index`.

