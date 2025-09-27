#!/usr/bin/env python3
"""
Backend API Testing for 3D Printing Services
Tests all core API endpoints with realistic Russian data
"""

import requests
import json
import base64
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://craftcube-6.preview.emergentagent.com/api"
TEST_USER_DATA = {
    "name": "Алексей Петров",
    "email": "alexey.petrov@example.com", 
    "password": "SecurePass123!",
    "provider": "email"
}

TEST_LOGIN_DATA = {
    "email": "alexey.petrov@example.com",
    "password": "SecurePass123!"
}

# Sample 3D model data (base64 encoded STL header)
SAMPLE_STL_DATA = base64.b64encode(b"solid test_model\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test_model").decode()

TEST_MODEL_DATA = {
    "name": "Декоративная ваза",
    "description": "Красивая декоративная ваза для дома, напечатанная из PLA пластика",
    "category": "Декор",
    "material_type": "PLA",
    "estimated_print_time": 180,  # 3 hours
    "file_data": SAMPLE_STL_DATA,
    "file_format": "stl",
    "price": 500.0,
    "is_public": True
}

TEST_CALCULATION_DATA = {
    "material_type": "PLA",
    "print_time_hours": 3.0,
    "electricity_cost_per_hour": 5.0,
    "model_complexity": "medium",
    "infill_percentage": 20,
    "layer_height": 0.2
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.jwt_token = None
        self.user_id = None
        self.model_id = None
        self.order_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })
        
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_test("Health Check", True, "API is healthy", data)
                    return True
                else:
                    self.log_test("Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=TEST_USER_DATA)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.jwt_token = data["token"]
                    self.user_id = data["user"]["id"]
                    self.log_test("User Registration", True, f"User registered successfully. ID: {self.user_id}", data)
                    return True
                else:
                    self.log_test("User Registration", False, f"Missing token or user data: {data}")
                    return False
            elif response.status_code == 400:
                # User might already exist, try to continue with login
                self.log_test("User Registration", True, "User already exists (expected)", response.json())
                return True
            else:
                self.log_test("User Registration", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Registration", False, f"Error: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=TEST_LOGIN_DATA)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.jwt_token = data["token"]
                    self.user_id = data["user"]["id"]
                    self.log_test("User Login", True, f"Login successful. Token received", data)
                    return True
                else:
                    self.log_test("User Login", False, f"Missing token or user data: {data}")
                    return False
            else:
                self.log_test("User Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Login", False, f"Error: {str(e)}")
            return False
    
    def test_user_profile(self):
        """Test user profile endpoint"""
        if not self.jwt_token:
            self.log_test("User Profile", False, "No JWT token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.jwt_token}"}
            response = self.session.get(f"{BACKEND_URL}/user/profile", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "email", "points", "orders_count", "models_count"]
                if all(field in data for field in required_fields):
                    self.log_test("User Profile", True, f"Profile retrieved successfully", data)
                    return True
                else:
                    self.log_test("User Profile", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("User Profile", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Profile", False, f"Error: {str(e)}")
            return False
    
    def test_model_upload(self):
        """Test 3D model upload"""
        if not self.jwt_token:
            self.log_test("Model Upload", False, "No JWT token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.jwt_token}"}
            response = self.session.post(f"{BACKEND_URL}/models/upload", json=TEST_MODEL_DATA, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "model_id" in data and "points_earned" in data:
                    self.model_id = data["model_id"]
                    self.log_test("Model Upload", True, f"Model uploaded successfully. ID: {self.model_id}", data)
                    return True
                else:
                    self.log_test("Model Upload", False, f"Missing model_id or points_earned: {data}")
                    return False
            else:
                self.log_test("Model Upload", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Model Upload", False, f"Error: {str(e)}")
            return False
    
    def test_catalog_listing(self):
        """Test catalog listing with pagination"""
        try:
            # Test basic catalog
            response = self.session.get(f"{BACKEND_URL}/models/catalog")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["models", "total", "page", "per_page"]
                if all(field in data for field in required_fields):
                    self.log_test("Catalog Listing", True, f"Catalog retrieved. Total models: {data['total']}", data)
                    
                    # Test pagination
                    response_page2 = self.session.get(f"{BACKEND_URL}/models/catalog?skip=20&limit=10")
                    if response_page2.status_code == 200:
                        self.log_test("Catalog Pagination", True, "Pagination working correctly")
                    else:
                        self.log_test("Catalog Pagination", False, f"Pagination failed: {response_page2.status_code}")
                    
                    # Test category filter
                    response_filtered = self.session.get(f"{BACKEND_URL}/models/catalog?category=Декор")
                    if response_filtered.status_code == 200:
                        self.log_test("Catalog Filtering", True, "Category filtering working")
                    else:
                        self.log_test("Catalog Filtering", False, f"Filtering failed: {response_filtered.status_code}")
                    
                    return True
                else:
                    self.log_test("Catalog Listing", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("Catalog Listing", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Catalog Listing", False, f"Error: {str(e)}")
            return False
    
    def test_model_details(self):
        """Test model details endpoint"""
        if not self.model_id:
            self.log_test("Model Details", False, "No model ID available")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/models/{self.model_id}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "description", "category", "file_data"]
                if all(field in data for field in required_fields):
                    self.log_test("Model Details", True, f"Model details retrieved successfully", data)
                    return True
                else:
                    self.log_test("Model Details", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("Model Details", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Model Details", False, f"Error: {str(e)}")
            return False
    
    def test_price_calculator(self):
        """Test price calculator"""
        try:
            response = self.session.post(f"{BACKEND_URL}/calculator/estimate", json=TEST_CALCULATION_DATA)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["breakdown", "total_cost_rub", "estimated_completion"]
                if all(field in data for field in required_fields):
                    breakdown = data["breakdown"]
                    required_breakdown = ["electricity_cost", "material_cost", "service_fee", "complexity_multiplier"]
                    if all(field in breakdown for field in required_breakdown):
                        self.log_test("Price Calculator", True, f"Price calculated: {data['total_cost_rub']} руб", data)
                        return True
                    else:
                        self.log_test("Price Calculator", False, f"Missing breakdown fields: {breakdown}")
                        return False
                else:
                    self.log_test("Price Calculator", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("Price Calculator", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Price Calculator", False, f"Error: {str(e)}")
            return False
    
    def test_order_creation(self):
        """Test order creation"""
        if not self.jwt_token or not self.model_id:
            self.log_test("Order Creation", False, "Missing JWT token or model ID")
            return False
            
        try:
            order_data = {
                "model_id": self.model_id,
                "calculation": TEST_CALCULATION_DATA,
                "total_price": 750.0,
                "delivery_address": "Москва, ул. Тверская, д. 1, кв. 10",
                "phone": "+7 (999) 123-45-67"
            }
            
            headers = {"Authorization": f"Bearer {self.jwt_token}"}
            response = self.session.post(f"{BACKEND_URL}/orders/create", json=order_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "order_id" in data and "points_earned" in data:
                    self.order_id = data["order_id"]
                    self.log_test("Order Creation", True, f"Order created successfully. ID: {self.order_id}", data)
                    return True
                else:
                    self.log_test("Order Creation", False, f"Missing order_id or points_earned: {data}")
                    return False
            else:
                self.log_test("Order Creation", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Order Creation", False, f"Error: {str(e)}")
            return False
    
    def test_user_orders(self):
        """Test user orders listing"""
        if not self.jwt_token:
            self.log_test("User Orders", False, "No JWT token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.jwt_token}"}
            response = self.session.get(f"{BACKEND_URL}/orders/my", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "orders" in data:
                    self.log_test("User Orders", True, f"Orders retrieved. Count: {len(data['orders'])}", data)
                    return True
                else:
                    self.log_test("User Orders", False, f"Missing orders field: {data}")
                    return False
            else:
                self.log_test("User Orders", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Orders", False, f"Error: {str(e)}")
            return False
    
    def test_authentication_failures(self):
        """Test authentication failure scenarios"""
        try:
            # Test invalid login
            invalid_login = {"email": "invalid@example.com", "password": "wrongpass"}
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=invalid_login)
            
            if response.status_code == 401:
                self.log_test("Auth Failure - Invalid Login", True, "Correctly rejected invalid credentials")
            else:
                self.log_test("Auth Failure - Invalid Login", False, f"Expected 401, got {response.status_code}")
            
            # Test protected endpoint without token
            response = self.session.get(f"{BACKEND_URL}/user/profile")
            
            if response.status_code == 403:
                self.log_test("Auth Failure - No Token", True, "Correctly rejected request without token")
            else:
                self.log_test("Auth Failure - No Token", False, f"Expected 403, got {response.status_code}")
            
            # Test protected endpoint with invalid token
            headers = {"Authorization": "Bearer invalid_token"}
            response = self.session.get(f"{BACKEND_URL}/user/profile", headers=headers)
            
            if response.status_code == 401:
                self.log_test("Auth Failure - Invalid Token", True, "Correctly rejected invalid token")
            else:
                self.log_test("Auth Failure - Invalid Token", False, f"Expected 401, got {response.status_code}")
            
            return True
        except Exception as e:
            self.log_test("Authentication Failures", False, f"Error: {str(e)}")
            return False
    
    def test_invalid_data_handling(self):
        """Test invalid data handling"""
        try:
            # Test invalid registration data
            invalid_user = {"name": "", "email": "invalid-email", "password": "123"}
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=invalid_user)
            
            if response.status_code == 422:
                self.log_test("Invalid Data - Registration", True, "Correctly rejected invalid registration data")
            else:
                self.log_test("Invalid Data - Registration", False, f"Expected 422, got {response.status_code}")
            
            # Test invalid model ID
            response = self.session.get(f"{BACKEND_URL}/models/invalid_id")
            
            if response.status_code == 400:
                self.log_test("Invalid Data - Model ID", True, "Correctly rejected invalid model ID")
            else:
                self.log_test("Invalid Data - Model ID", False, f"Expected 400, got {response.status_code}")
            
            return True
        except Exception as e:
            self.log_test("Invalid Data Handling", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for 3D Printing Services")
        print("=" * 60)
        
        # Core functionality tests
        self.test_health_check()
        self.test_user_registration()
        self.test_user_login()
        self.test_user_profile()
        self.test_model_upload()
        self.test_catalog_listing()
        self.test_model_details()
        self.test_price_calculator()
        self.test_order_creation()
        self.test_user_orders()
        
        # Error handling tests
        self.test_authentication_failures()
        self.test_invalid_data_handling()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the details above.")