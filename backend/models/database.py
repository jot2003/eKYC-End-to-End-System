from sqlalchemy import create_engine, Column, String, Float, DateTime, Text, JSON
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from datetime import datetime, timezone

from backend.utils.config import settings


engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class VerificationRecord(Base):
    __tablename__ = "verifications"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)  # success / failed / quality_error
    identity = Column(JSON, nullable=True)
    ocr_result = Column(JSON, nullable=True)
    vlm_result = Column(JSON, nullable=True)
    merged_result = Column(JSON, nullable=True)
    ocr_vlm_agreement = Column(Float, nullable=True)
    face_score = Column(Float, nullable=True)
    face_status = Column(String, nullable=True)
    overall_confidence = Column(Float, nullable=True)
    quality_issues = Column(JSON, nullable=True)
    ocr_bboxes = Column(JSON, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    cccd_path = Column(String, nullable=True)
    selfie_path = Column(String, nullable=True)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
