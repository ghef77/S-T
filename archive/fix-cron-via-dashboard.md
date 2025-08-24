# 🔧 Correction Cron via Dashboard Supabase

## 🚨 Problème Identifié
- **Erreur SQL** : `permission denied for table job`
- **Cause** : Pas d'accès direct à la table `cron.job`
- **Solution** : Utiliser le Dashboard Supabase

## 🎯 Plan de Correction

### Étape 1 : Supprimer la Fonction Edge Problématique

1. **Ouvrez** [Supabase Dashboard](https://supabase.com/dashboard)
2. **Sélectionnez** votre projet
3. **Allez** dans **Edge Functions**
4. **Trouvez** `snapshot_staff_table`
5. **Cliquez** sur **"..."** → **"Delete"**
6. **Confirmez** la suppression

### Étape 2 : Nettoyer la Table des Snapshots

**Exécutez ce script SQL simplifié dans SQL Editor :**

```sql
-- =====================================================
-- NETTOYAGE SIMPLE - SANS MODIFICATION CRON
-- =====================================================

-- 1. Supprimer TOUS les snapshots existants
DELETE FROM table_snapshots_index;

-- 2. Vérifier que la table est vide
SELECT 
    'Vérification nettoyage' as action,
    COUNT(*) as snapshots_restants
FROM table_snapshots_index;

-- 3. Vérifier l'état final
SELECT 
    'État final' as check_type,
    COUNT(*) as snapshots_in_table
FROM table_snapshots_index;
```

### Étape 3 : Recréer la Fonction Edge

1. **Dans Edge Functions**, cliquez sur **"New Function"**
2. **Nom** : `snapshot_staff_table`
3. **Code** : Utilisez le code corrigé (quotidien)
4. **Cron** : `0 10 * * *` (10h00 quotidien)
5. **Timezone** : `Europe/Paris`
6. **Cliquez** sur **"Deploy"**

### Étape 4 : Vérifier la Configuration

1. **Vérifiez** que la fonction est déployée
2. **Vérifiez** que le cron est configuré sur `0 10 * * *`
3. **Attendez** le prochain snapshot à 10h00

## 📋 Code de la Fonction Edge Corrigée

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get current date in Europe/Paris timezone
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const snapshotDate = parisTime.toISOString().split('T')[0];
    
    console.log(`🔄 Starting DAILY snapshot for date: ${snapshotDate}`);

    // Fetch all data from staffTable
    const { data: tableData, error: fetchError } = await supabase
      .from('staffTable')
      .select('*')
      .order('No', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch table data: ${fetchError.message}`);
    }

    const rowCount = tableData?.length || 0;
    console.log(`📊 Fetched ${rowCount} rows from staffTable`);

    // Prepare snapshot data
    const snapshotData = {
      data: tableData || [],
      metadata: {
        table: 'staffTable',
        rowCount,
        createdAt: new Date().toISOString(),
        snapshotDate,
        version: '2.0.0',
        type: 'DAILY_SNAPSHOT'
      }
    };

    const jsonContent = JSON.stringify(snapshotData, null, 2);
    const fileSize = new TextEncoder().encode(jsonContent).length;

    // Generate storage path: YYYY/MM/DD/DAILY_staffTable.json
    const currentTime = new Date();
    const year = currentTime.getFullYear();
    const month = (currentTime.getMonth() + 1).toString().padStart(2, '0');
    const day = currentTime.getDate().toString().padStart(2, '0');
    
    const objectPath = `${year}/${month}/${day}/DAILY_staffTable.json`;

    // Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('table-snapshots')
      .upload(objectPath, jsonContent, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload snapshot: ${uploadError.message}`);
    }

    console.log(`💾 Daily snapshot uploaded to: ${objectPath}`);

    // Upsert index record
    const { error: indexError } = await supabase
      .from('table_snapshots_index')
      .upsert({
        snapshot_date: snapshotDate,
        object_path: objectPath,
        row_count: rowCount,
        file_size_bytes: fileSize,
        metadata: snapshotData.metadata
      }, {
        onConflict: 'snapshot_date,created_at'
      });

    if (indexError) {
      throw new Error(`Failed to update index: ${indexError.message}`);
    }

    console.log(`✅ Daily snapshot index updated for date: ${snapshotDate}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Daily snapshot completed for ${snapshotDate}`,
      data: {
        snapshotDate,
        rowCount,
        fileSize,
        objectPath,
        timestamp: new Date().toISOString(),
        type: 'DAILY'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Snapshot error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
```

## 🕐 Configuration Cron

**Dans le fichier `cron.json` :**

```json
{
  "cron": "0 10 * * *",
  "timezone": "Europe/Paris"
}
```

## ✅ Vérification

1. **Attendez** le prochain snapshot à 10h00
2. **Vérifiez** qu'il n'y a qu'1 snapshot par jour
3. **Utilisez** le script de surveillance pour confirmer

## 🚀 Commandes de Déploiement

```bash
# Redéployer la fonction
supabase functions deploy snapshot_staff_table

# Vérifier le statut
supabase functions list
```

## 📊 Surveillance Post-Correction

Utilisez le script `monitor-cron-fix.js` pour vérifier que :
- ✅ Moins d'1 snapshot par heure
- ✅ Snapshots créés à 10h00
- ✅ Pas de snapshots chaque minute
