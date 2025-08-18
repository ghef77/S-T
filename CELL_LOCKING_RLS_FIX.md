# 🔒 Cell Locking RLS Permissions Fix

## 🚨 **Problème Identifié**

Le système de verrouillage des cellules **fonctionne localement** mais **pas en temps réel** entre utilisateurs à cause des **permissions RLS trop restrictives**.

## 🔍 **Diagnostic**

### **Symptômes:**
- ✅ **Verrouillage local** fonctionne parfaitement
- ✅ **Subscription temps réel** est active (`SUBSCRIBED`)
- ✅ **Table celllocks** est accessible
- ❌ **Aucun événement temps réel** reçu entre utilisateurs

### **Cause Racine:**
Les politiques RLS utilisent `auth.role() = 'authenticated'` qui ne fonctionne que si l'utilisateur est **vraiment authentifié** via Supabase Auth.

En **mode démo**, vous n'avez pas d'authentification réelle, donc les permissions RLS bloquent les opérations.

## 🔧 **Solution: Permissions Plus Permissives**

### **1. Exécutez le Script SQL Corrigé:**
```sql
-- Utilisez le fichier: supabase-cell-locks-setup-demo.sql
-- Ce script crée des politiques avec USING (true) au lieu de auth.role()
```

### **2. Différences Clés:**
```sql
-- ❌ ANCIEN (trop restrictif):
FOR SELECT USING (auth.role() = 'authenticated');

-- ✅ NOUVEAU (permissif pour démo):
FOR SELECT USING (true);
```

### **3. Permissions Accordées:**
- **SELECT**: Tout le monde peut lire les locks
- **INSERT**: Tout le monde peut créer des locks  
- **UPDATE**: Tout le monde peut modifier des locks
- **DELETE**: Tout le monde peut supprimer des locks

## 🧪 **Test Après Correction**

### **1. Exécutez le script SQL** dans Supabase
### **2. Rechargez la page** dans les deux onglets
### **3. Testez le verrouillage** dans un onglet
### **4. Vérifiez** que l'autre onglet reçoit l'événement temps réel

## ⚠️ **Sécurité en Production**

**ATTENTION:** Ces permissions sont **trop permissives** pour la production!

En production, utilisez:
- **Authentification réelle** via Supabase Auth
- **Politiques RLS appropriées** basées sur `auth.uid()`
- **Permissions granulaires** par utilisateur

## 📋 **Commandes de Test**

```javascript
// Test de la subscription temps réel
testRealtimeSubscription()

// Test manuel du verrouillage
testCellLocking()

// Rafraîchissement manuel
refreshCellLocks()
```

## 🎯 **Résultat Attendu**

Après correction, vous devriez voir:
```
🔔 Cell lock change received: {eventType: 'INSERT', new: {...}}
🔒 New lock detected: {cell_id: '0_2', user_id: 'user_abc123'}
🔒 Lock from other user, applying red border...
✅ Red border applied to cell: 0_2
```
