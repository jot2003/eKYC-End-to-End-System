import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def verify_liveness(
    selfie_image: np.ndarray,
    liveness_passed: bool,
    challenge_responses: list[dict] | None = None,
) -> dict:
    """Verify liveness from client-side challenge results + server-side image checks.

    Args:
        selfie_image: The selfie captured after liveness passed on client
        liveness_passed: Whether client-side liveness challenges were passed
        challenge_responses: List of challenge results from client
            e.g. [{"type": "blink", "passed": true}, {"type": "turn_head", "passed": true}]

    Returns:
        {"passed": bool, "score": float, "checks": dict}
    """
    checks = {
        "client_liveness": liveness_passed,
        "face_detected": False,
        "face_size_ok": False,
        "single_face": False,
        "not_screen_capture": False,
    }

    h, w = selfie_image.shape[:2]

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    gray = cv2.cvtColor(selfie_image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))

    if len(faces) >= 1:
        checks["face_detected"] = True

    if len(faces) == 1:
        checks["single_face"] = True

    if len(faces) >= 1:
        fx, fy, fw, fh = faces[0]
        face_area_ratio = (fw * fh) / (w * h)
        checks["face_size_ok"] = face_area_ratio > 0.02

    checks["not_screen_capture"] = _check_not_screen(selfie_image)

    passed_checks = sum(1 for v in checks.values() if v)
    total_checks = len(checks)
    score = passed_checks / total_checks

    overall_passed = (
        checks["client_liveness"]
        and checks["face_detected"]
        and checks["face_size_ok"]
    )

    native_checks = {k: bool(v) for k, v in checks.items()}

    logger.info(
        "Liveness verify: passed=%s, score=%.2f, checks=%s",
        overall_passed, score, native_checks,
    )

    return {
        "passed": bool(overall_passed),
        "score": round(float(score), 2),
        "checks": native_checks,
    }


def _check_not_screen(image: np.ndarray) -> bool:
    """Heuristic check that image is not a photo of a screen (moire pattern detection)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    f = np.fft.fft2(gray.astype(np.float32))
    fshift = np.fft.fftshift(f)
    magnitude = np.log1p(np.abs(fshift))

    h, w = magnitude.shape
    cy, cx = h // 2, w // 2
    r = min(h, w) // 4
    high_freq = magnitude[cy - r:cy + r, cx - r:cx + r]
    center_r = r // 4
    low_freq = magnitude[cy - center_r:cy + center_r, cx - center_r:cx + center_r]

    if low_freq.mean() < 1:
        return True

    ratio = high_freq.mean() / low_freq.mean()

    return ratio < 0.6
