import sys
import types
import logging

import cv2
import numpy as np

from backend.models.schemas import FaceResult

logger = logging.getLogger(__name__)

_face3d = types.ModuleType("insightface.thirdparty.face3d")
_face3d.mesh = types.ModuleType("insightface.thirdparty.face3d.mesh")
sys.modules["insightface.thirdparty.face3d"] = _face3d
sys.modules["insightface.thirdparty.face3d.mesh"] = _face3d.mesh

COSINE_MATCH_THRESHOLD = 0.35


class FaceService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        logger.info("Loading InsightFace model (buffalo_l)...")
        from insightface.app import FaceAnalysis
        self._app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        self._app.prepare(ctx_id=-1, det_size=(640, 640))
        self._initialized = True
        logger.info("InsightFace model loaded")

    def verify(self, cccd_image: np.ndarray, selfie_image: np.ndarray) -> FaceResult:
        cccd_faces = self._app.get(cccd_image)
        if not cccd_faces:
            enhanced = self._enhance_for_detection(cccd_image)
            cccd_faces = self._app.get(enhanced)
            if not cccd_faces:
                logger.warning("No face detected on CCCD image (even after enhancement)")
                return FaceResult(status="no_face_on_cccd", score=0.0)
            logger.info("Face found on CCCD after enhancement")

        selfie_faces = self._app.get(selfie_image)
        if not selfie_faces:
            logger.warning("No face detected on selfie")
            return FaceResult(status="no_face_on_selfie", score=0.0)

        cccd_face = self._pick_largest_face(cccd_faces)
        selfie_face = self._pick_largest_face(selfie_faces)

        raw_score = float(self._cosine_similarity(cccd_face.embedding, selfie_face.embedding))
        status = "match" if raw_score >= COSINE_MATCH_THRESHOLD else "no_match"
        display_score = self._to_display_score(raw_score)

        logger.info("Face verification: raw=%.4f, display=%.4f, status=%s",
                     raw_score, display_score, status)
        return FaceResult(status=status, score=round(display_score, 4))

    @staticmethod
    def _to_display_score(raw: float) -> float:
        """Map raw ArcFace cosine similarity to intuitive 0-100% scale.

        ArcFace cosine similarity ranges:
          same person  : 0.3 - 0.7 typically
          diff person  : -0.2 - 0.3
        We map to a scale where the match threshold (0.35) shows ~75%.
        """
        if raw <= 0:
            return 0.0
        if raw < COSINE_MATCH_THRESHOLD:
            return raw / COSINE_MATCH_THRESHOLD * 0.7
        return min(1.0, 0.7 + (raw - COSINE_MATCH_THRESHOLD) / (1.0 - COSINE_MATCH_THRESHOLD) * 0.3)

    @staticmethod
    def _pick_largest_face(faces: list) -> object:
        if len(faces) == 1:
            return faces[0]
        return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    @staticmethod
    def _enhance_for_detection(image: np.ndarray) -> np.ndarray:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l_ch = clahe.apply(l_ch)
        enhanced = cv2.merge([l_ch, a_ch, b_ch])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        h, w = enhanced.shape[:2]
        if max(h, w) < 640:
            scale = 640 / max(h, w)
            enhanced = cv2.resize(enhanced, (int(w * scale), int(h * scale)),
                                  interpolation=cv2.INTER_CUBIC)
        return enhanced

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        a_norm = a / (np.linalg.norm(a) + 1e-8)
        b_norm = b / (np.linalg.norm(b) + 1e-8)
        return float(np.dot(a_norm, b_norm))
