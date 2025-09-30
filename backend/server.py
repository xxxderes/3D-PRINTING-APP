import uvicorn

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import jwt
from datetime import datetime, timedelta
import bcrypt
from bson import ObjectId

# Загрузка переменных окружения
load_dotenv()

app = FastAPI(title="3D Printing Service API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все источники для CORS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение к базе данных MongoDB
MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL)
db = client.printing_service

# Безопасность
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
JWT_ALGORITHM = "HS256"

# Модели данных
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
    estimated_print_time: int  # в минутах
    file_data: str  # base64 закодированные данные
    file_format: str  # stl, obj, 3mf
    price: Optional[float] = None
    is_public: bool = True

class PrintCalculation(BaseModel):
    material_type: str  # PLA, ABS, PETG, и т.д.
    print_time_hours: float
    electricity_cost_per_hour: float = 5.0  # рубли за час
    model_complexity: str  # simple, medium, complex
    infill_percentage: int = 20
    layer_height: float = 0.2

class Order(BaseModel):
    model_id: str
    calculation: PrintCalculation
    total_price: float
    delivery_address: str
    phone: str

# Хелперы
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

# Роуты

@app.get("/")
def read_root():
    return {"message": "Welcome to 3D Printing Service API!"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Маршрут для регистрации пользователя
@app.post("/api/auth/register")
async def register_user(user_data: UserRegister):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed_password,
        "provider": user_data.provider,
        "points": 100,  # Приветственный бонус
        "orders_count": 0,
        "models_count": 0,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db.users.insert_one(user_doc)
    
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

# Маршрут для входа пользователя
@app.post("/api/auth/login")
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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

# Маршрут для загрузки 3D моделей
@app.post("/api/models/upload")
async def upload_3d_model(model_data: User3DModel, current_user: dict = Depends(verify_token)):
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
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"models_count": 1, "points": 50}}  # 50 points for uploading
    )
    
    return {
        "message": "Model uploaded successfully",
        "model_id": str(result.inserted_id),
        "points_earned": 50
    }

# Маршрут для получения каталога моделей
@app.get("/api/models/catalog")
async def get_catalog(skip: int = 0, limit: int = 20, category: Optional[str] = None):
    query = {"is_public": True}
    if category:
        query["category"] = category
    
    models_cursor = db.models.find(query).skip(skip).limit(limit).sort("created_at", -1)
    models = await models_cursor.to_list(length=limit)
    
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

# Маршрут для получения модели по ID
@app.get("/api/models/{model_id}")
async def get_model_details(model_id: str):
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

# Запуск приложения
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
