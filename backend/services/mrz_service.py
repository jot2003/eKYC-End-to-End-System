import re
import logging

logger = logging.getLogger(__name__)


def parse_mrz(ocr_text: str) -> dict[str, str | None] | None:
    """
    Parse MRZ (Machine Readable Zone) from CCCD back side OCR text.
    Vietnamese CCCD uses TD1 format (3 lines, 30 chars each).

    Line 1: IDVNM + document number + check digit + optional data
    Line 2: DOB + check digit + sex + expiry + check digit + nationality + optional + check
    Line 3: Name (SURNAME<<GIVEN_NAMES)
    """
    lines = _extract_mrz_lines(ocr_text)
    if not lines:
        logger.warning("No MRZ lines found in OCR text")
        return None

    logger.info("Found %d MRZ lines", len(lines))

    fields: dict[str, str | None] = {
        "so_cccd": None,
        "ngay_sinh": None,
        "gioi_tinh": None,
        "ngay_het_han": None,
        "ho_ten": None,
    }

    if len(lines) >= 1:
        line1 = lines[0]
        doc_number = _extract_document_number(line1)
        if doc_number:
            fields["so_cccd"] = doc_number

    if len(lines) >= 2:
        line2 = lines[1]
        dob = _extract_date(line2, 0, 6)
        if dob:
            fields["ngay_sinh"] = dob

        sex = _extract_sex(line2)
        if sex:
            fields["gioi_tinh"] = sex

        expiry = _extract_date(line2, 8, 14)
        if expiry:
            fields["ngay_het_han"] = expiry

    if len(lines) >= 3:
        name = _extract_name(lines[2])
        if name:
            fields["ho_ten"] = name

    found_count = sum(1 for v in fields.values() if v)
    logger.info("MRZ parsed: %d/5 fields found", found_count)
    return fields if found_count > 0 else None


def _extract_mrz_lines(text: str) -> list[str]:
    """Extract lines that look like MRZ data (mostly uppercase letters, digits, and < characters)."""
    mrz_pattern = re.compile(r"[A-Z0-9<]{20,}")
    candidates = []

    for line in text.split("\n"):
        cleaned = line.strip().upper().replace(" ", "")
        cleaned = cleaned.replace("O", "0").replace("I", "1") if len(cleaned) > 25 else cleaned

        matches = mrz_pattern.findall(cleaned)
        for m in matches:
            if len(m) >= 25 and m.count("<") >= 1:
                candidates.append(m[:30])

    if len(candidates) >= 3:
        return candidates[:3]
    elif len(candidates) >= 2:
        return candidates[:2]
    elif len(candidates) >= 1:
        return candidates[:1]

    return []


def _extract_document_number(line1: str) -> str | None:
    """Extract 12-digit CCCD number from MRZ line 1."""
    digits = re.findall(r"\d{12}", line1)
    if digits:
        return digits[0]

    cleaned = line1.replace("<", "")
    if line1.startswith("IDVNM") or line1.startswith("1DVNM"):
        remaining = line1[5:].replace("<", "")
        digits = re.findall(r"\d{12}", remaining)
        if digits:
            return digits[0]
        digits = re.findall(r"\d{9,12}", remaining)
        if digits:
            return digits[0].zfill(12)

    return None


def _extract_date(line: str, start: int, end: int) -> str | None:
    """Extract date in YYMMDD format from MRZ line and convert to DD/MM/YYYY."""
    if len(line) <= end:
        return None

    raw = line[start:end]
    if not raw.isdigit() or len(raw) != 6:
        return None

    yy, mm, dd = raw[:2], raw[2:4], raw[4:6]
    year = int(yy)
    century = "19" if year > 50 else "20"
    return f"{dd}/{mm}/{century}{yy}"


def _extract_sex(line: str) -> str | None:
    """Extract sex from MRZ line 2 (position 7)."""
    if len(line) < 8:
        return None
    sex_char = line[7]
    if sex_char == "M":
        return "Nam"
    elif sex_char == "F":
        return "Nữ"
    return None


def _extract_name(line3: str) -> str | None:
    """Extract name from MRZ line 3 (format: SURNAME<<GIVEN_NAMES<<<...)."""
    cleaned = line3.strip().rstrip("<")
    if "<<" not in cleaned:
        return None

    parts = cleaned.split("<<", 1)
    surname = parts[0].replace("<", " ").strip()
    given = parts[1].replace("<", " ").strip() if len(parts) > 1 else ""

    if surname or given:
        full_name = f"{surname} {given}".strip()
        return full_name.upper() if full_name else None
    return None
