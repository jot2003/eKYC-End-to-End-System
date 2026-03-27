import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

ID_CARD_RATIO = 85.6 / 54.0  # ~1.585
RATIO_TOLERANCE = 0.4
MIN_AREA_RATIO = 0.08


def detect_and_crop_card(image: np.ndarray) -> np.ndarray:
    """Detect an ID card in a photo and return a cropped, perspective-corrected version."""
    h, w = image.shape[:2]

    contour = _find_card_contour(image)
    if contour is not None:
        corners = _order_corners(contour.reshape(4, 2).astype(np.float32))
        cropped = _perspective_warp(image, corners)
        logger.info("Card detected via contour, cropped to %dx%d", cropped.shape[1], cropped.shape[0])
        return cropped

    corners = _find_card_by_lines(image)
    if corners is not None:
        cropped = _perspective_warp(image, corners)
        logger.info("Card detected via line intersection, cropped to %dx%d", cropped.shape[1], cropped.shape[0])
        return cropped

    contour = _find_card_by_color(image)
    if contour is not None:
        corners = _order_corners(contour.reshape(4, 2).astype(np.float32))
        cropped = _perspective_warp(image, corners)
        logger.info("Card detected via color segmentation, cropped to %dx%d", cropped.shape[1], cropped.shape[0])
        return cropped

    cropped = _center_crop(image, 0.75)
    logger.warning("Card detection failed, using center crop %dx%d", cropped.shape[1], cropped.shape[0])
    return cropped


def _find_card_contour(image: np.ndarray) -> Optional[np.ndarray]:
    h, w = image.shape[:2]
    image_area = h * w

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    results = []

    for low, high in [(30, 120), (50, 150), (20, 80)]:
        edges = cv2.Canny(blurred, low, high)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=2)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
            area = cv2.contourArea(cnt)
            if area < image_area * MIN_AREA_RATIO:
                continue

            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

            if len(approx) == 4 and cv2.isContourConvex(approx):
                corners = _order_corners(approx.reshape(4, 2).astype(np.float32))
                cw = max(
                    np.linalg.norm(corners[1] - corners[0]),
                    np.linalg.norm(corners[2] - corners[3]),
                )
                ch = max(
                    np.linalg.norm(corners[3] - corners[0]),
                    np.linalg.norm(corners[2] - corners[1]),
                )
                if ch < 1:
                    continue
                ratio = cw / ch
                if abs(ratio - ID_CARD_RATIO) < RATIO_TOLERANCE:
                    results.append((area, approx))

    if results:
        results.sort(key=lambda x: x[0], reverse=True)
        return results[0][1]

    return None


def _find_card_by_lines(image: np.ndarray) -> Optional[np.ndarray]:
    """Fallback: use Hough lines to find card edges."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 80, minLineLength=100, maxLineGap=15)

    if lines is None or len(lines) < 4:
        return None

    h, w = image.shape[:2]
    horizontal = []
    vertical = []

    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        length = np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        if length < w * 0.15:
            continue
        if angle < 20 or angle > 160:
            horizontal.append((y1 + y2) / 2)
        elif 70 < angle < 110:
            vertical.append((x1 + x2) / 2)

    if len(horizontal) < 2 or len(vertical) < 2:
        return None

    horizontal.sort()
    vertical.sort()

    top = horizontal[0]
    bottom = horizontal[-1]
    left = vertical[0]
    right = vertical[-1]

    margin = 5
    top = max(0, top - margin)
    bottom = min(h, bottom + margin)
    left = max(0, left - margin)
    right = min(w, right + margin)

    card_w = right - left
    card_h = bottom - top
    if card_h < 1 or card_w / card_h < 1.0 or card_w / card_h > 2.5:
        return None

    if card_w * card_h < h * w * MIN_AREA_RATIO:
        return None

    corners = np.array([
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
    ], dtype=np.float32)
    return corners


def _find_card_by_color(image: np.ndarray) -> Optional[np.ndarray]:
    """Fallback: find the card as the largest light-colored rectangular region."""
    h, w = image.shape[:2]
    image_area = h * w

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    _, s, v = cv2.split(hsv)

    mask = cv2.inRange(v, 120, 255) & cv2.inRange(s, 0, 100)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:3]:
        area = cv2.contourArea(cnt)
        if area < image_area * MIN_AREA_RATIO:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.03 * peri, True)

        if len(approx) == 4:
            corners = _order_corners(approx.reshape(4, 2).astype(np.float32))
            cw = max(np.linalg.norm(corners[1] - corners[0]),
                     np.linalg.norm(corners[2] - corners[3]))
            ch = max(np.linalg.norm(corners[3] - corners[0]),
                     np.linalg.norm(corners[2] - corners[1]))
            if ch < 1:
                continue
            ratio = cw / ch
            if abs(ratio - ID_CARD_RATIO) < RATIO_TOLERANCE * 1.5:
                return approx

        rect = cv2.minAreaRect(cnt)
        box = cv2.boxPoints(rect)
        box = np.int32(box)
        rect_w, rect_h = rect[1]
        if rect_w < rect_h:
            rect_w, rect_h = rect_h, rect_w
        if rect_h < 1:
            continue
        ratio = rect_w / rect_h
        if rect_w * rect_h > image_area * MIN_AREA_RATIO and abs(ratio - ID_CARD_RATIO) < RATIO_TOLERANCE * 1.5:
            return box.reshape(4, 1, 2)

    return None


def _order_corners(pts: np.ndarray) -> np.ndarray:
    """Order corners: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    d = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(d)]
    rect[3] = pts[np.argmax(d)]
    return rect


def _perspective_warp(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    tl, tr, br, bl = corners

    width_top = np.linalg.norm(tr - tl)
    width_bot = np.linalg.norm(br - bl)
    max_w = int(max(width_top, width_bot))

    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_h = int(max(height_left, height_right))

    if max_w < 200 or max_h < 100:
        max_w = max(max_w, 800)
        max_h = int(max_w / ID_CARD_RATIO)

    dst = np.array([
        [0, 0],
        [max_w - 1, 0],
        [max_w - 1, max_h - 1],
        [0, max_h - 1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(corners, dst)
    return cv2.warpPerspective(image, M, (max_w, max_h))


def _center_crop(image: np.ndarray, ratio: float) -> np.ndarray:
    h, w = image.shape[:2]
    margin_x = int(w * (1 - ratio) / 2)
    margin_y = int(h * (1 - ratio) / 2)
    return image[margin_y:h - margin_y, margin_x:w - margin_x].copy()
