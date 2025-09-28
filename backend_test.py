import requests
import base64
from datetime import datetime

# Configuration
BACKEND_URL = "http://127.0.0.1:8001/api"  # Локальный сервер
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

    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")

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
                if "model_id" in data:
                    self.model_id = data["model_id"]
                    self.log_test("Model Upload", True, f"Model uploaded successfully. ID: {self.model_id}", data)
                    return True
                else:
                    self.log_test("Model Upload", False, f"Missing model_id: {data}")
                    return False
            else:
                self.log_test("Model Upload", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Model Upload", False, f"Error: {str(e)}")
            return False
    
    def test_catalog_listing(self):
        """Test catalog listing"""
        try:
            response = self.session.get(f"{BACKEND_URL}/models/catalog")
            if response.status_code == 200:
                data = response.json()
                if "models" in data:
                    self.log_test("Catalog Listing", True, f"Catalog retrieved. Total models: {len(data['models'])}", data)
                    return True
                else:
                    self.log_test("Catalog Listing", False, f"Missing models field: {data}")
                    return False
            else:
                self.log_test("Catalog Listing", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Catalog Listing", False, f"Error: {str(e)}")
            return False

    def test_price_calculator(self):
        """Test price calculator"""
        try:
            response = self.session.post(f"{BACKEND_URL}/calculator/estimate", json=TEST_CALCULATION_DATA)
            if response.status_code == 200:
                data = response.json()
                if "total_cost_rub" in data:
                    self.log_test("Price Calculator", True, f"Price calculated: {data['total_cost_rub']} руб", data)
                    return True
                else:
                    self.log_test("Price Calculator", False, f"Missing total_cost_rub: {data}")
                    return False
            else:
                self.log_test("Price Calculator", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Price Calculator", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for 3D Printing Services")
        print("=" * 60)
        
        # Core functionality tests
        self.test_health_check()
        self.test_user_registration()
        self.test_user_login()
        self.test_model_upload()
        self.test_catalog_listing()
        self.test_price_calculator()
        
        print("=" * 60)

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()
