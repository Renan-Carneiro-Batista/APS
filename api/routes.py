from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse, Response
from db import conn
from models import User
from services import process_image, ALLOWED_IMAGE_TYPES

router = APIRouter()

@router.post("/api/login")
async def login(user: User):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user.id,))
            existing_user = cursor.fetchone()
            if not existing_user:
                cursor.execute(
                    "INSERT INTO users (id, name, email) VALUES (%s, %s, %s)",
                    (user.id, user.name, user.email),
                )
                conn.commit()
        return {"message": "Login bem-sucedido", "user": user.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar login: {str(e)}")

@router.post("/analyze_image/")
async def analyze_image(image: UploadFile = File(...), user_id: str = Form(...)):
    if not user_id:
        raise HTTPException(status_code=400, detail="ID do usuário é obrigatório.")

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato de imagem inválido.")

    try:
        image_bytes = await image.read()
        detection_result = process_image(image_bytes)
        if detection_result is None:
            raise HTTPException(status_code=404, detail="Nenhuma detecção válida.")

        best_detection, img = detection_result
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="JPEG")
        img_bytes = img_byte_arr.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode("utf-8")

        return JSONResponse(
            content={
                "image": img_base64,
                "detection_info": best_detection,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar a imagem: {str(e)}")
