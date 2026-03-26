from pydantic import BaseModel


class QualityResult(BaseModel):
    passed: bool
    blur_score: float
    brightness: float
    resolution: tuple[int, int]
    issues: list[str]


class OCRLine(BaseModel):
    bbox: list[list[float]]
    text: str
    confidence: float


class OCRResult(BaseModel):
    lines: list[OCRLine]
    full_text: str


class FieldComparison(BaseModel):
    field: str
    ocr_value: str | None
    vlm_value: str | None
    similarity: float
    chosen_source: str


class CrossCheckResult(BaseModel):
    merged: dict[str, str | None]
    details: list[FieldComparison]
    agreement: float


class FaceResult(BaseModel):
    status: str  # match / no_match / no_face_on_cccd / no_face_on_selfie
    score: float


class VerifyResponse(BaseModel):
    request_id: str
    status: str
    identity: dict[str, str | None] | None = None
    verification: dict | None = None
    sources: dict | None = None
    processing_time_ms: float
    ocr_bboxes: list[dict] | None = None
    quality_issues: list[str] | None = None
