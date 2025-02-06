from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
import psycopg2
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
import io
import base64
from reportlab.pdfgen import canvas
from fastapi import Path
from fastapi.responses import Response

# Configuração do banco de dados
DB_USER = "postgres"
DB_PASSWORD = "12345"
DB_HOST = "localhost"
DB_NAME = "haircheck"

conn = psycopg2.connect(
    user=DB_USER, password=DB_PASSWORD, host=DB_HOST, database=DB_NAME
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class User(BaseModel):
    id: str
    name: str
    email: str

model = YOLO("models/best.pt")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
CONFIDENCE_THRESHOLD = 0.5


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


@app.post("/analyze_image/")
async def analyze_image(image: UploadFile = File(...), user_id: str = Form(...)):
    if not user_id:
        raise HTTPException(status_code=400, detail="ID do usuário é obrigatório.")

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato de imagem inválido.")

    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents))
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
                            "box": box.xyxy[0].tolist(),
                        }

        if not best_detection:
            raise HTTPException(status_code=404, detail="Nenhuma detecção com confiança suficiente.")

        x1, y1, x2, y2 = best_detection["box"]
        draw = ImageDraw.Draw(img)
        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        font = ImageFont.load_default()
        text = f"{best_detection['class']} {best_detection['confidence']:.2f}"
        draw.text((x1, y1 - 10), text, fill="red", font=font)

        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)
        img_bytes = img_byte_arr.getvalue()

        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO detections (user_id, class_detected, confidence, image)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, best_detection["class"], best_detection["confidence"], img_bytes),
            )
            conn.commit()

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


@app.get("/user_detections/insights/")
async def get_user_detections_insights(user_id: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, class_detected, confidence, detected_at
                FROM detections
                WHERE user_id = %s
                ORDER BY detected_at DESC
            """, (user_id,))
            all_detections = cursor.fetchall()

        grouped_detections = {}
        for detection in all_detections:
            class_name = detection["class_detected"]
            detection["image_url"] = f"http://localhost:8000/image/{detection['id']}"  # Adicionando a URL da imagem

            if class_name not in grouped_detections:
                grouped_detections[class_name] = []
            grouped_detections[class_name].append(detection)

        sorted_grouped_detections = dict(
            sorted(grouped_detections.items(), key=lambda item: item[1][0]["detected_at"], reverse=True)
        )

        return {"grouped_detections": sorted_grouped_detections}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao recuperar histórico: {str(e)}")

@app.get("/export_user_data/")
async def export_user_data(user_id: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT class_detected, confidence, detected_at
                FROM detections 
                WHERE user_id = %s 
                ORDER BY detected_at DESC
            """, (user_id,))
            detections = cursor.fetchall()

        if not detections:
            raise HTTPException(status_code=404, detail="Nenhum histórico para exportar.")

        pdf_path = f"user_{user_id}_history.pdf"
        c = canvas.Canvas(pdf_path)
        c.drawString(100, 800, f"Histórico de Detecções - Usuário {user_id}")

        y = 750
        for detection in detections:
            c.drawString(100, y, f"Classe: {detection['class_detected']} | Confiança: {detection['confidence']:.2f} | Data: {detection['detected_at']}")
            y -= 20
            if y < 50:
                c.showPage()
                y = 800

        c.save()

        return FileResponse(pdf_path, media_type='application/pdf', filename=f"historico_{user_id}.pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao exportar PDF: {str(e)}")

@app.get("/suggestions/class/{class_name}")
async def get_suggestions(class_name: str):
    class_name_decoded = class_name.replace("%20", " ")  # Corrige espaços na URL

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT recommendation FROM recommendations WHERE class_detected = %s",
                (class_name_decoded,)
            )
            result = cursor.fetchone()

        if result:
            return {"class": class_name_decoded, "suggestion": result["recommendation"]}
        else:
            raise HTTPException(status_code=404, detail=f"Sugestões não encontradas para a classe {class_name_decoded}.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar sugestão: {str(e)}")

@app.get("/image/{detection_id}")
async def get_detection_image(detection_id: int):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT image FROM detections WHERE id = %s", (detection_id,)
            )
            image_data = cursor.fetchone()

        if not image_data or not image_data[0]:
            raise HTTPException(status_code=404, detail="Imagem não encontrada")

        return Response(content=image_data[0], media_type="image/jpeg")  # Certifique-se de que é JPEG ou PNG

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao recuperar imagem: {str(e)}")
