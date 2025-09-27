from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import asyncio
import uvicorn
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import jwt
from datetime import datetime, timedelta
import bcrypt
import base64
from bson import ObjectId

load_dotenv()

app = FastAPI(title="3D Printing Service API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL)
db = client.printing_service

# Security
security = HTTPBearer()
JWT_SECRET = "your-secret-key-here"
JWT_ALGORITHM = "HS256"

# Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    provider: str = "email"  # email, vk, gosuslugi, yandex, google

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User3DModel(BaseModel):
    name: str
    description: str
    category: str
    material_type: str
    estimated_print_time: int  # minutes
    file_data: str  # base64 encoded
    file_format: str  # stl, obj, 3mf
    price: Optional[float] = None
    is_public: bool = True

class PrintCalculation(BaseModel):
    material_type: str  # PLA, ABS, PETG, etc.
    print_time_hours: float
    electricity_cost_per_hour: float = 5.0  # rubles per hour
    model_complexity: str  # simple, medium, complex
    infill_percentage: int = 20
    layer_height: float = 0.2

class Order(BaseModel):
    model_id: str
    calculation: PrintCalculation
    total_price: float
    delivery_address: str
    phone: str

# Helper functions
def create_jwt_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    data.update({"exp": expire})
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def calculate_material_cost(material_type: str, volume_cm3: float) -> float:
    """Calculate material cost based on type and volume"""
    material_prices = {
        "PLA": 2.5,    # rubles per cm³
        "ABS": 3.0,
        "PETG": 3.5,
        "TPU": 5.0,
        "Wood": 4.0,
        "Metal": 8.0
    }
    return material_prices.get(material_type, 2.5) * volume_cm3

def calculate_complexity_multiplier(complexity: str) -> float:
    """Get complexity multiplier for pricing"""
    multipliers = {
        "simple": 1.0,
        "medium": 1.5,
        "complex": 2.0
    }
    return multipliers.get(complexity, 1.0)

# Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Authentication routes
@app.post("/api/auth/register")
async def register_user(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user_doc = {
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed_password,
        "provider": user_data.provider,
        "points": 100,  # Welcome bonus
        "orders_count": 0,
        "models_count": 0,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db.users.insert_one(user_doc)
    
    # Create JWT token
    token = create_jwt_token({"user_id": str(result.inserted_id)})
    
    return {
        "message": "User registered successfully", 
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "name": user_data.name,
            "email": user_data.email,
            "points": 100,
            "orders_count": 0,
            "models_count": 0
        }
    }

@app.post("/api/auth/login")
async def login_user(login_data: UserLogin):
    # Find user
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    token = create_jwt_token({"user_id": str(user["_id"])})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "points": user.get("points", 0),
            "orders_count": user.get("orders_count", 0),
            "models_count": user.get("models_count", 0)
        }
    }

# User profile routes
@app.get("/api/user/profile")
async def get_user_profile(current_user: dict = Depends(verify_token)):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "points": current_user.get("points", 0),
        "orders_count": current_user.get("orders_count", 0),
        "models_count": current_user.get("models_count", 0),
        "created_at": current_user.get("created_at")
    }

# 3D Models routes
@app.post("/api/models/upload")
async def upload_3d_model(model_data: User3DModel, current_user: dict = Depends(verify_token)):
    # Create model document
    model_doc = {
        "name": model_data.name,
        "description": model_data.description,
        "category": model_data.category,
        "material_type": model_data.material_type,
        "estimated_print_time": model_data.estimated_print_time,
        "file_data": model_data.file_data,
        "file_format": model_data.file_format,
        "price": model_data.price,
        "is_public": model_data.is_public,
        "owner_id": str(current_user["_id"]),
        "owner_name": current_user["name"],
        "likes": 0,
        "downloads": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.models.insert_one(model_doc)
    
    # Update user model count and give bonus points
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"models_count": 1, "points": 50}}  # 50 points for uploading
    )
    
    return {
        "message": "Model uploaded successfully",
        "model_id": str(result.inserted_id),
        "points_earned": 50
    }

@app.get("/api/models/catalog")
async def get_catalog(skip: int = 0, limit: int = 20, category: Optional[str] = None):
    query = {"is_public": True}
    if category:
        query["category"] = category
    
    models_cursor = db.models.find(query).skip(skip).limit(limit).sort("created_at", -1)
    models = await models_cursor.to_list(length=limit)
    
    # Convert ObjectId to string and format response
    catalog = []
    for model in models:
        catalog.append({
            "id": str(model["_id"]),
            "name": model["name"],
            "description": model["description"],
            "category": model["category"],
            "material_type": model["material_type"],
            "estimated_print_time": model["estimated_print_time"],
            "price": model.get("price"),
            "owner_name": model["owner_name"],
            "likes": model.get("likes", 0),
            "downloads": model.get("downloads", 0),
            "created_at": model["created_at"].isoformat()
        })
    
    total_count = await db.models.count_documents(query)
    
    return {
        "models": catalog,
        "total": total_count,
        "page": skip // limit + 1,
        "per_page": limit
    }

