# 🔧 Guide de Correction des Politiques de Stockage Supabase

## 🚨 **PROBLÈME IDENTIFIÉ**
```
❌ Error uploading file to storage: StorageApiError: new row violates row-level security policy
```

**Cause :** Les politiques RLS (Row Level Security) bloquent l'insertion de fichiers dans le bucket de stockage.

## 🛠️ **SOLUTION : Configuration des Politiques de Stockage**

### **Étape 1 : Accéder au Dashboard Supabase**
1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet `fiecugxopjxzqfdnaqsu`
3. Cliquez sur **Storage** dans le menu de gauche

### **Étape 2 : Configurer le Bucket table-snapshots**
1. **Trouvez le bucket** `table-snapshots`
2. **Cliquez sur "Policies"** (à côté du nom du bucket)
3. **Vérifiez que RLS est activé** (toggle vert)

### **Étape 3 : Ajouter les Politiques de Stockage**

#### **Politique 1 : Lecture Publique**
- **Policy name :** `Allow public read`
- **Allowed operation :** `SELECT`
- **Target roles :** `public`
- **Using expression :** `true`

#### **Politique 2 : Insertion Publique**
- **Policy name :** `Allow public insert`
- **Allowed operation :** `INSERT`
- **Target roles :** `public`
- **Using expression :** `true`
- **With check expression :** `true`

#### **Politique 3 : Mise à Jour Publique**
- **Policy name :** `Allow public update`
- **Allowed operation :** `UPDATE`
- **Target roles :** `public`
- **Using expression :** `true`
- **With check expression :** `true`

#### **Politique 4 : Suppression Publique**
- **Policy name :** `Allow public delete`
- **Allowed operation :** `DELETE`
- **Target roles :** `public`
- **Using expression :** `true`

### **Étape 4 : Vérification des Politiques**
Après avoir ajouté toutes les politiques, vous devriez voir :
- ✅ **4 politiques actives** sur le bucket
- ✅ **RLS activé** (toggle vert)
- ✅ **Permissions complètes** (lecture, écriture, modification, suppression)

## 🔍 **Alternative : Configuration via SQL**

Si vous préférez utiliser SQL, exécutez ce script dans l'éditeur SQL :

```sql
-- Activer RLS sur le bucket (si pas déjà fait)
UPDATE storage.buckets 
SET public = true 
WHERE name = 'table-snapshots';

-- Créer les politiques de stockage
CREATE POLICY "storage_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'table-snapshots');

CREATE POLICY "storage_public_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'table-snapshots');

CREATE POLICY "storage_public_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'table-snapshots');

CREATE POLICY "storage_public_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'table-snapshots');
```

## 🧪 **Test après Configuration**

Une fois les politiques configurées, testez :

1. **Rechargez votre page** principale
2. **Vérifiez la console** (plus d'erreur RLS)
3. **Testez la création** d'un snapshot
4. **Vérifiez que** `loadAvailableSnapshots()` fonctionne

## ⚠️ **Sécurité**

**Note :** Ces politiques permettent l'accès public complet au bucket. Pour un environnement de production, vous pourriez vouloir des politiques plus restrictives basées sur l'authentification.

## 🔄 **Prochaines Étapes**

1. ✅ **Configurer les politiques de stockage** (ce guide)
2. ✅ **Exécuter le script SQL** pour les tables (`fix-rls-policies.sql`)
3. 🧪 **Tester la fonctionnalité** des snapshots
4. 🎯 **Vérifier que** le site voit maintenant les snapshots

## 📞 **Support**

Si vous rencontrez des problèmes :
1. Vérifiez que RLS est activé sur le bucket
2. Vérifiez que toutes les politiques sont créées
3. Testez avec un fichier simple d'abord
4. Consultez les logs dans Supabase Dashboard
