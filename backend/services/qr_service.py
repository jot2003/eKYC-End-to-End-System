import json
import logging

import cv2
import numpy as np
from pyzbar.pyzbar import decode as pyzbar_decode, ZBarSymbol

logger = logging.getLogger(__name__)


def decode_qr(image: np.ndarray) -> dict[str, str | None] | None:
    """Decode QR code from CCCD back side image and extract identity fields."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    results = pyzbar_decode(gray, symbols=[ZBarSymbol.QRCODE])
    if not results:
        results = pyzbar_decode(image, symbols=[ZBarSymbol.QRCODE])

    if not results:
        logger.warning("No QR code found in image")
        return None

    raw_data = results[0].data.decode("utf-8", errors="replace")
    logger.info("QR raw data length: %d chars", len(raw_data))

    return _parse_cccd_qr(raw_data)


def _parse_cccd_qr(raw: str) -> dict[str, str | None]:
    """
    Parse CCCD QR code data.
    Vietnamese CCCD chip QR typically contains pipe-separated fields:
    ID|CCCD_NUMBER|OLD_ID|NAME|DOB|SEX|ADDRESS|ISSUE_DATE
    Or JSON format for newer cards.
    """
    fields: dict[str, str | None] = {
        "so_cccd": None,
        "ho_ten": None,
        "ngay_sinh": None,
        "gioi_tinh": None,
        "noi_thuong_tru": None,
        "ngay_cap": None,
    }

    try:
        data = json.loads(raw)
        fields["so_cccd"] = data.get("id") or data.get("cccd") or data.get("number")
        fields["ho_ten"] = data.get("name") or data.get("ho_ten")
        fields["ngay_sinh"] = data.get("dob") or data.get("ngay_sinh")
        fields["gioi_tinh"] = data.get("sex") or data.get("gioi_tinh")
        fields["noi_thuong_tru"] = data.get("address") or data.get("noi_thuong_tru")
        fields["ngay_cap"] = data.get("doi") or data.get("ngay_cap")
        logger.info("QR parsed as JSON: %d fields found", sum(1 for v in fields.values() if v))
        return fields
    except (json.JSONDecodeError, AttributeError):
        pass

    parts = raw.split("|")
    if len(parts) >= 6:
        fields["so_cccd"] = parts[0].strip() if len(parts[0]) == 12 else (parts[1].strip() if len(parts) > 1 and len(parts[1]) == 12 else None)
        for p in parts:
            p = p.strip()
            if len(p) == 12 and p.isdigit() and not fields["so_cccd"]:
                fields["so_cccd"] = p
            elif p.upper() == p and 2 <= len(p.split()) <= 6 and not any(c.isdigit() for c in p) and not fields["ho_ten"]:
                fields["ho_ten"] = p
            elif _looks_like_date(p):
                if not fields["ngay_sinh"]:
                    fields["ngay_sinh"] = p
                elif not fields["ngay_cap"]:
                    fields["ngay_cap"] = p
            elif p.lower() in ("nam", "nữ", "male", "female"):
                fields["gioi_tinh"] = "Nam" if p.lower() in ("nam", "male") else "Nữ"

        if len(parts) > 5 and not fields["noi_thuong_tru"]:
            for p in parts[4:]:
                if len(p.strip()) > 15:
                    fields["noi_thuong_tru"] = p.strip()
                    break

        logger.info("QR parsed as pipe-separated: %d fields found", sum(1 for v in fields.values() if v))
        return fields

    logger.warning("QR data format not recognized: %s", raw[:100])
    return fields


def _looks_like_date(s: str) -> bool:
    import re
    return bool(re.match(r"\d{2}[/\-\.]\d{2}[/\-\.]\d{4}$", s.strip()))
