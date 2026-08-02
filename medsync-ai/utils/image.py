import io
import cv2
import numpy as np
from PIL import Image

def validate_image_bytes(image_bytes: bytes) -> bool:
    try:
        # Avoid .verify() as it forces a full decode or requires it later anyway.
        # Just open to check if it's a valid image header.
        Image.open(io.BytesIO(image_bytes))
        return True
    except Exception:
        return False

def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def bytes_to_pil(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")
