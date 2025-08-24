# 📸 Fonction Edge : Snapshots Quotidiens

## 🎯 Objectif
Cette fonction Edge crée des snapshots quotidiens de la table `staffTable` à 10h00 (heure de Paris).

## ⏰ Configuration Cron
- **Schedule** : `0 10 * * *` (tous les jours à 10h00)
- **Timezone** : `Europe/Paris`
- **Fréquence** : 1 fois par jour (au lieu de chaque minute)

## 🔧 Fonctionnalités
- ✅ Récupération complète de la table `staffTable`
- ✅ Stockage organisé par date (YYYY/MM/DD/)
- ✅ Indexation dans `table_snapshots_index`
- ✅ Logs dans `snapshot_restore_log`
- ✅ Gestion des erreurs robuste
- ✅ Headers CORS configurés

## 📁 Structure des Fichiers
```
YYYY/MM/DD/DAILY_staffTable.json
```

## 🚀 Déploiement
```bash
# Déployer la fonction
supabase functions deploy snapshot_staff_table_daily

# Vérifier le statut
supabase functions list

# Voir les logs
supabase functions logs snapshot_staff_table_daily
```

## 🔍 Variables d'Environnement Requises
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase

## 📊 Métadonnées des Snapshots
- **Version** : 2.0.0
- **Type** : DAILY_SNAPSHOT
- **Schedule** : 0 10 * * *
- **Timezone** : Europe/Paris
- **Table** : staffTable

## ✅ Vérification
- Attendez le prochain snapshot à 10h00
- Vérifiez qu'il n'y a qu'1 snapshot par jour
- Surveillez avec `monitor-cron-fix.js`
