import logging

import cv2
import numpy as np

from backend.services.vlm_service import VLMService
from backend.utils.image_utils import encode_image_base64

logger = logging.getLogger(__name__)

CLASSIFY_PROMPT = """Look at this image carefully. What type of document is it?

If it shows the FRONT side of a Vietnamese ID card (Căn cước or Căn cước công dân — with a portrait photo, name, ID number), answer: {"type": "cccd_front"}

If it shows the BACK side of a Vietnamese ID card (with MRZ lines, possibly a QR code, issue date), answer: {"type": "cccd_back"}

If it is anything else (a selfie, a random photo, not an ID card), answer: {"type": "other"}

Reply with ONLY the JSON object, nothing else."""


def classify_document(image: np.ndarray) -> dict:
    """Classify an image as cccd_front, cccd_back, or other.

    Returns {"type": "cccd_front"|"cccd_back"|"other", "confidence": str}
    """
    vlm = VLMService()

    enhanced = _quick_enhance(image)
    base64_img = encode_image_base64(enhanced)

    try:
        response = vlm._client.chat.completions.create(
            model=vlm._deployment,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": CLASSIFY_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_img}",
                                "detail": "auto",
                            },
                        },
                    ],
                }
            ],
            max_completion_tokens=100,
        )

        raw = response.choices[0].message.content or ""
        logger.info("Document classify raw: %s", raw.strip())

        import json, re
        match = re.search(r'\{[\s\S]*?\}', raw)
        if match:
            data = json.loads(match.group())
            doc_type = data.get("type", "other")
            if doc_type in ("cccd_front", "cccd_back", "other"):
                return {"type": doc_type}

        raw_lower = raw.strip().lower()
        if "cccd_front" in raw_lower:
            return {"type": "cccd_front"}
        elif "cccd_back" in raw_lower:
            return {"type": "cccd_back"}

        return {"type": "other"}

    except Exception as e:
        logger.error("Document classification failed: %s", e)
        return {"type": "unknown", "error": str(e)}


def _quick_enhance(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    if max(h, w) > 1024:
        scale = 1024 / max(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)),
                           interpolation=cv2.INTER_AREA)
    return image
