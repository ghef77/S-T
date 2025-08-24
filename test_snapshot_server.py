#!/usr/bin/env python3
"""
Snapshot System Test Server
Tests the snapshot functionality via Python HTTP requests
"""

import requests
import json
import datetime
from typing import Dict, List, Optional
import sys
import time

# Supabase configuration
SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw'
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUwNTY1NywiZXhwIjoyMDcwMDgxNjU3fQ.5m7nLHxHxOkxQf8maZis7Y7jynqu2dWqIzEbgWvOTcE'

class SnapshotTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = {
            'connection': False,
            'table_access': False,
            'snapshot_index': False,
            'storage_access': False,
            'edge_function': False,
            'manual_snapshot': False,
            'errors': []
        }
        
    def get_headers(self, use_service_key=False):
        """Get headers for API requests"""
        key = SUPABASE_SERVICE_KEY if use_service_key else SUPABASE_ANON_KEY
        return {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    
    def log_success(self, message: str):
        """Log success message"""
        print(f"✅ {message}")
    
    def log_error(self, message: str, error: Exception = None):
        """Log error message"""
        error_msg = f"❌ {message}"
        if error:
            error_msg += f": {str(error)}"
        print(error_msg)
        self.results['errors'].append(error_msg)
    
    def test_connection(self) -> bool:
        """Test basic Supabase connection"""
        print("\n1. 🔌 Testing Supabase Connection...")
        try:
            response = self.session.get(
                f"{SUPABASE_URL}/rest/v1/",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                self.log_success("Supabase connection successful")
                self.results['connection'] = True
                return True
            else:
                self.log_error(f"Connection failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_error("Connection test failed", e)
            return False
    
    def test_staff_table(self) -> bool:
        """Test access to main staffTable"""
        print("\n2. 📋 Testing staffTable Access...")
        try:
            response = self.session.get(
                f"{SUPABASE_URL}/rest/v1/staffTable?select=count&limit=1",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_success(f"staffTable accessible ({len(data)} records sampled)")
                self.results['table_access'] = True
                return True
            else:
                self.log_error(f"staffTable access failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_error("staffTable test failed", e)
            return False
    
    def test_snapshot_index(self) -> bool:
        """Test snapshot index table"""
        print("\n3. 📊 Testing table_snapshots_index...")
        try:
            response = self.session.get(
                f"{SUPABASE_URL}/rest/v1/table_snapshots_index?select=id,snapshot_date,created_at&limit=10",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_success(f"table_snapshots_index accessible ({len(data)} snapshots found)")
                
                if data:
                    print("📅 Recent snapshots:")
                    for i, snapshot in enumerate(data[:5], 1):
                        print(f"   {i}. {snapshot['snapshot_date']} (Created: {snapshot['created_at'][:19]})")
                else:
                    print("   ⚠️  No snapshots found in index")
                
                self.results['snapshot_index'] = True
                return True
            elif response.status_code == 404:
                self.log_error("table_snapshots_index table does not exist")
                return False
            else:
                self.log_error(f"Snapshot index access failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_error("Snapshot index test failed", e)
            return False
    
    def test_storage_bucket(self) -> bool:
        """Test storage bucket access"""
        print("\n4. 🗄️ Testing table-snapshots Storage Bucket...")
        try:
            # Check bucket existence
            response = self.session.get(
                f"{SUPABASE_URL}/storage/v1/bucket/table-snapshots",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                self.log_success("table-snapshots bucket exists")
                
                # Try to list objects
                list_response = self.session.get(
                    f"{SUPABASE_URL}/storage/v1/object/list/table-snapshots?limit=10",
                    headers=self.get_headers()
                )
                
                if list_response.status_code == 200:
                    files = list_response.json()
                    print(f"📁 Files in bucket: {len(files)}")
                    for i, file in enumerate(files[:5], 1):
                        print(f"   {i}. {file['name']}")
                else:
                    print("   ⚠️  Could not list bucket contents (permission issue)")
                
                self.results['storage_access'] = True
                return True
            elif response.status_code == 404:
                self.log_error("table-snapshots bucket does not exist")
                return False
            else:
                self.log_error(f"Storage access failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_error("Storage test failed", e)
            return False
    
    def test_edge_function(self) -> bool:
        """Test Edge Function"""
        print("\n5. ⚡ Testing snapshot_staff_table Edge Function...")
        try:
            response = self.session.post(
                f"{SUPABASE_URL}/functions/v1/snapshot_staff_table_daily",
                headers=self.get_headers(),
                json={"test": True},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_success("Edge Function executed successfully")
                print(f"📊 Response: {result.get('message', 'Success')}")
                self.results['edge_function'] = True
                return True
            else:
                error_text = response.text
                self.log_error(f"Edge Function failed ({response.status_code}): {error_text}")
                
                # Check for specific error types
                if "unique or exclusion constraint" in error_text:
                    print("💡 This is the database constraint error - database fix may need to be re-run")
                elif "row-level security" in error_text:
                    print("💡 This is an RLS policy error - permissions need fixing")
                
                return False
                
        except Exception as e:
            self.log_error("Edge Function test failed", e)
            return False
    
    def create_test_snapshot(self) -> bool:
        """Create a test snapshot manually"""
        print("\n6. 🔨 Creating Test Snapshot...")
        try:
            # Get current table data
            response = self.session.get(
                f"{SUPABASE_URL}/rest/v1/staffTable?select=*&order=No.asc",
                headers=self.get_headers()
            )
            
            if response.status_code != 200:
                self.log_error("Could not fetch table data for snapshot")
                return False
            
            table_data = response.json()
            today = datetime.date.today().isoformat()
            
            # Create snapshot data
            snapshot_data = {
                "data": table_data,
                "metadata": {
                    "table": "staffTable",
                    "rowCount": len(table_data),
                    "createdAt": datetime.datetime.now().isoformat(),
                    "snapshotDate": today,
                    "version": "2.0.0",
                    "type": "PYTHON_TEST_SNAPSHOT"
                }
            }
            
            json_content = json.dumps(snapshot_data, indent=2)
            file_size = len(json_content.encode('utf-8'))
            
            print(f"📊 Snapshot data: {len(table_data)} rows, {file_size/1024:.2f} KB")
            
            # Try to create index entry with service key
            index_response = self.session.post(
                f"{SUPABASE_URL}/rest/v1/table_snapshots_index",
                headers=self.get_headers(use_service_key=True),
                json={
                    "snapshot_date": today,
                    "object_path": f"python_test/{today}_test.json",
                    "row_count": len(table_data),
                    "file_size_bytes": file_size,
                    "metadata": snapshot_data["metadata"]
                }
            )
            
            if index_response.status_code in [200, 201]:
                self.log_success("Test snapshot index entry created")
                self.results['manual_snapshot'] = True
                return True
            else:
                error_text = index_response.text
                self.log_error(f"Index creation failed: {error_text}")
                
                # Try upsert approach
                print("   🔄 Trying upsert approach...")
                upsert_response = self.session.post(
                    f"{SUPABASE_URL}/rest/v1/table_snapshots_index",
                    headers={**self.get_headers(use_service_key=True), 'Prefer': 'resolution=merge-duplicates'},
                    json={
                        "snapshot_date": today,
                        "object_path": f"python_test/{today}_test.json",
                        "row_count": len(table_data),
                        "file_size_bytes": file_size,
                        "metadata": snapshot_data["metadata"]
                    }
                )
                
                if upsert_response.status_code in [200, 201]:
                    self.log_success("Test snapshot created via upsert")
                    self.results['manual_snapshot'] = True
                    return True
                else:
                    self.log_error(f"Upsert also failed: {upsert_response.text}")
                    return False
                
        except Exception as e:
            self.log_error("Test snapshot creation failed", e)
            return False
    
    def generate_report(self):
        """Generate final test report"""
        print("\n" + "="*60)
        print("📊 SNAPSHOT SYSTEM TEST REPORT")
        print("="*60)
        
        print("\n🔍 TEST RESULTS:")
        print(f"   Connection:      {'✅' if self.results['connection'] else '❌'}")
        print(f"   staffTable:      {'✅' if self.results['table_access'] else '❌'}")
        print(f"   Snapshot Index:  {'✅' if self.results['snapshot_index'] else '❌'}")
        print(f"   Storage Bucket:  {'✅' if self.results['storage_access'] else '❌'}")
        print(f"   Edge Function:   {'✅' if self.results['edge_function'] else '❌'}")
        print(f"   Manual Snapshot: {'✅' if self.results['manual_snapshot'] else '❌'}")
        
        success_count = sum(self.results[key] for key in self.results if key != 'errors')
        total_tests = 6
        
        if success_count == total_tests:
            print("\n🎉 ALL TESTS PASSED!")
            print("Your snapshot system should be working correctly.")
            print("\n📋 NEXT STEPS:")
            print("1. Refresh your web application")
            print("2. Try creating a manual snapshot")
            print("3. Check if the snapshot calendar now shows dates")
        else:
            print(f"\n⚠️  {success_count}/{total_tests} TESTS PASSED")
            if self.results['errors']:
                print("\n🚨 ERRORS FOUND:")
                for i, error in enumerate(self.results['errors'], 1):
                    print(f"   {i}. {error}")
            
            print("\n🔧 RECOMMENDED FIXES:")
            if not self.results['snapshot_index']:
                print("   • Re-run fix-snapshot-issues.sql in Supabase Dashboard")
            if not self.results['storage_access']:
                print("   • Check storage bucket permissions in Supabase Dashboard")
            if not self.results['edge_function']:
                print("   • Redeploy Edge Function or fix database constraints")
        
        print(f"\n⏰ Test completed at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    def run_all_tests(self):
        """Run all snapshot tests"""
        print("🚀 STARTING SNAPSHOT SYSTEM TESTS")
        print("="*50)
        
        # Run tests in order
        self.test_connection()
        self.test_staff_table()
        self.test_snapshot_index()
        self.test_storage_bucket()
        self.test_edge_function()
        self.create_test_snapshot()
        
        # Generate final report
        self.generate_report()

def main():
    """Main function"""
    print("Python Snapshot System Tester")
    print("Testing snapshot functionality via HTTP API")
    print("-" * 50)
    
    try:
        tester = SnapshotTester()
        tester.run_all_tests()
        
        # Return appropriate exit code
        success_count = sum(tester.results[key] for key in tester.results if key != 'errors')
        return 0 if success_count >= 4 else 1  # Consider success if most tests pass
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)