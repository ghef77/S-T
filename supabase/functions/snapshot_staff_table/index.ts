import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current date in Europe/Paris timezone
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", {
      timeZone: "Europe/Paris"
    }));
    const snapshotDate = parisTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`🔄 Starting DAILY snapshot for date: ${snapshotDate} at ${parisTime.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    
    // 1. Fetch all data from staffTable
    const { data: tableData, error: fetchError } = await supabase
      .from('staffTable')
      .select('*')
      .order('No', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch table data: ${fetchError.message}`);
    }

    const rowCount = tableData?.length || 0;
    console.log(`📊 Fetched ${rowCount} rows from staffTable`);

    // 2. Prepare snapshot data
    const snapshotData = {
      data: tableData || [],
      metadata: {
        table: 'staffTable',
        rowCount,
        createdAt: new Date().toISOString(),
        snapshotDate,
        version: '1.0.0',
        executionType: 'daily_cron_job',
        scheduledTime: '10:00 AM Europe/Paris'
      }
    };

    // 3. Serialize to JSON
    const jsonContent = JSON.stringify(snapshotData, null, 2);
    const fileSize = new TextEncoder().encode(jsonContent).length;

    // 4. Generate simplified storage path for daily snapshots
    // Daily format: YYYY-MM-DD_staffTable_daily.json
    const objectPath = `${snapshotDate}_staffTable_daily.json`;
    
    console.log(`📁 Using daily snapshot path: ${objectPath}`);

    // 5. Upload to Storage
    // Vérifier que le bucket existe
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      throw new Error(`Failed to list buckets: ${bucketError.message}`);
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'table-snapshots');
    if (!bucketExists) {
      throw new Error('Bucket "table-snapshots" does not exist. Please create it first.');
    }
    
    const { error: uploadError } = await supabase.storage
      .from('table-snapshots')
      .upload(objectPath, jsonContent, {
        contentType: 'application/json',
        upsert: true // Overwrite if exists
      });

    if (uploadError) {
      throw new Error(`Failed to upload snapshot: ${uploadError.message}`);
    }

    console.log(`💾 Daily snapshot uploaded to: ${objectPath}`);

    // 6. Upsert index record with daily execution info
    const { error: indexError } = await supabase
      .from('table_snapshots_index')
      .upsert({
        snapshot_date: snapshotDate,
        object_path: objectPath,
        row_count: rowCount,
        file_size_bytes: fileSize,
        metadata: {
          ...snapshotData.metadata,
          executionFrequency: 'daily',
          nextExecution: 'tomorrow at 10:00 AM Europe/Paris'
        }
      }, {
        onConflict: 'snapshot_date' // ✅ Corrigé : conflit uniquement sur la date
      });

    if (indexError) {
      // Gestion améliorée des erreurs d'index
      if (indexError.code === '23505') { // Violation de contrainte unique
        console.warn(`⚠️ Snapshot already exists for date ${snapshotDate}, updating existing record...`);
        
        // Essayer de mettre à jour l'enregistrement existant
        const { error: updateError } = await supabase
          .from('table_snapshots_index')
          .update({
            object_path: objectPath,
            row_count: rowCount,
            file_size_bytes: fileSize,
            metadata: {
              ...snapshotData.metadata,
              executionFrequency: 'daily',
              nextExecution: 'tomorrow at 10:00 AM Europe/Paris',
              lastUpdated: new Date().toISOString()
            }
          })
          .eq('snapshot_date', snapshotDate);
        
        if (updateError) {
          throw new Error(`Failed to update existing snapshot index: ${updateError.message}`);
        }
        
        console.log(`✅ Existing snapshot index updated for date: ${snapshotDate}`);
      } else {
        throw new Error(`Failed to update index: ${indexError.message}`);
      }
    } else {
      console.log(`✅ New snapshot index created for date: ${snapshotDate}`);
    }

    console.log(`✅ Daily snapshot index updated for date: ${snapshotDate}`);

    // 7. Return success response
    return new Response(JSON.stringify({
      success: true,
      message: `Daily snapshot completed for ${snapshotDate}`,
      executionInfo: {
        type: 'daily_cron_job',
        scheduledTime: '10:00 AM Europe/Paris',
        nextExecution: 'tomorrow at 10:00 AM Europe/Paris'
      },
      data: {
        snapshotDate,
        rowCount,
        fileSize,
        objectPath,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('❌ Daily snapshot error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      executionType: 'daily_cron_job',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
