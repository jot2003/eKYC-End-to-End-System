import re
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
    "ngay_cap":        "vlm",
    "noi_cap":         "vlm",
    "dac_diem_nhan_dang": "vlm",
}

FIELD_WEIGHTS: dict[str, float] = {
    "so_cccd":         2.0,
    "ho_ten":          1.5,
    "ngay_sinh":       1.5,
    "gioi_tinh":       1.0,
    "quoc_tich":       0.5,
    "que_quan":        1.0,
    "noi_thuong_tru":  1.0,
    "ngay_het_han":    1.0,
    "ngay_cap":        0.8,
    "noi_cap":         0.8,
    "dac_diem_nhan_dang": 0.5,
}


def cross_check(
    ocr_fields: dict[str, str | None],
    vlm_fields: dict[str, str | None],
    qr_fields: dict[str, str | None] | None = None,
    mrz_fields: dict[str, str | None] | None = None,
) -> CrossCheckResult:
    all_keys = sorted(set(
        list(ocr_fields.keys()) +
        list(vlm_fields.keys()) +
        list((qr_fields or {}).keys()) +
        list((mrz_fields or {}).keys())
    ))

    details: list[FieldComparison] = []
    merged: dict[str, str | None] = {}
    weighted_sim_sum = 0.0
    weight_sum = 0.0

    for key in all_keys:
        ocr_val = _normalize(key, ocr_fields.get(key))
        vlm_val = _normalize(key, vlm_fields.get(key))
        qr_val = _normalize(key, (qr_fields or {}).get(key))
        mrz_val = _normalize(key, (mrz_fields or {}).get(key))

        sources = {"ocr": ocr_val, "vlm": vlm_val}
        if qr_val:
            sources["qr"] = qr_val
        if mrz_val:
            sources["mrz"] = mrz_val

        non_null_vals = [v for v in [ocr_val, vlm_val, qr_val, mrz_val] if v]
        num_sources = len(non_null_vals)

        if num_sources == 0:
            sim = 0.0
        elif num_sources == 1:
            SINGLE_SOURCE_BASELINE = 0.7
            sim = SINGLE_SOURCE_BASELINE
        else:
            all_sims = []
            vals_with_labels = []
            if ocr_val:
                vals_with_labels.append(ocr_val)
            if vlm_val:
                vals_with_labels.append(vlm_val)
            if qr_val:
                vals_with_labels.append(qr_val)
            if mrz_val:
                vals_with_labels.append(mrz_val)

            for i in range(len(vals_with_labels)):
                for j in range(i + 1, len(vals_with_labels)):
                    all_sims.append(_compute_similarity(vals_with_labels[i], vals_with_labels[j]))

            sim = max(all_sims) if all_sims else 0.0
            if num_sources >= 3 and sim >= 0.8:
                sim = min(1.0, sim + 0.05)

        has_data = num_sources > 0
        if has_data:
            w = FIELD_WEIGHTS.get(key, 1.0)
            weighted_sim_sum += sim * w
            weight_sum += w

        chosen_source, chosen_val = _pick_best_multi(key, sources, sim)
        merged[key] = chosen_val

        details.append(FieldComparison(
            field=key,
            ocr_value=ocr_val,
            vlm_value=vlm_val,
            similarity=round(sim, 4),
            chosen_source=chosen_source,
        ))

    agreement = min(weighted_sim_sum / weight_sum, 1.0) if weight_sum > 0 else 0.0

    source_count = 2 + (1 if qr_fields else 0) + (1 if mrz_fields else 0)
    logger.info(
        "Cross-check (%d sources): weighted_agreement=%.2f, merged %d fields",
        source_count, agreement, len(merged),
    )

    return CrossCheckResult(
        merged=merged,
        details=details,
        agreement=round(agreement, 4),
    )


def _normalize(field: str, value: str | None) -> str | None:
    if not value or not value.strip():
        return None

    v = value.strip()

    if field in ("ngay_sinh", "ngay_het_han", "ngay_cap"):
        v = _normalize_date(v)
    elif field == "gioi_tinh":
        low = v.lower()
        if low in ("nam", "male", "m"):
            v = "Nam"
        elif low in ("nữ", "nu", "female", "f"):
            v = "Nữ"
    elif field == "quoc_tich":
        low = v.lower().replace(" ", "")
        if "vietnam" in low or "việtnam" in low or "viet nam" in low.replace("", "") or low == "việtnam":
            v = "Việt Nam"
    elif field == "ho_ten":
        v = re.sub(r"\s+", " ", v).strip().upper()
    elif field == "so_cccd":
        v = re.sub(r"\D", "", v)
        if v and len(v) < 12:
            v = v.zfill(12)

    return v if v else None


def _normalize_date(s: str) -> str:
    s = s.strip().replace("-", "/").replace(".", "/")
    parts = s.split("/")
    if len(parts) == 3:
        d, m, y = parts
        d = d.zfill(2)
        m = m.zfill(2)
        if len(y) == 2:
            y = ("19" if int(y) > 50 else "20") + y
        return f"{d}/{m}/{y}"
    return s


def _compute_similarity(a: str | None, b: str | None) -> float:
    if a is None or b is None:
        return 0.0
    return levenshtein_ratio(a.strip().lower(), b.strip().lower())


def _pick_best_multi(
    field: str,
    sources: dict[str, str | None],
    sim: float,
) -> tuple[str, str | None]:
    non_null = {k: v for k, v in sources.items() if v}

    if not non_null:
        return "none", None
    if len(non_null) == 1:
        src = next(iter(non_null))
        return src, non_null[src]

    if "qr" in non_null:
        if field in ("so_cccd", "ngay_sinh", "gioi_tinh"):
            return "qr", non_null["qr"]

    if "mrz" in non_null:
        if field in ("so_cccd", "ngay_sinh", "gioi_tinh", "ngay_het_han"):
            return "mrz", non_null["mrz"]

    preferred = FIELD_TRUST.get(field, "vlm")
    if preferred in non_null:
        return preferred, non_null[preferred]

    src = next(iter(non_null))
    return src, non_null[src]
