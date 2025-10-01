import uvicorn
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from bson import ObjectId
import boto3
from botocore.exceptions import BotoCoreError, NoCredentialsError
from io import BytesIO

# Загрузка .env
load_dotenv()

# FastAPI app
app = FastAPI(title="3D Printing Service API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде ограничить домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL)
db = client.printing_service

# JWT
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
JWT_ALGORITHM = "HS256"

# S3 (AWS или Яндекс)
S3_BUCKET = os.getenv("AWS_S3_BUCKET") or os.getenv("YC_BUCKET")
S3_REGION = os.getenv("AWS_REGION", "us-east-1")

if not S3_BUCKET:
    raise RuntimeError("❌ Не указан S3 bucket. Добавь AWS_S3_BUCKET или YC_BUCKET в .env")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=S3_REGION,
    endpoint_url=os.getenv("AWS_ENDPOINT_URL")  # ⚡ для Яндекс Cloud
)

# ==========================
# Helpers
# ==========================
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
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def upload_to_s3(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Загружает файл в S3 и возвращает ключ"""
    try:
        s3_client.upload_fileobj(
            BytesIO(file_bytes),
            S3_BUCKET,
            filename,
            ExtraArgs={"ContentType": content_type},
        )
        return filename
    except (BotoCoreError, NoCredentialsError) as e:
        print("Ошибка S3:", e)
        raise HTTPException(status_code=500, detail="Ошибка загрузки в S3")

def generate_presigned_url(key: str, expires=3600) -> str:
    """Создает временную ссылку на S3"""
    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": key},
            ExpiresIn=expires,
        )
    except Exception as e:
        print("Ошибка presigned URL:", e)
        return None

# ==========================
# Models
# ==========================
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    provider: str = "email"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ==========================
# Routes
# ==========================
@app.get("/")
def read_root():
    return {"message": "Welcome to 3D Printing Service API!"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# --------- Auth ---------
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
        "points": 100,
        "orders_count": 0,
        "models_count": 0,
        "created_at": datetime.utcnow(),
        "is_active": True,
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
            "models_count": 0,
        },
    }

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
            "models_count": user.get("models_count", 0),
        },
    }

# --------- Models ---------
@app.post("/api/models/upload")
async def upload_model(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    material_type: str = Form(...),
    estimated_print_time: float = Form(...),
    price: Optional[float] = Form(0),
    is_public: bool = Form(True),
    current_user: dict = Depends(verify_token),
):
    try:
        file_bytes = await file.read()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = os.path.basename(file.filename or "model.stl")
        key = f"models/{current_user['_id']}/{timestamp}_{safe_filename}"

        content_type = file.content_type or "application/octet-stream"
        upload_to_s3(file_bytes, key, content_type)

        model_doc = {
            "name": name.strip(),
            "description": description.strip(),
            "category": category,
            "material_type": material_type,
            "estimated_print_time": estimated_print_time,
            "price": price or 0.0,
            "is_public": is_public,
            "s3_key": key,
            "created_at": datetime.utcnow(),
            "likes": 0,
            "downloads": 0,
            "status": "pending",
            "owner_id": str(current_user["_id"]),
            "owner_name": current_user["name"],
        }

        result = await db.models.insert_one(model_doc)
        await db.users.update_one(
            {"_id": current_user["_id"]}, {"$inc": {"models_count": 1, "points": 50}}
        )

        return {"message": "Model uploaded successfully", "model_id": str(result.inserted_id)}

    except Exception as e:
        import traceback
        print("=== Upload Error ===")
        traceback.print_exc()
        print("=== End Error ===")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/models/catalog")
async def get_catalog(skip: int = 0, limit: int = 20, category: Optional[str] = None):
    query = {"is_public": True}
    if category:
        query["category"] = category

    models_cursor = db.models.find(query).skip(skip).limit(limit).sort("created_at", -1)
    models = await models_cursor.to_list(length=limit)

    catalog = []
    for model in models:
        catalog.append(
            {
                "id": str(model["_id"]),
                "name": model["name"],
                "description": model["description"],
                "category": model["category"],
                "material_type": model["material_type"],
                "estimated_print_time": model["estimated_print_time"],
                "price": model.get("price", 0),
                "owner_name": model.get("owner_name", "Unknown"),
                "likes": model.get("likes", 0),
                "downloads": model.get("downloads", 0),
                "created_at": model["created_at"].isoformat(),
                "file_url": generate_presigned_url(model["s3_key"]) if "s3_key" in model else None,  # ✅
            }
        )

    total_count = await db.models.count_documents(query)
    return {
        "models": catalog,
        "total": total_count,
        "page": skip // limit + 1,
        "per_page": limit,
    }


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
        "price": model.get("price"),
        "owner_name": model.get("owner_name", "Unknown"),
        "likes": model.get("likes", 0),
        "downloads": model.get("downloads", 0),
        "created_at": model["created_at"].isoformat(),
        "file_url": generate_presigned_url(model["s3_key"]),
    }

# ==========================
# Run
# ==========================
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
