import logging

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

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
        logger.info("Initializing Tesseract OCR (vie+eng)...")
        try:
            version = pytesseract.get_tesseract_version()
            logger.info("Tesseract version: %s", version)
        except Exception as e:
            logger.error("Tesseract not found: %s", e)
            raise RuntimeError("Tesseract is not installed or not in PATH") from e
        self._initialized = True
        logger.info("Tesseract OCR ready")

    def extract(self, image: np.ndarray) -> OCRResult:
        enhanced = self._preprocess(image)

        lines = self._run_tesseract(enhanced, psm=6)

        for alt_psm in [3, 4]:
            extra = self._run_tesseract(enhanced, psm=alt_psm)
            lines = self._merge_results(lines, extra)

        if len(lines) < 3:
            gray_bin = self._binarize(image)
            extra = self._run_tesseract(gray_bin, psm=6)
            lines = self._merge_results(lines, extra)

        lines.sort(key=lambda l: (l.bbox[0][1], l.bbox[0][0]))
        full_text = "\n".join(l.text for l in lines)

        logger.info("OCR extracted %d lines, %d chars", len(lines), len(full_text))
        return OCRResult(lines=lines, full_text=full_text)

    def _run_tesseract(self, image: np.ndarray, psm: int = 6) -> list[OCRLine]:
        if len(image.shape) == 3:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb = image

        data = pytesseract.image_to_data(
            rgb,
            lang="vie+eng",
            config=f"--psm {psm} --oem 3",
            output_type=Output.DICT,
        )

        n = len(data["text"])
        line_groups: dict[tuple[int, int, int], list[int]] = {}

        for i in range(n):
            text = data["text"][i].strip()
            conf = int(data["conf"][i])
            if not text or conf < 10:
                continue
            key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
            if key not in line_groups:
                line_groups[key] = []
            line_groups[key].append(i)

        lines: list[OCRLine] = []
        for key in sorted(line_groups.keys()):
            indices = line_groups[key]
            words = []
            x_min, y_min = float("inf"), float("inf")
            x_max, y_max = 0.0, 0.0
            total_conf = 0.0

            for i in indices:
                words.append(data["text"][i])
                x = float(data["left"][i])
                y = float(data["top"][i])
                w = float(data["width"][i])
                h = float(data["height"][i])
                x_min = min(x_min, x)
                y_min = min(y_min, y)
                x_max = max(x_max, x + w)
                y_max = max(y_max, y + h)
                total_conf += float(data["conf"][i])

            line_text = " ".join(words)
            if len(line_text.strip()) < 2:
                continue

            avg_conf = total_conf / len(indices) / 100.0
            bbox = [
                [x_min, y_min],
                [x_max, y_min],
                [x_max, y_max],
                [x_min, y_max],
            ]
            lines.append(OCRLine(bbox=bbox, text=line_text, confidence=avg_conf))

        return lines

    @staticmethod
    def _preprocess(image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        if max(h, w) < 1000:
            scale = 1000 / max(h, w)
            image = cv2.resize(image, (int(w * scale), int(h * scale)),
                               interpolation=cv2.INTER_CUBIC)

        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        l_ch = clahe.apply(l_ch)
        enhanced = cv2.merge([l_ch, a_ch, b_ch])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        kernel = np.array([[0, -0.5, 0], [-0.5, 3, -0.5], [0, -0.5, 0]])
        enhanced = cv2.filter2D(enhanced, -1, kernel)
        return enhanced

    @staticmethod
    def _binarize(image: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        h, w = gray.shape[:2]
        if max(h, w) < 1000:
            scale = 1000 / max(h, w)
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)),
                              interpolation=cv2.INTER_CUBIC)
        return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY, 21, 8)

    @staticmethod
    def _merge_results(existing: list[OCRLine], new_lines: list[OCRLine]) -> list[OCRLine]:
        if not existing:
            return list(new_lines)
        if not new_lines:
            return existing

        merged = list(existing)
        for nline in new_lines:
            is_dup = False
            for mline in merged:
                if _bbox_iou(mline.bbox, nline.bbox) > 0.3:
                    if nline.confidence > mline.confidence:
                        mline.text = nline.text
                        mline.confidence = nline.confidence
                    is_dup = True
                    break
            if not is_dup:
                merged.append(nline)
        return merged


def _bbox_iou(bbox1: list[list[float]], bbox2: list[list[float]]) -> float:
    x1_min, y1_min = bbox1[0]
    x1_max, y1_max = bbox1[2]
    x2_min, y2_min = bbox2[0]
    x2_max, y2_max = bbox2[2]

    inter_x = max(0, min(x1_max, x2_max) - max(x1_min, x2_min))
    inter_y = max(0, min(y1_max, y2_max) - max(y1_min, y2_min))
    inter_area = inter_x * inter_y

    area1 = (x1_max - x1_min) * (y1_max - y1_min)
    area2 = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = area1 + area2 - inter_area

    return inter_area / union_area if union_area > 0 else 0.0
