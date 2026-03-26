import logging
from Levenshtein import ratio as levenshtein_ratio

from backend.models.schemas import FieldComparison, CrossCheckResult

logger = logging.getLogger(__name__)

FIELD_TRUST: dict[str, str] = {
    "so_cccd":         "ocr",
    "ho_ten":          "vlm",
    "ngay_sinh":       "ocr",
    "gioi_tinh":       "vlm",
    "quoc_tich":       "vlm",
    "que_quan":        "vlm",
    "noi_thuong_tru":  "vlm",
    "ngay_het_han":    "ocr",
}

SIMILARITY_THRESHOLD = 0.85


def cross_check(
    ocr_fields: dict[str, str | None],
    vlm_fields: dict[str, str | None],
) -> CrossCheckResult:
    all_keys = sorted(set(list(ocr_fields.keys()) + list(vlm_fields.keys())))

    details: list[FieldComparison] = []
    merged: dict[str, str | None] = {}
    agree_count = 0

    for key in all_keys:
        ocr_val = ocr_fields.get(key)
        vlm_val = vlm_fields.get(key)

        sim = _compute_similarity(ocr_val, vlm_val)

        if sim >= SIMILARITY_THRESHOLD:
            agree_count += 1

        chosen_source, chosen_val = _pick_best(key, ocr_val, vlm_val, sim)
        merged[key] = chosen_val

        details.append(FieldComparison(
            field=key,
            ocr_value=ocr_val,
            vlm_value=vlm_val,
            similarity=round(sim, 4),
            chosen_source=chosen_source,
        ))

    fields_with_any = sum(1 for k in all_keys if ocr_fields.get(k) or vlm_fields.get(k))
    agreement = agree_count / fields_with_any if fields_with_any else 0.0

    logger.info(
        "Cross-check: %d/%d agree (%.0f%%), merged %d fields",
        agree_count, fields_with_any, agreement * 100, len(merged),
    )

    return CrossCheckResult(
        merged=merged,
        details=details,
        agreement=round(agreement, 4),
    )


def _compute_similarity(a: str | None, b: str | None) -> float:
    if a is None and b is None:
        return 1.0
    if a is None or b is None:
        return 0.0
    return levenshtein_ratio(a.strip().lower(), b.strip().lower())


def _pick_best(
    field: str,
    ocr_val: str | None,
    vlm_val: str | None,
    sim: float,
) -> tuple[str, str | None]:
    if ocr_val and not vlm_val:
        return "ocr", ocr_val
    if vlm_val and not ocr_val:
        return "vlm", vlm_val
    if not ocr_val and not vlm_val:
        return "none", None

    if sim >= SIMILARITY_THRESHOLD:
        preferred = FIELD_TRUST.get(field, "vlm")
        return preferred, ocr_val if preferred == "ocr" else vlm_val

    preferred = FIELD_TRUST.get(field, "vlm")
    return preferred, ocr_val if preferred == "ocr" else vlm_val
