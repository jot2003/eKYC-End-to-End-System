import time
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.models.database import get_db, VerificationRecord
from backend.models.schemas import VerifyResponse, QualityResult
from backend.services.image_quality import assess_quality
from backend.services.preprocessing import preprocess
from backend.utils.image_utils import read_image_from_bytes, save_upload, draw_bboxes
from backend.utils.config import UPLOAD_PATH

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["verification"])


@router.post("/verify", response_model=VerifyResponse)
async def verify_identity(
    cccd_image: UploadFile = File(..., description="CCCD front image"),
    selfie_image: UploadFile = File(..., description="Selfie image"),
    db: Session = Depends(get_db),
):
    start = time.time()
    request_id = f"dm_{uuid.uuid4().hex[:12]}"

    cccd_bytes = await cccd_image.read()
    selfie_bytes = await selfie_image.read()

    try:
        cccd_img = read_image_from_bytes(cccd_bytes)
        selfie_img = read_image_from_bytes(selfie_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    cccd_quality = assess_quality(cccd_img)
    selfie_quality = assess_quality(selfie_img)

    all_issues = [f"[CCCD] {i}" for i in cccd_quality.issues] + \
                 [f"[Selfie] {i}" for i in selfie_quality.issues]

    if not cccd_quality.passed or not selfie_quality.passed:
        elapsed = (time.time() - start) * 1000
        record = VerificationRecord(
            id=request_id,
            status="quality_error",
            quality_issues=all_issues,
            processing_time_ms=elapsed,
        )
        db.add(record)
        db.commit()

        return VerifyResponse(
            request_id=request_id,
            status="quality_error",
            processing_time_ms=round(elapsed, 1),
            quality_issues=all_issues,
        )

    cccd_path = save_upload(cccd_bytes, UPLOAD_PATH, suffix=".jpg")
    selfie_path = save_upload(selfie_bytes, UPLOAD_PATH, suffix=".jpg")

    cccd_preprocessed = preprocess(cccd_img)

    # --- AI Pipeline (services will be connected in later tasks) ---
    # Step 1: OCR
    # Step 2: Field extraction (NER)
    # Step 3: VLM extraction
    # Step 4: Cross-check OCR vs VLM
    # Step 5: Face verification

    elapsed = (time.time() - start) * 1000

    record = VerificationRecord(
        id=request_id,
        status="success",
        processing_time_ms=elapsed,
        cccd_path=str(cccd_path),
        selfie_path=str(selfie_path),
    )
    db.add(record)
    db.commit()

    return VerifyResponse(
        request_id=request_id,
        status="success",
        identity=None,
        verification=None,
        sources=None,
        processing_time_ms=round(elapsed, 1),
        ocr_bboxes=None,
    )


@router.get("/results/{request_id}", response_model=VerifyResponse)
async def get_result(request_id: str, db: Session = Depends(get_db)):
    record = db.query(VerificationRecord).filter_by(id=request_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Result not found")

    return VerifyResponse(
        request_id=record.id,
        status=record.status,
        identity=record.merged_result,
        verification={
            "ocr_vlm_agreement": record.ocr_vlm_agreement,
            "face_match": {"score": record.face_score, "status": record.face_status},
            "overall_confidence": record.overall_confidence,
        } if record.status == "success" else None,
        sources={
            "ocr": record.ocr_result,
            "vlm": record.vlm_result,
        } if record.status == "success" else None,
        processing_time_ms=record.processing_time_ms or 0,
        ocr_bboxes=record.ocr_bboxes,
        quality_issues=record.quality_issues,
    )


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "DocuMind eKYC API"}
