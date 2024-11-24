from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
import psycopg2
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
import io
import base64

# Configuração do banco de dados
DB_USER = "postgres"
DB_PASSWORD = "12345"
DB_HOST = "localhost"
DB_NAME = "haircheck"

# Conexão com o banco de dados
conn = psycopg2.connect(
    user=DB_USER, password=DB_PASSWORD, host=DB_HOST, database=DB_NAME
)

# Inicialização do FastAPI
app = FastAPI()

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Atualize para o domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo para o login do usuário
class User(BaseModel):
    id: str
    name: str
    email: str

# Configuração do modelo YOLO
model = YOLO("models/best.pt")  # Certifique-se de que este caminho está correto
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg"}
CONFIDENCE_THRESHOLD = 0.5

# Rota para login/autenticação do usuário
@app.post("/api/login")
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


# Rota para análise de imagem
@app.post("/analyze_image/")
async def analyze_image(
    image: UploadFile = File(...), 
    user_id: str = Form(...)
):
    if not user_id:
        raise HTTPException(status_code=400, detail="ID do usuário é obrigatório.")

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato de imagem inválido. Envie uma imagem JPEG ou PNG.")

    try:
        # Ler a imagem enviada
        contents = await image.read()
        img = Image.open(io.BytesIO(contents))

        # Realizar a detecção
        results = model(img)
        best_detection = None
        for result in results:
            for box in result.boxes:
                conf = float(box.conf[0])
                if conf >= CONFIDENCE_THRESHOLD:
                    cls = model.names[int(box.cls[0])]
                    if best_detection is None or conf > best_detection["confidence"]:
                        best_detection = {
                            "class": cls,
                            "confidence": conf,
                            "box": box.xyxy[0].tolist(),  # x1, y1, x2, y2
                        }

        if not best_detection:
            raise HTTPException(status_code=404, detail="Nenhuma detecção com confiança suficiente.")

        # Desenhar a detecção na imagem
        x1, y1, x2, y2 = best_detection["box"]
        draw = ImageDraw.Draw(img)
        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        font = ImageFont.load_default()
        text = f"{best_detection['class']} {best_detection['confidence']:.2f}"
        draw.text((x1, y1 - 10), text, fill="red", font=font)

        # Converter a imagem processada para bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)
        img_bytes = img_byte_arr.getvalue()

        # Salvar a detecção no banco de dados
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO detections (user_id, class_detected, confidence, image)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user_id, best_detection["class"], best_detection["confidence"], img_bytes),
                )
                conn.commit()
        except Exception as db_error:
            raise HTTPException(status_code=500, detail=f"Erro ao salvar no banco de dados: {str(db_error)}")

        # Retornar a imagem e as informações de detecção
        img_base64 = base64.b64encode(img_bytes).decode("utf-8")
        return JSONResponse(
            content={
                "image": img_base64,
                "detection_info": {
                    "class": best_detection["class"],
                    "confidence": best_detection["confidence"],
                },
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar a imagem: {str(e)}")


# Rota para recuperar o histórico de detecções de um usuário
@app.get("/user_detections/")
async def get_user_detections(user_id: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, class_detected, confidence, detected_at 
                FROM detections 
                WHERE user_id = %s 
                ORDER BY detected_at DESC
                """,
                (user_id,)
            )
            detections = cursor.fetchall()

        if not detections:
            raise HTTPException(status_code=404, detail="Nenhum histórico encontrado para este usuário.")

        return {"detections": detections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao recuperar histórico: {str(e)}")


# Rota para recuperar uma imagem do banco
@app.get("/get_image/{detection_id}")
async def get_image(detection_id: int):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT image FROM detections WHERE id = %s", (detection_id,))
            result = cursor.fetchone()
            if result and result[0]:
                img_bytes = result[0]
                return JSONResponse(
                    content={
                        "image": base64.b64encode(img_bytes).decode("utf-8")
                    }
                )
            else:
                raise HTTPException(status_code=404, detail="Imagem não encontrada.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao recuperar imagem: {str(e)}")
