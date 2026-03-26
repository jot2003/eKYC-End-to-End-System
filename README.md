# DocuMind — AI-Powered eKYC System

> Multimodal identity verification for Vietnamese Citizen ID Cards (CCCD) using OCR + Vision-Language Model + Face Recognition

## Overview

DocuMind is an end-to-end eKYC (electronic Know Your Customer) system that extracts and verifies identity information from Vietnamese CCCD cards. It combines three AI approaches for maximum accuracy:

1. **OCR Pipeline** — EasyOCR (Vietnamese + English) extracts text, then regex + rule-based NER parses structured fields
2. **VLM Pipeline** — Azure OpenAI GPT vision model reads the card image directly and returns structured JSON
3. **Cross-Validation** — Levenshtein similarity comparison per field, with a FIELD_TRUST matrix to pick the most reliable source
4. **Face Verification** — InsightFace (RetinaFace detection + ArcFace embedding) compares the photo on CCCD with a selfie

## Architecture

```
┌─────────────┐    ┌─────────────────────────────────────────────┐
│  React UI   │───>│              FastAPI Backend                │
│  (Vite +    │    │                                             │
│  Tailwind)  │    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│             │<───│  │ Quality  │->│ Preproc  │->│ OCR      │  │
└─────────────┘    │  │ Check    │  │ OpenCV   │  │ EasyOCR  │  │
                   │  └──────────┘  └──────────┘  └────┬─────┘  │
                   │                                   │        │
                   │  ┌──────────┐  ┌──────────┐  ┌────v─────┐  │
                   │  │ Face     │  │ Cross-   │<─│ Field    │  │
                   │  │ Verify   │  │ Checker  │  │ Extract  │  │
                   │  │InsightFace│  │Levenshtein│ │regex+NER │  │
                   │  └──────────┘  └─────┬────┘  └──────────┘  │
                   │                      │                     │
                   │  ┌──────────┐  ┌─────v────┐               │
                   │  │ VLM      │->│ Merge    │──> Response   │
                   │  │Azure GPT │  │ Result   │               │
                   │  └──────────┘  └──────────┘               │
                   └─────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, Pydantic |
| **OCR** | EasyOCR (Vietnamese + English) |
| **VLM** | Azure OpenAI GPT (vision multimodal) |
| **Face** | InsightFace (RetinaFace + ArcFace, buffalo_l) |
| **CV** | OpenCV (denoise, deskew, binarize, quality check) |
| **Database** | SQLite |
| **Deployment** | Docker Compose |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- Azure OpenAI API access (with vision model deployment)

### 1. Clone & Setup

```bash
git clone https://github.com/jot2003/DocuMind.git
cd DocuMind

# Backend
cd backend
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..

# Environment
cp .env.example .env
# Edit .env with your Azure OpenAI credentials
```

### 2. Run

```bash
# Terminal 1: Backend
cd backend
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

### 3. Docker (Alternative)

```bash
docker-compose up --build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/verify` | Upload CCCD + selfie, run full pipeline |
| `GET` | `/api/results/{id}` | Retrieve verification result |
| `GET` | `/api/health` | Health check |
| `GET` | `/docs` | Swagger UI |

### Example Request

```bash
curl -X POST http://localhost:8000/api/verify \
  -F "cccd_image=@cccd_front.jpg" \
  -F "selfie_image=@selfie.jpg"
```

## Pipeline Details

### Image Quality Check
- **Blur detection**: Laplacian variance (threshold: 100)
- **Brightness check**: Mean pixel intensity (range: 40-220)
- **Resolution check**: Minimum 300x200 pixels

### OCR + Field Extraction
- EasyOCR with Vietnamese language support
- Regex patterns for CCCD number (`0\d{11}`), dates, gender, nationality
- Label-based field matching with Vietnamese aliases
- Name heuristic fallback (all-uppercase, 2-6 words)

### VLM Extraction
- Azure OpenAI GPT vision model
- Structured JSON extraction prompt in Vietnamese
- Automatic JSON parsing with fallback regex

### Cross-Check & Merge
- Per-field Levenshtein similarity comparison
- FIELD_TRUST matrix: OCR trusted for numbers/dates, VLM trusted for names/addresses
- Agreement score (% of fields with similarity >= 85%)

### Face Verification
- InsightFace buffalo_l model (RetinaFace detection + ArcFace recognition)
- 512-dim embedding cosine similarity
- Match threshold: 0.40

## Evaluation

### OCR Accuracy (synthetic CCCD samples)

| Field | Avg Similarity | Exact Match |
|-------|---------------|-------------|
| so_cccd | 100% | 5/5 |
| ho_ten | 97% | 3/5 |
| ngay_sinh | 100% | 5/5 |
| gioi_tinh | 76% | 3/5 |
| quoc_tich | 100% | 5/5 |
| ngay_het_han | 100% | 5/5 |
| **Overall** | **78%** | **26/40** |

> The weaker fields (que_quan, noi_thuong_tru) are compensated by VLM cross-checking, demonstrating the value of the dual AI pipeline.

### Generate Test Data

```bash
python scripts/generate_cccd.py 10    # Generate 10 synthetic CCCDs
python scripts/evaluate_ocr.py        # Run OCR evaluation
```

## Project Structure

```
DocuMind/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── routers/verify.py       # /api/verify endpoint + full pipeline
│   ├── services/
│   │   ├── ocr_service.py      # EasyOCR wrapper (singleton)
│   │   ├── field_extractor.py  # Regex + rule-based NER for CCCD
│   │   ├── vlm_service.py      # Azure OpenAI GPT vision
│   │   ├── cross_checker.py    # Levenshtein merge + FIELD_TRUST
│   │   ├── face_service.py     # InsightFace verify
│   │   ├── image_quality.py    # Blur/brightness/resolution check
│   │   └── preprocessing.py    # OpenCV denoise/deskew/binarize
│   ├── models/
│   │   ├── database.py         # SQLAlchemy + SQLite
│   │   └── schemas.py          # Pydantic request/response models
│   └── utils/
│       ├── config.py           # Settings from .env
│       └── image_utils.py      # Image I/O utilities
├── frontend/
│   └── src/
│       ├── pages/              # Landing, Verify, Result pages
│       ├── components/         # Navbar, ImageDropzone
│       └── lib/api.ts          # Axios API client
├── scripts/
│   ├── generate_cccd.py        # Synthetic CCCD generator
│   └── evaluate_ocr.py         # OCR accuracy evaluation
├── data/
│   ├── samples/                # Generated test images
│   └── ground_truth/           # Ground truth JSON
├── docker-compose.yml
├── .env.example
└── README.md
```

## Key Design Decisions

1. **Dual AI pipeline** over single OCR: Cross-validation catches errors that either system alone would miss
2. **EasyOCR** over PaddleOCR: Better Windows compatibility, simpler API, good Vietnamese support
3. **Azure OpenAI** over local VLM: Faster inference, higher accuracy for document understanding
4. **InsightFace buffalo_l** for face: State-of-the-art accuracy with reasonable inference time
5. **SQLite** over PostgreSQL: Zero configuration, sufficient for demo/interview context
6. **FIELD_TRUST matrix**: Numbers/dates trusted from OCR (better at exact characters), names/addresses from VLM (better contextual understanding)

## License

MIT

---

Built by **Hoang Kim Tri Thanh** — AI Engineer Portfolio Project
