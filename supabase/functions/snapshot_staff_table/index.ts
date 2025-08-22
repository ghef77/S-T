import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get current date in Europe/Paris timezone
    const now = new Date()
    const parisTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}))
    const snapshotDate = parisTime.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log(`🔄 Starting minute snapshot for date: ${snapshotDate}`)

    // 1. Fetch all data from staffTable
    const { data: tableData, error: fetchError } = await supabase
      .from('staffTable')
      .select('*')
      .order('No', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch table data: ${fetchError.message}`)
    }

    const rowCount = tableData?.length || 0
    console.log(`📊 Fetched ${rowCount} rows from staffTable`)

    // 2. Prepare snapshot data
    const snapshotData = {
      data: tableData || [],
      metadata: {
        table: 'staffTable',
        rowCount,
        createdAt: new Date().toISOString(),
        snapshotDate,
        version: '1.0.0'
      }
    }

    // 3. Serialize to JSON
    const jsonContent = JSON.stringify(snapshotData, null, 2)
    const fileSize = new TextEncoder().encode(jsonContent).length

    // 4. Generate storage path (YYYY/MM/DD/staffTable.json)
    const dateParts = snapshotDate.split('-')
    const year = dateParts[0]
    const month = dateParts[1]
    const day = dateParts[2]
    const objectPath = `${year}/${month}/${day}/staffTable.json`

    // 5. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('table-snapshots')
      .upload(objectPath, jsonContent, {
        contentType: 'application/json',
        upsert: true // Overwrite if exists
      })

    if (uploadError) {
      throw new Error(`Failed to upload snapshot: ${uploadError.message}`)
    }

    console.log(`💾 Snapshot uploaded to: ${objectPath}`)

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
        onConflict: 'snapshot_date'
      })

    if (indexError) {
      throw new Error(`Failed to update index: ${indexError.message}`)
    }

    console.log(`✅ Snapshot index updated for date: ${snapshotDate}`)

    // 7. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Minute snapshot completed for ${snapshotDate}`,
        data: {
          snapshotDate,
          rowCount,
          fileSize,
          objectPath,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Snapshot error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
