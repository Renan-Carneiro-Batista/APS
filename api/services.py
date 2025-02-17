from db import conn
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
import io, base64

model = YOLO("models/best.pt")
CONFIDENCE_THRESHOLD = 0.5
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}

def process_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes))
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
        return None

    return best_detection, img
