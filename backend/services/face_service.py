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

COSINE_MATCH_THRESHOLD = 0.40


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
            logger.warning("No face detected on CCCD image")
            return FaceResult(status="no_face_on_cccd", score=0.0)

        selfie_faces = self._app.get(selfie_image)
        if not selfie_faces:
            logger.warning("No face detected on selfie")
            return FaceResult(status="no_face_on_selfie", score=0.0)

        cccd_emb = cccd_faces[0].embedding
        selfie_emb = selfie_faces[0].embedding

        score = float(self._cosine_similarity(cccd_emb, selfie_emb))
        status = "match" if score >= COSINE_MATCH_THRESHOLD else "no_match"

        logger.info("Face verification: score=%.4f, status=%s", score, status)
        return FaceResult(status=status, score=round(score, 4))

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        a_norm = a / (np.linalg.norm(a) + 1e-8)
        b_norm = b / (np.linalg.norm(b) + 1e-8)
        return float(np.dot(a_norm, b_norm))
