from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import os
from datetime import datetime
from bson import ObjectId
from server import db  # db = client.printing_service в server.py

router = APIRouter(prefix="/models", tags=["models"])


# === ROUTES ===
@router.post("/upload")
async def upload_model(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    material_type: str = Form(...),
    estimated_print_time: float = Form(...),
    price: Optional[float] = Form(0),
    is_public: bool = Form(True),
):
    try:
        # Проверяем расширение
        file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ".stl"
        if not file_extension.startswith("."):
            file_extension = f".{file_extension}"

        # Генерируем уникальное имя
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = "".join(
            c for c in name if c.isalnum() or c in (" ", "-", "_")
        ).rstrip().replace(" ", "_")
        filename = f"{safe_name}_{timestamp}{file_extension}"
        filepath = os.path.join("uploads/models", filename)

        # Сохраняем файл на диск
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f_out:
            content = await file.read()
            f_out.write(content)

        # Документ для MongoDB
        model_doc = {
            "name": name.strip(),
            "description": description.strip(),
            "category": category,
            "material_type": material_type,
            "estimated_print_time": estimated_print_time,
            "price": price if price else 0.0,
            "is_public": is_public,
            "file_path": filepath,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "likes": 0,
            "downloads": 0,
            "owner_name": "Anonymous",  # заменить на user_id при авторизации
        }

        result = await db.models.insert_one(model_doc)
        return {"message": "Модель успешно загружена!", "model_id": str(result.inserted_id)}

    except Exception as e:
        print("Ошибка загрузки:", e)
        raise HTTPException(status_code=500, detail="Ошибка загрузки: попробуйте позже")


@router.get("/{model_id}")
async def get_model(model_id: str):
    if not ObjectId.is_valid(model_id):
        raise HTTPException(status_code=400, detail="Некорректный ID модели")

    model = await db.models.find_one({"_id": ObjectId(model_id)})
    if not model:
        raise HTTPException(status_code=404, detail="Модель не найдена")

    file_format = "stl"
    if "file_path" in model:
        file_format = os.path.splitext(model["file_path"])[1].lstrip(".")

    return {
        "id": str(model["_id"]),
        "name": model.get("name"),
        "description": model.get("description"),
        "category": model.get("category"),
        "material_type": model.get("material_type"),
        "estimated_print_time": model.get("estimated_print_time"),
        "price": model.get("price", 0),
        "is_public": model.get("is_public", True),
        "owner_name": model.get("owner_name", "Unknown"),
        "likes": model.get("likes", 0),
        "downloads": model.get("downloads", 0),
        "created_at": model.get("created_at"),
        "file_format": file_format,
    }


@router.get("/catalog")
async def get_catalog(skip: int = 0, limit: int = 20):
    cursor = db.models.find({"is_public": True}).skip(skip).limit(limit)
    models = []
    async for model in cursor:
        models.append({
            "id": str(model["_id"]),
            "name": model.get("name"),
            "description": model.get("description"),
            "category": model.get("category"),
            "material_type": model.get("material_type"),
            "estimated_print_time": model.get("estimated_print_time"),
            "price": model.get("price", 0),
            "owner_name": model.get("owner_name", "Unknown"),
            "likes": model.get("likes", 0),
            "downloads": model.get("downloads", 0),
            "created_at": model.get("created_at"),
        })
    return {"items": models, "count": len(models)}