@app.get("/api/models/{model_id}")
async def get_model_details(model_id: str):
    try:
        model = await db.models.find_one({"_id": ObjectId(model_id)})
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return {
            "id": str(model["_id"]),
            "name": model["name"],
            "description": model["description"],
            "category": model["category"],
            "material_type": model["material_type"],
            "estimated_print_time": model["estimated_print_time"],
            "file_data": model["file_data"],
            "file_format": model["file_format"],
            "price": model.get("price"),
            "owner_name": model["owner_name"],
            "likes": model.get("likes", 0),
            "downloads": model.get("downloads", 0),
            "created_at": model["created_at"].isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid model ID")

# Price Calculator routes
@app.post("/api/calculator/estimate")
async def calculate_print_price(calculation: PrintCalculation):
    # Base calculations
    electricity_cost = calculation.print_time_hours * calculation.electricity_cost_per_hour
    
    # Estimate material volume based on print time and complexity
    base_volume = calculation.print_time_hours * 5  # Rough estimate: 5 cm³ per hour
    infill_modifier = calculation.infill_percentage / 100.0
    layer_height_modifier = (0.3 - calculation.layer_height) + 1  # Finer layers = more material
    
    material_volume = base_volume * infill_modifier * layer_height_modifier
    material_cost = calculate_material_cost(calculation.material_type, material_volume)
    
    # Complexity multiplier
    complexity_multiplier = calculate_complexity_multiplier(calculation.model_complexity)
    
    # Service fee (30% markup)
    subtotal = (electricity_cost + material_cost) * complexity_multiplier
    service_fee = subtotal * 0.3
    total_cost = subtotal + service_fee
    
    return {
        "breakdown": {
            "electricity_cost": round(electricity_cost, 2),
            "material_cost": round(material_cost, 2),
            "service_fee": round(service_fee, 2),
            "complexity_multiplier": complexity_multiplier,
            "material_volume_cm3": round(material_volume, 2)
        },
        "total_cost_rub": round(total_cost, 2),
        "estimated_completion": {
            "hours": calculation.print_time_hours,
            "days": round(calculation.print_time_hours / 24, 1)
        }
    }

# Orders routes
@app.post("/api/orders/create")
async def create_order(order_data: Order, current_user: dict = Depends(verify_token)):
    # Verify model exists
    model = await db.models.find_one({"_id": ObjectId(order_data.model_id)})
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Create order document
    order_doc = {
        "user_id": str(current_user["_id"]),
        "user_name": current_user["name"],
        "model_id": order_data.model_id,
        "model_name": model["name"],
        "calculation": order_data.calculation.dict(),
        "total_price": order_data.total_price,
        "delivery_address": order_data.delivery_address,
        "phone": order_data.phone,
        "status": "pending",  # pending, confirmed, printing, completed, cancelled
        "payment_status": "pending",  # pending, paid, failed
        "created_at": datetime.utcnow(),
        "estimated_completion": datetime.utcnow() + timedelta(hours=order_data.calculation.print_time_hours + 24)
    }
    
    result = await db.orders.insert_one(order_doc)
    
    # Update user order count and give points
    points_earned = max(10, int(order_data.total_price / 100))  # 1 point per 100 rubles
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"orders_count": 1, "points": points_earned}}
    )
    
    return {
        "message": "Order created successfully",
        "order_id": str(result.inserted_id),
        "points_earned": points_earned,
        "status": "pending"
    }

@app.get("/api/orders/my")
async def get_user_orders(current_user: dict = Depends(verify_token)):
    orders_cursor = db.orders.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)
    orders = await orders_cursor.to_list(length=None)
    
    # Format orders
    formatted_orders = []
    for order in orders:
        formatted_orders.append({
            "id": str(order["_id"]),
            "model_name": order["model_name"],
            "total_price": order["total_price"],
            "status": order["status"],
            "payment_status": order["payment_status"],
            "created_at": order["created_at"].isoformat(),
            "estimated_completion": order.get("estimated_completion", "").isoformat() if order.get("estimated_completion") else None
        })
    
    return {"orders": formatted_orders}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)