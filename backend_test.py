#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Global Treasury Intelligence Platform
Tests all treasury management endpoints for functionality and data integrity.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class TreasuryAPITester:
    def __init__(self, base_url="https://treasury-intellect.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def make_request(self, method: str, endpoint: str, data: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}", 0
                
            return response.status_code == 200, response.json(), response.status_code
            
        except requests.exceptions.Timeout:
            return False, "Request timeout", 0
        except requests.exceptions.ConnectionError:
            return False, "Connection error", 0
        except Exception as e:
            return False, f"Request error: {str(e)}", 0

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, data, status = self.make_request('GET', '')
        
        if success and 'message' in data:
            self.log_test("API Root Endpoint", True, f"Status: {status}, Message: {data['message']}")
            return True
        else:
            self.log_test("API Root Endpoint", False, f"Status: {status}", data)
            return False

    def test_initialization(self):
        """Test system initialization endpoints"""
        print("\n🔧 Testing System Initialization...")
        
        # Test master data initialization
        success, data, status = self.make_request('POST', 'treasury/setup/initialize')
        
        if success and data.get('status') == 'success':
            counts = data.get('counts', {})
            details = f"Initialized - Countries: {counts.get('countries', 0)}, Entities: {counts.get('entities', 0)}, Accounts: {counts.get('bank_accounts', 0)}"
            self.log_test("Initialize Master Data", True, details)
            init_success = True
        else:
            self.log_test("Initialize Master Data", False, f"Status: {status}", data)
            init_success = False
        
        # Test balance generation
        success, data, status = self.make_request('POST', 'treasury/setup/generate-balances')
        
        if success and data.get('status') == 'success':
            details = f"Generated {data.get('count', 0)} balances for date {data.get('date', 'unknown')}"
            self.log_test("Generate Sample Balances", True, details)
            balance_success = True
        else:
            self.log_test("Generate Sample Balances", False, f"Status: {status}", data)
            balance_success = False
            
        return init_success and balance_success

    def test_liquidity_management(self):
        """Test liquidity management endpoints"""
        print("\n💰 Testing Liquidity Management...")
        
        # Test global position
        success, data, status = self.make_request('GET', 'treasury/liquidity/global-position')
        
        if success and 'total_liquidity_usd' in data:
            total_liquidity = data['total_liquidity_usd']
            total_accounts = data.get('total_accounts', 0)
            details = f"Total Liquidity: ${total_liquidity:,.2f}, Accounts: {total_accounts}"
            self.log_test("Global Liquidity Position", True, details)
            global_success = True
        else:
            self.log_test("Global Liquidity Position", False, f"Status: {status}", data)
            global_success = False
        
        # Test regional liquidity
        regions = ['APAC', 'EMEA', 'AMER']
        regional_success = True
        
        for region in regions:
            success, data, status = self.make_request('GET', f'treasury/liquidity/by-region/{region}')
            
            if success and 'total_usd' in data:
                total_usd = data['total_usd']
                account_count = data.get('account_count', 0)
                details = f"{region} Total: ${total_usd:,.2f}, Accounts: {account_count}"
                self.log_test(f"Regional Liquidity - {region}", True, details)
            else:
                self.log_test(f"Regional Liquidity - {region}", False, f"Status: {status}", data)
                regional_success = False
                
        return global_success and regional_success

    def test_cash_pooling(self):
        """Test cash pooling endpoints"""
        print("\n🏊 Testing Cash Pooling...")
        
        # Test pool status
        success, data, status = self.make_request('GET', 'treasury/cash-pool/status')
        
        if success and 'pools' in data:
            pools = data['pools']
            total_pools = len(pools)
            active_pools = sum(1 for p in pools if p.get('status') == 'Active')
            details = f"Total Pools: {total_pools}, Active: {active_pools}"
            self.log_test("Cash Pool Status", True, details)
            status_success = True
        else:
            self.log_test("Cash Pool Status", False, f"Status: {status}", data)
            status_success = False
        
        # Test pool calculations for each region
        regions = ['APAC', 'EMEA', 'AMER']
        calc_success = True
        
        for region in regions:
            success, data, status = self.make_request('POST', f'treasury/cash-pool/calculate/{region}')
            
            if success and 'pool_name' in data:
                pool_name = data['pool_name']
                total_pooled = data.get('total_pooled_usd', 0)
                participants = len(data.get('participants', []))
                details = f"{pool_name}: ${total_pooled:,.2f}, Participants: {participants}"
                self.log_test(f"Cash Pool Calculation - {region}", True, details)
            else:
                self.log_test(f"Cash Pool Calculation - {region}", False, f"Status: {status}", data)
                calc_success = False
                
        return status_success and calc_success

    def test_netting(self):
        """Test netting endpoints"""
        print("\n🔄 Testing Netting...")
        
        # Test netting execution
        success, data, status = self.make_request('POST', 'treasury/netting/run')
        
        if success and data.get('status') == 'success':
            total_transactions = data.get('total_transactions', 0)
            total_netted = data.get('total_netted_usd', 0)
            details = f"Transactions: {total_transactions}, Total Netted: ${total_netted:,.2f}"
            self.log_test("Run Netting", True, details)
            run_success = True
        else:
            self.log_test("Run Netting", False, f"Status: {status}", data)
            run_success = False
        
        # Test netting results
        success, data, status = self.make_request('GET', 'treasury/netting/results')
        
        if success and 'total_transactions' in data:
            total_transactions = data['total_transactions']
            total_netted = data.get('total_netted_usd', 0)
            by_status = data.get('by_status', {})
            details = f"Transactions: {total_transactions}, Total: ${total_netted:,.2f}, Status: {by_status}"
            self.log_test("Get Netting Results", True, details)
            results_success = True
        else:
            self.log_test("Get Netting Results", False, f"Status: {status}", data)
            results_success = False
            
        return run_success and results_success

    def test_data_validation(self):
        """Test data validation endpoints"""
        print("\n🔍 Testing Data Validation...")
        
        # Test validation execution
        success, data, status = self.make_request('POST', 'treasury/validate')
        
        if success and data.get('status') == 'success':
            issues_found = data.get('issues_found', 0)
            details = f"Issues Found: {issues_found}"
            self.log_test("Run Data Validation", True, details)
            validate_success = True
        else:
            self.log_test("Run Data Validation", False, f"Status: {status}", data)
            validate_success = False
        
        # Test validation report
        success, data, status = self.make_request('GET', 'treasury/validation/report')
        
        if success and 'total_issues' in data:
            total_issues = data['total_issues']
            by_severity = data.get('by_severity', {})
            by_type = data.get('by_type', {})
            details = f"Total Issues: {total_issues}, By Severity: {by_severity}, By Type: {by_type}"
            self.log_test("Get Validation Report", True, details)
            report_success = True
        else:
            self.log_test("Get Validation Report", False, f"Status: {status}", data)
            report_success = False
            
        return validate_success and report_success

    def test_analytics(self):
        """Test analytics endpoints"""
        print("\n📊 Testing Analytics...")
        
        # Test analytics summary
        success, data, status = self.make_request('GET', 'treasury/analytics/summary')
        
        if success and 'total_liquidity_usd' in data:
            total_liquidity = data['total_liquidity_usd']
            total_accounts = data.get('total_accounts', 0)
            total_pools = data.get('total_cash_pools', 0)
            netting_txns = data.get('active_netting_transactions', 0)
            quality_issues = data.get('data_quality_issues', 0)
            details = f"Liquidity: ${total_liquidity:,.2f}, Accounts: {total_accounts}, Pools: {total_pools}, Netting: {netting_txns}, Issues: {quality_issues}"
            self.log_test("Analytics Summary", True, details)
            summary_success = True
        else:
            self.log_test("Analytics Summary", False, f"Status: {status}", data)
            summary_success = False
        
        # Test trends
        success, data, status = self.make_request('GET', 'treasury/analytics/trends')
        
        if success and 'trends' in data:
            trends = data['trends']
            period = data.get('period', 'Unknown')
            details = f"Period: {period}, Data Points: {len(trends)}"
            self.log_test("Analytics Trends", True, details)
            trends_success = True
        else:
            self.log_test("Analytics Trends", False, f"Status: {status}", data)
            trends_success = False
            
        return summary_success and trends_success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Treasury API Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test API availability
        if not self.test_root_endpoint():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Run initialization tests
        if not self.test_initialization():
            print("❌ System initialization failed. Some tests may fail.")
        
        # Run all functional tests
        self.test_liquidity_management()
        self.test_cash_pooling()
        self.test_netting()
        self.test_data_validation()
        self.test_analytics()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = TreasuryAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())