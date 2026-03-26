import logging

import cv2
import numpy as np

from backend.models.schemas import OCRLine, OCRResult

logger = logging.getLogger(__name__)


class OCRService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        logger.info("Loading EasyOCR model (vi+en)...")
        import easyocr
        self._reader = easyocr.Reader(
            ["vi", "en"],
            gpu=False,
            verbose=False,
        )
        self._initialized = True
        logger.info("EasyOCR model loaded")

    def extract(self, image: np.ndarray) -> OCRResult:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        raw_results = self._reader.readtext(rgb)

        lines: list[OCRLine] = []
        for bbox_raw, text, confidence in raw_results:
            bbox = [[float(p[0]), float(p[1])] for p in bbox_raw]
            lines.append(OCRLine(bbox=bbox, text=text, confidence=float(confidence)))

        lines.sort(key=lambda l: (l.bbox[0][1], l.bbox[0][0]))
        full_text = "\n".join(l.text for l in lines)

        logger.info("OCR extracted %d lines, %d chars", len(lines), len(full_text))
        return OCRResult(lines=lines, full_text=full_text)

    def draw_bboxes(self, image: np.ndarray, lines: list[OCRLine]) -> np.ndarray:
        overlay = image.copy()
        for line in lines:
            pts = np.array(line.bbox, dtype=np.int32)
            cv2.polylines(overlay, [pts], isClosed=True, color=(0, 200, 0), thickness=2)

            text_pos = (int(pts[0][0]), int(pts[0][1]) - 5)
            cv2.putText(overlay, f"{line.confidence:.0%}", text_pos,
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 0), 1)
        return overlay
