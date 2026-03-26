"""
Evaluate OCR accuracy against ground truth CCCD data.
Measures: field-level accuracy, Levenshtein similarity, overall extraction rate.
"""
import json
import sys
import os
import warnings

warnings.filterwarnings("ignore")
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
from Levenshtein import ratio as levenshtein_ratio

from backend.services.ocr_service import OCRService
from backend.services.field_extractor import extract_cccd_fields


def evaluate():
    gt_path = "data/ground_truth/cccd_ground_truth.json"
    with open(gt_path, "r", encoding="utf-8") as f:
        ground_truth = json.load(f)

    print(f"Evaluating {len(ground_truth)} samples...")
    print("=" * 80)

    ocr_service = OCRService()

    all_fields = ["so_cccd", "ho_ten", "ngay_sinh", "gioi_tinh", "quoc_tich",
                  "que_quan", "noi_thuong_tru", "ngay_het_han"]

    field_scores: dict[str, list[float]] = {f: [] for f in all_fields}
    field_exact: dict[str, int] = {f: 0 for f in all_fields}
    total_fields = 0
    extracted_fields = 0

    for entry in ground_truth:
        img_path = entry["image"]
        gt_fields = entry["fields"]

        img = cv2.imread(img_path)
        if img is None:
            print(f"  SKIP: cannot read {img_path}")
            continue

        ocr_result = ocr_service.extract(img)
        pred_fields = extract_cccd_fields(ocr_result.full_text, ocr_result.lines)

        print(f"\n--- {img_path} ---")
        print(f"  GT name: {gt_fields.get('ho_ten', '?')}")
        print(f"  OCR text ({len(ocr_result.lines)} lines): {ocr_result.full_text[:100]}...")

        for field in all_fields:
            gt_val = gt_fields.get(field)
            pred_val = pred_fields.get(field)
            total_fields += 1

            if pred_val:
                extracted_fields += 1

            if gt_val and pred_val:
                sim = levenshtein_ratio(gt_val.lower().strip(), pred_val.lower().strip())
                field_scores[field].append(sim)
                if sim >= 0.95:
                    field_exact[field] += 1
                status = "OK" if sim >= 0.95 else f"PARTIAL ({sim:.0%})"
            elif not pred_val and gt_val:
                field_scores[field].append(0.0)
                status = "MISS"
            else:
                status = "N/A"

            print(f"    {field:20s}: gt={gt_val or '-':30s} pred={pred_val or '-':30s} [{status}]")

    print("\n" + "=" * 80)
    print("EVALUATION SUMMARY")
    print("=" * 80)

    print(f"\n{'Field':20s} {'Avg Sim':>10s} {'Exact Match':>12s} {'Samples':>10s}")
    print("-" * 55)

    for field in all_fields:
        scores = field_scores[field]
        avg = sum(scores) / len(scores) if scores else 0
        exact = field_exact[field]
        n = len(scores)
        print(f"  {field:18s} {avg:>9.1%} {exact:>7d}/{n:<4d} {n:>8d}")

    all_scores = [s for scores in field_scores.values() for s in scores]
    overall_sim = sum(all_scores) / len(all_scores) if all_scores else 0
    overall_exact = sum(field_exact.values())
    extraction_rate = extracted_fields / total_fields if total_fields else 0

    print("-" * 55)
    print(f"  {'OVERALL':18s} {overall_sim:>9.1%} {overall_exact:>7d}/{len(all_scores):<4d}")
    print(f"\n  Extraction rate: {extraction_rate:.1%} ({extracted_fields}/{total_fields} fields)")
    print(f"  Total samples: {len(ground_truth)}")


if __name__ == "__main__":
    evaluate()
