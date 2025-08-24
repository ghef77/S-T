import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get current date in Europe/Paris timezone
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const snapshotDate = parisTime.toISOString().split('T')[0];
    
    console.log(`🔄 Starting DAILY snapshot for date: ${snapshotDate}`);
    console.log(`⏰ Current time (Paris): ${parisTime.toLocaleString('fr-FR')}`);

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
        version: '2.0.0',
        type: 'DAILY_SNAPSHOT',
        cronSchedule: '0 10 * * *',
        timezone: 'Europe/Paris'
      }
    };

    // 3. Serialize to JSON
    const jsonContent = JSON.stringify(snapshotData, null, 2);
    const fileSize = new TextEncoder().encode(jsonContent).length;

    // 4. Generate hierarchical storage path (YYYY/MM/DD/DAILY_staffTable.json)
    const currentTime = new Date();
    const year = currentTime.getFullYear();
    const month = (currentTime.getMonth() + 1).toString().padStart(2, '0');
    const day = currentTime.getDate().toString().padStart(2, '0');
    
    // Create organized folder structure for better file management
    const objectPath = `${year}/${month}/${day}/DAILY_staffTable.json`;

    // 5. Upload to Storage
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
    console.log(`📁 File size: ${(fileSize / 1024).toFixed(2)} KB`);

    // 6. Upsert index record
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

    // 7. Log success in restore log for tracking
    try {
      await supabase
        .from('snapshot_restore_log')
        .insert({
          snapshot_date: snapshotDate,
          restored_at: new Date().toISOString(),
          restored_by: 'cron_daily_function',
          restore_reason: 'Daily automated snapshot at 10:00 AM'
        });
      console.log(`📝 Log entry created in restore log`);
    } catch (logError) {
      console.warn(`⚠️ Warning: Could not create log entry: ${logError.message}`);
    }

    // 8. Return success response
    return new Response(JSON.stringify({
      success: true,
      message: `Daily snapshot completed for ${snapshotDate}`,
      data: {
        snapshotDate,
        rowCount,
        fileSize,
        objectPath,
        timestamp: new Date().toISOString(),
        type: 'DAILY',
        cronSchedule: '0 10 * * *',
        timezone: 'Europe/Paris'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Snapshot error:', error);
    
    // Return detailed error response
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      type: 'DAILY_SNAPSHOT_ERROR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
