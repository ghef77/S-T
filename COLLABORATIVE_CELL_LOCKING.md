# 🔒 Système de Verrouillage Collaboratif des Cellules

## 📋 Vue d'ensemble

Ce système permet à plusieurs utilisateurs de travailler sur le même tableau simultanément sans conflits d'édition, similaire à Google Sheets ou Excel Online.

## ✨ Fonctionnalités

- **Verrouillage en temps réel** : Les cellules se verrouillent automatiquement lors de l'édition
- **Bordure rouge** : Indication visuelle claire des cellules verrouillées
- **Icône de cadenas** : 🔒 visible sur toutes les cellules verrouillées
- **Protection contre les conflits** : Empêche l'édition simultanée d'une même cellule
- **Synchronisation Supabase** : Tous les verrous sont partagés entre utilisateurs
- **Expiration automatique** : Les verrous expirent après 30 secondes d'inactivité

## 🚀 Installation

### 1. Créer la table Supabase

Exécutez le script SQL `supabase-cell-locks-setup.sql` dans votre base de données Supabase :

```sql
-- Exécuter dans l'éditeur SQL de Supabase
\i supabase-cell-locks-setup.sql
```

### 2. Vérifier les politiques RLS

Assurez-vous que les politiques de sécurité sont bien créées :

```sql
-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename = 'celllocks';
```

### 3. Tester la table

```sql
-- Insérer un verrou de test
INSERT INTO cellLocks (cell_id, user_id, expires_at) 
VALUES ('0_1', 'test_user', now() + interval '5 minutes');

-- Voir les verrous actifs
SELECT * FROM active_cell_locks;
```

## 🔧 Configuration

### Variables globales

```javascript
let lockedCells = new Map(); // Verrous locaux
let currentUser = 'user_' + Math.random().toString(36).substr(2, 9); // ID utilisateur unique
let cellLockTimeout = 30000; // 30 secondes
let cellLocksSubscription = null; // Abonnement temps réel
```

### Fonctions principales

- `lockCell(cell)` : Verrouille une cellule
- `unlockCell(cell)` : Déverrouille une cellule
- `loadExistingLocks()` : Charge les verrous existants
- `setupCellLocksRealtime()` : Configure l'abonnement temps réel

## 📱 Utilisation

### Pour l'utilisateur

1. **Cliquer sur une cellule** → Elle se verrouille automatiquement
2. **Bordure rouge** → Indique que la cellule est en cours d'édition
3. **Icône 🔒** → Visible par tous les utilisateurs
4. **Navigation** → Tab/Enter déverrouille et verrouille automatiquement
5. **Expiration** → Le verrou expire après 30 secondes d'inactivité

### Pour les autres utilisateurs

1. **Cellule verrouillée** → Bordure rouge visible
2. **Tentative d'édition** → Message d'erreur et accès refusé
3. **Mise à jour temps réel** → Les verrous apparaissent/disparaissent instantanément

## 🔄 Flux de données

```
Utilisateur A clique sur cellule → Verrou local + Supabase → Temps réel → Utilisateur B voit bordure rouge
```

## 🛠️ Dépannage

### Problèmes courants

1. **Verrous non visibles**
   - Vérifier la console pour les erreurs
   - Vérifier la connexion Supabase
   - Vérifier les politiques RLS

2. **Verrous qui ne se suppriment pas**
   - Vérifier la fonction `cleanupExpiredLocks`
   - Vérifier les triggers Supabase
   - Vérifier les permissions de suppression

3. **Synchronisation lente**
   - Vérifier la connexion temps réel
   - Vérifier la latence réseau
   - Vérifier les performances Supabase

### Logs de débogage

Le système génère des logs détaillés dans la console :

```
🔒 lockCell called for: [cellule]
🔍 Cell ID: 0_1
🔒 Cell 0_1 locked by user_abc123 in Supabase
✅ Collaborative cell locking system initialized
```

## 🔒 Sécurité

- **RLS activé** : Chaque utilisateur ne peut voir que ses propres verrous
- **Authentification requise** : Seuls les utilisateurs connectés peuvent verrouiller
- **Expiration automatique** : Évite les verrous orphelins
- **Validation des propriétaires** : Seul le propriétaire peut déverrouiller

## 📊 Performance

- **Index optimisés** : Requêtes rapides sur `cell_id` et `expires_at`
- **Nettoyage automatique** : Suppression des verrous expirés
- **Abonnement temps réel** : Mises à jour instantanées
- **Cache local** : Réduction des requêtes Supabase

## 🚀 Déploiement

1. **Exécuter le script SQL** dans Supabase
2. **Vérifier les politiques** de sécurité
3. **Tester avec plusieurs onglets** du navigateur
4. **Monitorer les logs** de la console
5. **Vérifier la synchronisation** temps réel

## 🔮 Améliorations futures

- **Noms d'utilisateur** : Afficher qui édite chaque cellule
- **Historique des verrous** : Traçabilité des modifications
- **Notifications** : Alertes quand une cellule se libère
- **Verrous de groupe** : Verrouillage de plusieurs cellules
- **Permissions avancées** : Contrôle d'accès granulaire
