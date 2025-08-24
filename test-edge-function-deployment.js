/**
 * 🧪 EDGE FUNCTION DEPLOYMENT TEST
 * 
 * This script tests if the Edge Function is properly deployed and accessible
 * Run this in the browser console on your main page
 */

(async function testEdgeFunctionDeployment() {
    console.log('🧪 Starting Edge Function Deployment Test...');
    
    // Configuration - update these if needed
    const config = {
        supabaseUrl: 'https://fiecugxopjxzqfdnaqsu.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw',
        functionName: 'snapshot_staff_table_daily'
    };
    
    const functionUrl = `${config.supabaseUrl}/functions/v1/${config.functionName}`;
    
    console.log(`🔗 Function URL: ${functionUrl}`);
    
    try {
        // Test 1: Check if function is deployed (OPTIONS request)
        console.log('📋 Test 1: Checking function deployment with OPTIONS request...');
        
        const optionsResponse = await fetch(functionUrl, {
            method: 'OPTIONS',
            headers: {
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type'
            }
        });
        
        console.log(`✅ OPTIONS Response Status: ${optionsResponse.status}`);
        console.log(`✅ OPTIONS Response Headers:`, Object.fromEntries(optionsResponse.headers.entries()));
        
        if (optionsResponse.status === 200) {
            console.log('✅ Function is deployed and responding to CORS preflight');
        } else {
            console.warn('⚠️ Unexpected OPTIONS response status:', optionsResponse.status);
        }
        
        // Test 2: Invoke the function
        console.log('📋 Test 2: Invoking the Edge Function...');
        
        const invokeResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'apikey': config.supabaseAnonKey
            }
        });
        
        console.log(`📊 Function Response Status: ${invokeResponse.status}`);
        console.log(`📊 Function Response Headers:`, Object.fromEntries(invokeResponse.headers.entries()));
        
        // Parse response
        const responseText = await invokeResponse.text();
        console.log(`📄 Raw Response:`, responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log(`📋 Parsed Response:`, responseData);
        } catch (parseError) {
            console.error('❌ Failed to parse response as JSON:', parseError);
            responseData = { rawText: responseText };
        }
        
        // Analyze response
        if (invokeResponse.status === 200) {
            if (responseData.success) {
                console.log('✅ Edge Function executed successfully!');
                console.log(`📊 Snapshot Details:`);
                console.log(`   - Date: ${responseData.data?.snapshotDate}`);
                console.log(`   - Rows: ${responseData.data?.rowCount}`);
                console.log(`   - File Size: ${responseData.data?.fileSize} bytes`);
                console.log(`   - Storage Path: ${responseData.data?.objectPath}`);
                console.log(`   - Type: ${responseData.data?.type}`);
                return { success: true, data: responseData };
            } else {
                console.error('❌ Edge Function returned error:', responseData.error);
                return { success: false, error: responseData.error };
            }
        } else if (invokeResponse.status === 404) {
            console.error('❌ Edge Function not found - Check deployment');
            return { success: false, error: 'Function not deployed' };
        } else if (invokeResponse.status === 401) {
            console.error('❌ Authentication failed - Check API key');
            return { success: false, error: 'Authentication failed' };
        } else {
            console.error(`❌ Unexpected response status: ${invokeResponse.status}`);
            return { success: false, error: `HTTP ${invokeResponse.status}` };
        }
        
    } catch (networkError) {
        console.error('❌ Network error during function test:', networkError);
        return { success: false, error: networkError.message };
    }
})().then(result => {
    console.log('🏁 Test Complete. Result:', result);
}).catch(error => {
    console.error('💥 Test failed with error:', error);
});

/**
 * DEPLOYMENT TROUBLESHOOTING GUIDE
 * 
 * If the test fails, try these steps:
 * 
 * 1. CHECK FUNCTION DEPLOYMENT:
 *    - Go to Supabase Dashboard > Edge Functions
 *    - Verify 'snapshot_staff_table_daily' is listed
 *    - Check deployment status and logs
 * 
 * 2. REDEPLOY FUNCTION:
 *    supabase functions deploy snapshot_staff_table_daily
 * 
 * 3. CHECK ENVIRONMENT VARIABLES:
 *    - Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 * 
 * 4. VERIFY PERMISSIONS:
 *    - Service role should have access to staffTable
 *    - Service role should have access to table-snapshots storage bucket
 * 
 * 5. CHECK LOGS:
 *    supabase functions logs snapshot_staff_table_daily
 * 
 * 6. TEST LOCALLY:
 *    supabase functions serve --env-file .env.local
 *    curl -X POST http://localhost:54321/functions/v1/snapshot_staff_table_daily
 */