// =============================================
// FIX EDGE FUNCTION UPSERT ISSUE
// =============================================
// This script fixes the Edge Function upsert constraint issue

// The issue: Edge Function uses onConflict: 'snapshot_date,created_at' 
// but the table doesn't have a unique constraint on these columns

// Original problematic code in Edge Function:
/*
const { error: indexError } = await supabase
  .from('table_snapshots_index')
  .upsert({
    snapshot_date: snapshotDate,
    object_path: objectPath,
    row_count: rowCount,
    file_size_bytes: fileSize,
    metadata: snapshotData.metadata
  }, {
    onConflict: 'snapshot_date,created_at'  // ❌ This constraint doesn't exist
  });
*/

// Fix 1: Update the Edge Function to use a proper approach
// We need to either:
// A) Use a constraint that exists (like 'id')
// B) Use a different approach like INSERT with ON CONFLICT DO UPDATE

console.log('🔧 EDGE FUNCTION FIX RECOMMENDATIONS');
console.log('=' .repeat(50));

console.log('\n📝 ISSUE:');
console.log('Edge Function tries to use onConflict: "snapshot_date,created_at"');
console.log('But this unique constraint does not exist in table_snapshots_index');

console.log('\n🔧 SOLUTION OPTION 1 - Fix the database constraint:');
console.log('Run the fix-snapshot-issues.sql script to add the proper UNIQUE constraint');

console.log('\n🔧 SOLUTION OPTION 2 - Fix the Edge Function code:');
console.log('Update the Edge Function to use a different approach:');

const fixedEdgeFunctionCode = `
// FIXED version - Use proper conflict resolution
const { error: indexError } = await supabase
  .from('table_snapshots_index')
  .upsert({
    snapshot_date: snapshotDate,
    object_path: objectPath,
    row_count: rowCount,
    file_size_bytes: fileSize,
    metadata: snapshotData.metadata
  }, {
    onConflict: 'snapshot_date'  // Use only snapshot_date for uniqueness per day
  });
`;

console.log(fixedEdgeFunctionCode);

console.log('\n🔧 SOLUTION OPTION 3 - Use INSERT with manual conflict handling:');

const alternativeCode = `
// Alternative approach - Manual conflict handling
try {
  // Try to insert
  const { data: insertResult, error: insertError } = await supabase
    .from('table_snapshots_index')
    .insert({
      snapshot_date: snapshotDate,
      object_path: objectPath,
      row_count: rowCount,
      file_size_bytes: fileSize,
      metadata: snapshotData.metadata
    });

  if (insertError && insertError.code === '23505') {
    // Unique constraint violation, try update instead
    const { error: updateError } = await supabase
      .from('table_snapshots_index')
      .update({
        object_path: objectPath,
        row_count: rowCount,
        file_size_bytes: fileSize,
        metadata: snapshotData.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('snapshot_date', snapshotDate);

    if (updateError) throw updateError;
  } else if (insertError) {
    throw insertError;
  }
} catch (error) {
  console.error('Index update error:', error);
  throw new Error(\`Failed to update index: \${error.message}\`);
}
`;

console.log(alternativeCode);

// Function to test the fix
async function testEdgeFunctionFix() {
    const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

    console.log('\n🧪 Testing Edge Function after fixes...');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/snapshot_staff_table_daily`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: true })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Edge Function test successful!');
            console.log('📊 Result:', result);
        } else {
            console.log('❌ Edge Function still has issues:');
            console.log('📊 Error:', result);
            
            if (result.error && result.error.includes('unique or exclusion constraint')) {
                console.log('\n💡 The database constraint fix is still needed!');
                console.log('Run the fix-snapshot-issues.sql script in Supabase');
            }
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.testEdgeFunctionFix = testEdgeFunctionFix;
    console.log('\n🚀 Test function available: testEdgeFunctionFix()');
}

console.log('\n📋 NEXT STEPS:');
console.log('1. Run fix-snapshot-issues.sql in Supabase SQL Editor');
console.log('2. Run testEdgeFunctionFix() to verify the fix');
console.log('3. If still failing, update the Edge Function code with one of the solutions above');