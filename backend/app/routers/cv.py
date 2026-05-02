from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
import io
import re
from pathlib import Path

from PyPDF2 import PdfReader

from app.cv_builder.customizer import customize_cv
from app.nlp.matcher import score_match
from app.cv_builder.customizer import CV_FILES, REPO_ROOT

router = APIRouter(prefix="/cv", tags=["cv"])

class CustomizeRequest(BaseModel):
    variant: str = "data_science"  # data_science|quant|bi_sc|research|full
    job_description: str

class ScoreTextRequest(BaseModel):
    cv_text: str
    job_description: str

# Directory to store uploaded CVs
UPLOAD_DIR = Path(REPO_ROOT) / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def _extract_pdf_text(pdf_bytes: bytes) -> tuple[str, int]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text:
            pages.append(text)
    return "\n".join(pages), len(reader.pages)


def _normalize_text(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"[\t ]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

@router.post("/customize")
async def customize(req: CustomizeRequest):
    latex = await customize_cv(req.variant, req.job_description)
    score = score_match(latex, req.job_description)
    return {"latex": latex, "match": score}

@router.get("/variants")
async def list_variants():
    return list(CV_FILES.keys())

@router.post("/score")
async def score_existing(req: CustomizeRequest):
    tex = (REPO_ROOT / CV_FILES.get(req.variant, CV_FILES["data_science"])).read_text()
    return score_match(tex, req.job_description)

@router.post("/score-text")
async def score_from_text(req: ScoreTextRequest):
    if not req.cv_text.strip():
        raise HTTPException(status_code=400, detail="CV text cannot be empty")
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")
    return score_match(req.cv_text, req.job_description)

@router.post("/upload")
async def upload_cv(file: UploadFile = File(...)):
    """Upload, store, and extract text from a CV PDF."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)

        extracted_text, page_count = _extract_pdf_text(contents)
        cleaned_text = _normalize_text(extracted_text)
        if not cleaned_text:
            raise HTTPException(
                status_code=400,
                detail="Uploaded PDF did not contain readable text. If this is a scanned document, OCR is required.",
            )

        return {
            "status": "success",
            "filename": file.filename,
            "size": len(contents),
            "page_count": page_count,
            "text_length": len(cleaned_text),
            "text": cleaned_text,
            "text_preview": cleaned_text[:400],
            "message": "CV uploaded successfully"
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
