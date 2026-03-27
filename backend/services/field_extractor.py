import re
import logging

from backend.models.schemas import OCRLine

logger = logging.getLogger(__name__)

LABEL_ALIASES = {
    "ho_ten": ["Họ và tên", "Ho va ten", "Full name", "Họ và tên/Full name", "họ và tên"],
    "ngay_sinh": ["Ngày sinh", "Date of birth", "Ngay sinh", "ngày sinh"],
    "gioi_tinh": ["Giới tính", "Sex", "Gioi tinh", "giới tính"],
    "quoc_tich": ["Quốc tịch", "Nationality", "Quoc tich", "quốc tịch"],
    "que_quan": ["Quê quán", "Place of origin", "Que quan", "quê quán"],
    "noi_thuong_tru": ["Nơi thường trú", "Place of residence", "Noi thuong tru", "nơi thường trú"],
    "ngay_het_han": ["Có giá trị đến", "Date of expiry", "Co gia tri den", "có giá trị đến"],
}

CCCD_NUMBER_PATTERN = re.compile(r"\b0\d{11}\b")
DATE_PATTERN = re.compile(r"\b\d{2}[/\-\.]\d{2}[/\-\.]\d{4}\b")
GENDER_PATTERN = re.compile(r"\b(Nam|Nữ|Male|Female)\b", re.IGNORECASE)
NATIONALITY_PATTERN = re.compile(r"(Việt Nam|VIỆT NAM|Viet Nam|VIET NAM|Vietnamese)", re.IGNORECASE)


def extract_cccd_fields(ocr_text: str, ocr_lines: list[OCRLine]) -> dict[str, str | None]:
    """Extract structured fields from CCCD OCR output using regex and positional rules."""
    fields: dict[str, str | None] = {
        "so_cccd": None,
        "ho_ten": None,
        "ngay_sinh": None,
        "gioi_tinh": None,
        "quoc_tich": None,
        "que_quan": None,
        "noi_thuong_tru": None,
        "ngay_het_han": None,
    }

    cccd_match = CCCD_NUMBER_PATTERN.search(ocr_text)
    if cccd_match:
        fields["so_cccd"] = cccd_match.group()

    gender_match = GENDER_PATTERN.search(ocr_text)
    if gender_match:
        val = gender_match.group()
        fields["gioi_tinh"] = "Nam" if val.lower() in ("nam", "male") else "Nữ"

    nat_match = NATIONALITY_PATTERN.search(ocr_text)
    if nat_match:
        fields["quoc_tich"] = "Việt Nam"

    dates = DATE_PATTERN.findall(ocr_text)
    if dates:
        fields["ngay_sinh"] = dates[0]
        if len(dates) >= 2:
            fields["ngay_het_han"] = dates[-1]

    line_texts = [l.text.strip() for l in ocr_lines]

    for field_key, aliases in LABEL_ALIASES.items():
        if fields[field_key] is not None:
            continue
        value = _find_value_after_label(line_texts, aliases)
        if value:
            fields[field_key] = value

    if not fields["ho_ten"]:
        fields["ho_ten"] = _find_name_heuristic(line_texts)

    logger.info("Extracted CCCD fields: %s", {k: v for k, v in fields.items() if v})
    return fields


def _find_value_after_label(line_texts: list[str], label_aliases: list[str]) -> str | None:
    for i, line in enumerate(line_texts):
        for alias in label_aliases:
            if alias.lower() in line.lower():
                after_colon = line.split(":", 1)
                if len(after_colon) > 1 and after_colon[1].strip():
                    return after_colon[1].strip()
                after_slash = line.split("/", 1)
                if len(after_slash) > 1 and len(after_slash[1].strip()) > 3:
                    remaining = after_slash[1].strip()
                    parts = remaining.split(":", 1)
                    if len(parts) > 1:
                        return parts[1].strip()

                if i + 1 < len(line_texts):
                    next_line = line_texts[i + 1]
                    is_label = any(
                        a.lower() in next_line.lower()
                        for aliases in LABEL_ALIASES.values()
                        for a in aliases
                    )
                    if not is_label and len(next_line) > 1:
                        return next_line
    return None


def extract_cccd_back_fields(ocr_text: str, ocr_lines: list[OCRLine]) -> dict[str, str | None]:
    """Extract structured fields from CCCD back side OCR output."""
    fields: dict[str, str | None] = {
        "ngay_cap": None,
        "dac_diem_nhan_dang": None,
    }

    dates = DATE_PATTERN.findall(ocr_text)
    if dates:
        fields["ngay_cap"] = dates[0]

    back_labels = {
        "dac_diem_nhan_dang": [
            "Đặc điểm nhận dạng", "Dac diem nhan dang",
            "Personal identification", "đặc điểm nhận dạng",
        ],
        "ngay_cap": [
            "Ngày, tháng, năm", "Ngày cấp", "Date of issue",
            "ngày cấp", "Ngay cap", "Date, month, year",
        ],
    }

    line_texts = [l.text.strip() for l in ocr_lines]
    for field_key, aliases in back_labels.items():
        if fields[field_key] is not None:
            continue
        value = _find_value_after_label(line_texts, aliases)
        if value:
            fields[field_key] = value

    logger.info("Extracted CCCD back fields: %s", {k: v for k, v in fields.items() if v})
    return fields


def _find_name_heuristic(line_texts: list[str]) -> str | None:
    """Fallback: find a line that looks like a Vietnamese full name (all uppercase, 2-5 words)."""
    for line in line_texts:
        cleaned = line.strip()
        if not cleaned:
            continue
        if cleaned == cleaned.upper() and 2 <= len(cleaned.split()) <= 6:
            if not any(c.isdigit() for c in cleaned):
                if not any(kw in cleaned.lower() for kw in [
                    "cộng", "hòa", "căn cước", "citizen", "socialist", "republic",
                    "việt nam", "viet nam", "identity", "card"
                ]):
                    return cleaned
    return None
