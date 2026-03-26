import base64
import io
import uuid
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def read_image_from_bytes(file_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Cannot decode image from uploaded bytes")
    return image


def encode_image_base64(image: np.ndarray, fmt: str = ".jpg") -> str:
    _, buffer = cv2.imencode(fmt, image)
    return base64.b64encode(buffer).decode("utf-8")


def save_upload(file_bytes: bytes, upload_dir: Path, suffix: str = ".jpg") -> Path:
    filename = f"{uuid.uuid4().hex}{suffix}"
    filepath = upload_dir / filename
    filepath.write_bytes(file_bytes)
    return filepath


def image_to_pil(image: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def draw_bboxes(image: np.ndarray, ocr_lines: list[dict]) -> np.ndarray:
    overlay = image.copy()
    for line in ocr_lines:
        pts = np.array(line["bbox"], dtype=np.int32)
        cv2.polylines(overlay, [pts], isClosed=True, color=(0, 200, 0), thickness=2)
    return overlay
