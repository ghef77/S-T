# 🔧 Guide de Correction du Cron Job via le Dashboard Supabase

## ❌ Problème Identifié
- **Erreur SQL** : `permission denied for table job`
- **Cause** : Vous n'avez pas les permissions d'administration pour modifier directement la table `cron.job`
- **Solution** : Utiliser le dashboard Supabase au lieu de SQL direct

## 🚀 Solution via le Dashboard Supabase

### **Étape 1 : Accéder au Dashboard**
1. **Connectez-vous** à [supabase.com](https://supabase.com)
2. **Sélectionnez** votre projet `fiecugxopjxzqfdnaqsu`
3. **Allez dans** `Edge Functions` dans le menu de gauche

### **Étape 2 : Identifier la Fonction Problématique**
1. **Trouvez** la fonction `snapshot_staff_table`
2. **Vérifiez** son statut (active/inactive)
3. **Notez** son ID ou nom exact

### **Étape 3 : Supprimer la Fonction Problématique**
1. **Cliquez** sur la fonction `snapshot_staff_table`
2. **Cliquez** sur le bouton `Delete` ou `🗑️`
3. **Confirmez** la suppression
4. **Attendez** que la suppression soit terminée

### **Étape 4 : Recréer la Fonction avec la Bonne Configuration**
1. **Cliquez** sur `New Function`
2. **Nommez-la** `snapshot_staff_table`
3. **Copiez** le code TypeScript depuis `supabase/functions/snapshot_staff_table/index.ts`
4. **Créez** le fichier `cron.json` avec :
   ```json
   {
     "cron": "0 10 * * *",
     "timezone": "Europe/Paris"
   }
   ```

### **Étape 5 : Déployer la Nouvelle Fonction**
1. **Cliquez** sur `Deploy`
2. **Attendez** que le déploiement soit terminé
3. **Vérifiez** que la fonction est active

## 🔍 Vérification Alternative via SQL

### **Exécutez ce script pour diagnostiquer :**
```sql
-- Vérifier votre rôle et permissions
SELECT 
    current_user as current_user,
    session_user as session_user;

-- Vérifier les extensions installées
SELECT 
    extname,
    extversion
FROM pg_extension 
WHERE extname IN ('cron', 'pg_cron');

-- Vérifier les tables accessibles
SELECT 
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema IN ('cron', 'public')
ORDER BY table_schema, table_name;
```

## 🎯 Solutions Alternatives

### **Option 1 : Contact Admin**
- **Contactez** l'administrateur de votre projet Supabase
- **Demandez** à ce qu'il exécute le script de correction
- **Fournissez** le fichier `fix-cron-job-simple.sql`

### **Option 2 : API Supabase**
- **Utilisez** l'API REST de Supabase
- **Modifiez** la configuration via des appels HTTP
- **Requiert** des clés d'API avec permissions admin

### **Option 3 : Supabase CLI Local**
- **Installez** Supabase CLI localement
- **Connectez-vous** avec des privilèges admin
- **Exécutez** les commandes de déploiement

## 📋 Checklist de Résolution

- [ ] **Accéder** au dashboard Supabase
- [ ] **Supprimer** la fonction `snapshot_staff_table` existante
- [ ] **Recréer** la fonction avec le bon `cron.json`
- [ ] **Déployer** la nouvelle fonction
- [ ] **Vérifier** que le cron job ne tourne plus toutes les minutes
- [ ] **Tester** avec le monitoring créé précédemment

## ⚠️ Points Importants

1. **Permissions** : Les utilisateurs normaux ne peuvent pas modifier les tables système
2. **Dashboard** : Utilisez toujours l'interface web pour les opérations sensibles
3. **Sauvegarde** : Sauvegardez votre code avant de supprimer la fonction
4. **Test** : Vérifiez que la nouvelle fonction fonctionne avant de la mettre en production

## 🆘 Si le Problème Persiste

1. **Vérifiez** les logs de la fonction dans le dashboard
2. **Contactez** le support Supabase
3. **Utilisez** le script de monitoring pour vérifier l'activité
4. **Considérez** une approche différente (webhook, fonction manuelle, etc.)

---

**💡 Conseil** : Commencez toujours par la solution du dashboard, c'est la plus sûre et la plus simple !
