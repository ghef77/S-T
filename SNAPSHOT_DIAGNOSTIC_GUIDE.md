# 🔍 Guide de Diagnostic - Snapshots Automatiques

## 📋 Problème Identifié
**Les snapshots automatiques ne se créent pas chaque minute malgré la configuration cron `* * * * *`**

## ✅ Ce qui Fonctionne
- ✅ Configuration cron locale correcte : `* * * * *`
- ✅ Fonction TypeScript compilée et déployée
- ✅ Fonction accessible via HTTP (CORS OK)
- ✅ Authentification requise (statut 401 normal)

## 🚨 Causes Possibles et Solutions

### 1. **Fonction Non Déployée sur Supabase**
**Symptôme :** Fonction accessible mais pas d'exécution automatique

**Vérification :**
```bash
# Vérifier si la fonction est déployée
supabase functions list

# Redéployer la fonction
supabase functions deploy snapshot_staff_table
```

**Solution :**
```bash
cd supabase
supabase functions deploy snapshot_staff_table
```

### 2. **Variables d'Environnement Manquantes**
**Symptôme :** Erreurs dans les logs Supabase

**Vérification :**
- Dashboard Supabase → Settings → API
- Vérifier `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`

**Solution :**
```bash
# Définir les variables d'environnement
supabase secrets set SUPABASE_URL=https://fiecugxopjxzqfdnaqsu.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. **Permissions Insuffisantes**
**Symptôme :** Erreurs 403 ou 500 dans les logs

**Vérification :**
- Service role key a-t-il les permissions nécessaires ?
- Bucket `table-snapshots` existe-t-il ?
- Table `table_snapshots_index` existe-t-elle ?

**Solution :**
```sql
-- Créer le bucket de stockage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('table-snapshots', 'table-snapshots', false);

-- Créer la table d'index
CREATE TABLE IF NOT EXISTS table_snapshots_index (
    snapshot_date DATE PRIMARY KEY,
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    metadata JSONB
);
```

### 4. **Configuration Cron Non Pris en Compte**
**Symptôme :** Configuration locale correcte mais pas d'exécution

**Vérification :**
```bash
# Vérifier la configuration déployée
supabase functions logs snapshot_staff_table --follow
```

**Solution :**
- Redéployer la fonction après modification du cron.json
- Vérifier que le fichier cron.json est bien inclus dans le déploiement

### 5. **Problème de Timezone**
**Symptôme :** Exécution à des heures inattendues

**Vérification :**
- Configuration timezone : `Europe/Paris`
- Vérifier la synchronisation du serveur Supabase

**Solution :**
```json
{
  "cron": "* * * * *",
  "timezone": "Europe/Paris"
}
```

## 🔧 Étapes de Diagnostic

### Étape 1 : Vérifier le Déploiement
```bash
# 1. Vérifier l'état des fonctions
supabase functions list

# 2. Vérifier les logs en temps réel
supabase functions logs snapshot_staff_table --follow

# 3. Redéployer si nécessaire
supabase functions deploy snapshot_staff_table
```

### Étape 2 : Vérifier les Variables d'Environnement
```bash
# 1. Lister les secrets
supabase secrets list

# 2. Vérifier les variables critiques
supabase secrets list | grep SUPABASE
```

### Étape 3 : Tester la Fonction Manuellement
```bash
# 1. Appeler la fonction avec curl
curl -X POST https://fiecugxopjxzqfdnaqsu.supabase.co/functions/v1/snapshot_staff_table \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# 2. Vérifier la réponse
# 3. Vérifier les logs pour les erreurs
```

### Étape 4 : Vérifier l'Infrastructure
```sql
-- 1. Vérifier l'existence du bucket
SELECT * FROM storage.buckets WHERE id = 'table-snapshots';

-- 2. Vérifier l'existence de la table d'index
SELECT * FROM table_snapshots_index LIMIT 5;

-- 3. Vérifier les permissions
SELECT * FROM information_schema.role_table_grants 
WHERE table_name = 'table_snapshots_index';
```

## 📊 Scripts de Test

### 1. **check-snapshot-deployment.js**
```bash
node check-snapshot-deployment.js
```
- Vérifie l'accessibilité de la fonction
- Teste la réponse HTTP
- Vérifie la configuration cron locale

### 2. **monitor-snapshot-logs.js**
```bash
node monitor-snapshot-logs.js
```
- Surveille l'activité de la fonction
- Vérifications périodiques
- Interface de surveillance en temps réel

### 3. **test-snapshot-function.html**
- Interface web pour tester la fonction
- Tests manuels et diagnostics
- Affichage des erreurs et statuts

## 🎯 Solutions Recommandées

### Solution Immédiate (Test)
1. **Redéployer la fonction** avec la nouvelle configuration cron
2. **Vérifier les variables d'environnement** sur Supabase
3. **Tester manuellement** la fonction pour identifier les erreurs

### Solution à Long Terme
1. **Implémenter un système de monitoring** des snapshots
2. **Ajouter des logs détaillés** pour le debugging
3. **Créer des alertes** en cas d'échec des snapshots

## 📝 Commandes Utiles

```bash
# Redéployer la fonction
supabase functions deploy snapshot_staff_table

# Voir les logs en temps réel
supabase functions logs snapshot_staff_table --follow

# Vérifier l'état des fonctions
supabase functions list

# Lister les secrets
supabase secrets list

# Tester la fonction
curl -X POST https://fiecugxopjxzqfdnaqsu.supabase.co/functions/v1/snapshot_staff_table
```

## 🔍 Prochaines Étapes

1. **Redéployer la fonction** avec `supabase functions deploy`
2. **Vérifier les logs** en temps réel
3. **Tester manuellement** la fonction
4. **Identifier l'erreur spécifique** dans les logs
5. **Appliquer la solution** appropriée

---

**💡 Conseil :** Commencez par redéployer la fonction, car c'est souvent la cause principale des problèmes de cron non pris en compte.
