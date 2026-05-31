from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import re
import json
from pathlib import Path
from typing import Optional

from PyPDF2 import PdfReader

from app.cv_builder.customizer import customize_cv
from app.nlp.matcher import score_match
from app.routers.job_search import search_google_jobs
from app.constants import VARIANT_LABELS, VARIANT_HINTS

router = APIRouter(prefix="/cv", tags=["cv"])

# Helper to send progress events
async def send_progress(stage: str, message: str, progress: int = 0) -> str:
    """Format a progress event as JSON"""
    return json.dumps({
        "stage": stage,
        "message": message,
        "progress": progress,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    }) + "\n"

class CustomizeRequest(BaseModel):
    variant: str = "data_science"  # data_science|quant|bi_sc|research|full
    cv_text: str = ""
    job_description: str = ""

class ScoreTextRequest(BaseModel):
    cv_text: str
    job_description: str

class StrategyRequest(BaseModel):
    cv_text: str
    target_role: str
    location: str = "worldwide"
    seniority: str = "any"

# Directory to store uploaded CVs
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Variant labels and hints moved to `app.constants`.


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


def _truncate(text: str, limit: int = 2400) -> str:
    cleaned = _normalize_text(text)
    return cleaned[:limit]


def _select_reference_variant(target_role: str, cv_text: str) -> tuple[str, dict[str, int]]:
    combined = f"{target_role}\n{cv_text}".lower()
    scores: dict[str, int] = {}

    for variant, hints in VARIANT_HINTS.items():
        score = 0
        for hint in hints:
            if hint in combined:
                score += 2
        scores[variant] = score

    best_variant = max(scores, key=scores.get)
    if scores[best_variant] == 0:
        best_variant = "data_science" if "data" in combined or "ml" in combined else "full"

    return best_variant, scores


@router.post("/customize")
async def customize(req: CustomizeRequest):
    if not req.cv_text.strip():
        raise HTTPException(status_code=400, detail="CV text cannot be empty")
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")

    tailored = await customize_cv(req.cv_text, req.job_description, req.variant)
    score = score_match(req.cv_text, req.job_description)
    return {"text": tailored, "match": score}

@router.get("/variants")
async def list_variants():
    return list(VARIANT_LABELS.keys())

@router.post("/score")
async def score_existing(req: CustomizeRequest):
    if not req.cv_text.strip():
        raise HTTPException(status_code=400, detail="CV text cannot be empty")
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")
    return score_match(req.cv_text, req.job_description)

@router.post("/score-text")
async def score_from_text(req: ScoreTextRequest):
    if not req.cv_text.strip():
        raise HTTPException(status_code=400, detail="CV text cannot be empty")
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")
    return score_match(req.cv_text, req.job_description)

@router.post("/extract-insights")
async def extract_insights(req: ScoreTextRequest):
    """Use AI to extract skills, experience highlights, and sections from CV text."""
    from app.llm import chat
    
    system_prompt = """You are an expert CV analyzer. Your task is to deeply analyze a CV and extract comprehensive structured information.

IMPORTANT: Be thorough and extract ALL relevant information, not just surface-level content.

Return ONLY a valid JSON object with these exact keys:
{
  "keySkills": [array of technical and professional skills - extract ALL mentioned skills, max 25],
  "experienceHighlights": [array of key achievements, responsibilities, and accomplishments - extract ALL significant bullet points and achievements, max 20],
  "sectionsDetected": [array of main CV sections found],
  "publications": [array of publications/papers/research - extract ALL if any, max 15],
  "technicalProjects": [array of technical projects, side projects, or notable implementations - extract ALL if any, max 15],
  "researchAreas": [array of research areas, domains, or specializations - extract ALL if any, max 10],
  "certifications": [array of certifications, licenses, or credentials - extract ALL if any, max 10],
  "awards": [array of awards, honors, or recognitions - extract ALL if any, max 10],
  "languages": [array of programming languages and natural languages - extract ALL if any, max 15]
}

EXTRACTION GUIDELINES:
1. For keySkills: Extract every technical skill, programming language, tool, framework, methodology, and domain expertise mentioned. Include both hard skills and soft skills.
2. For experienceHighlights: Extract complete achievement statements, responsibilities, and quantified results. Include all significant accomplishments from all roles.
3. For publications: Extract all papers, conferences, journals, research outputs mentioned with full citations if available.
4. For technicalProjects: Extract all projects, implementations, systems built, or notable technical work. Include project names, technologies used, and outcomes.
5. For researchAreas: Extract research domains, specializations, focus areas, or academic interests.
6. For certifications: Extract any certifications, licenses, credentials, or professional qualifications.
7. For awards: Extract awards, honors, scholarships, recognitions, or special selections.
8. For languages: Extract both programming languages and natural languages mentioned.
9. For sectionsDetected: Identify all major sections in the CV.

Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations."""

    user_prompt = f"""Analyze this CV thoroughly and extract all relevant information:

{req.cv_text}

Return the JSON object with comprehensive extracted information."""

    response = await chat(system_prompt, user_prompt)
    
    try:
        cleaned_response = response.strip()
        if cleaned_response.startswith("```"):
            if "```json" in cleaned_response:
                cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
            else:
                cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()
        
        insights = json.loads(cleaned_response)
        
        required_keys = ["keySkills", "experienceHighlights", "sectionsDetected", "publications", "technicalProjects", "researchAreas", "certifications", "awards", "languages"]
        for key in required_keys:
            if key not in insights:
                insights[key] = []
        
        insights["keySkills"] = insights.get("keySkills", [])[:25]
        insights["experienceHighlights"] = insights.get("experienceHighlights", [])[:20]
        insights["publications"] = insights.get("publications", [])[:15]
        insights["technicalProjects"] = insights.get("technicalProjects", [])[:15]
        insights["researchAreas"] = insights.get("researchAreas", [])[:10]
        insights["certifications"] = insights.get("certifications", [])[:10]
        insights["awards"] = insights.get("awards", [])[:10]
        insights["languages"] = insights.get("languages", [])[:15]
        insights["sectionsDetected"] = insights.get("sectionsDetected", [])
        
        return insights
    except json.JSONDecodeError as e:
        print(f"Failed to parse AI response: {response}")
        print(f"JSON Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI failed to return valid JSON. Response: {response[:200]}")

@router.post("/target-strategy")
async def target_strategy(req: StrategyRequest):
    """
    Generate a deep target-role strategy using LangGraph ReAct agent.
    Orchestrates: variant selection → job fetching → strategy synthesis.
    """
    if not req.cv_text.strip():
        raise HTTPException(status_code=400, detail="CV text cannot be empty")
    if not req.target_role.strip():
        raise HTTPException(status_code=400, detail="Target role cannot be empty")

    try:
        from app.strategy_agent import run_strategy_workflow

        target_role = req.target_role.strip()
        location = req.location.strip() or "worldwide"
        seniority = req.seniority.strip() or "any"

        result = await run_strategy_workflow(target_role, req.cv_text, location, seniority)
        return result

    except Exception as e:
        print(f"[ERROR] Strategy analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Strategy analysis failed: {str(e)}")

@router.post("/upload-stream")
async def upload_cv_stream(file: UploadFile = File(...)):
    """Upload, store, and extract text from a CV PDF with real-time progress updates."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Read file once before creating the generator
    try:
        contents = await file.read()
        print(f"[DEBUG] File read: {len(contents)} bytes")
    except Exception as e:
        print(f"[ERROR] Failed to read file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Define file path outside generator
    file_path = UPLOAD_DIR / file.filename
    
    async def progress_generator():
        try:
            # Stage 1: Reading file
            yield await send_progress("reading", "Reading PDF file...", 10)
            
            # Stage 2: Saving file
            yield await send_progress("saving", "Saving file to storage...", 20)
            with open(file_path, "wb") as f:
                f.write(contents)
            print(f"[DEBUG] File saved to {file_path}")
            
            # Stage 3: Extracting text
            yield await send_progress("extracting", "Extracting text from PDF...", 35)
            extracted_text, page_count = _extract_pdf_text(contents)
            print(f"[DEBUG] Text extracted: {len(extracted_text)} chars, {page_count} pages")
            
            # Stage 4: Normalizing text
            yield await send_progress("normalizing", "Normalizing text content...", 50)
            cleaned_text = _normalize_text(extracted_text)
            print(f"[DEBUG] Text normalized: {len(cleaned_text)} chars")
            
            if not cleaned_text:
                print("[DEBUG] No readable text found in PDF")
                yield await send_progress("error", "PDF did not contain readable text. If this is a scanned document, OCR is required.", 0)
                return
            
            # Stage 5: Analyzing with AI
            yield await send_progress("analyzing", "Analyzing CV with AI...", 65)
            from app.llm import chat
            
            system_prompt = """You are an expert CV analyzer. Your task is to deeply analyze a CV and extract comprehensive structured information.

IMPORTANT: Be thorough and extract ALL relevant information, not just surface-level content.

Return ONLY a valid JSON object with these exact keys:
{
  "keySkills": [array of technical and professional skills - extract ALL mentioned skills, max 25],
  "experienceHighlights": [array of key achievements, responsibilities, and accomplishments - extract ALL significant bullet points and achievements, max 20],
  "sectionsDetected": [array of main CV sections found],
  "publications": [array of publications/papers/research - extract ALL if any, max 15],
  "technicalProjects": [array of technical projects, side projects, or notable implementations - extract ALL if any, max 15],
  "researchAreas": [array of research areas, domains, or specializations - extract ALL if any, max 10],
  "certifications": [array of certifications, licenses, or credentials - extract ALL if any, max 10],
  "awards": [array of awards, honors, or recognitions - extract ALL if any, max 10],
  "languages": [array of programming languages and natural languages - extract ALL if any, max 15]
}

EXTRACTION GUIDELINES:
1. For keySkills: Extract every technical skill, programming language, tool, framework, methodology, and domain expertise mentioned. Include both hard skills and soft skills.
2. For experienceHighlights: Extract complete achievement statements, responsibilities, and quantified results. Include all significant accomplishments from all roles.
3. For publications: Extract all papers, conferences, journals, research outputs mentioned with full citations if available.
4. For technicalProjects: Extract all projects, implementations, systems built, or notable technical work. Include project names, technologies used, and outcomes.
5. For researchAreas: Extract research domains, specializations, focus areas, or academic interests.
6. For certifications: Extract any certifications, licenses, credentials, or professional qualifications.
7. For awards: Extract awards, honors, scholarships, recognitions, or special selections.
8. For languages: Extract both programming languages and natural languages mentioned.
9. For sectionsDetected: Identify all major sections in the CV.

Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations."""

            user_prompt = f"""Analyze this CV thoroughly and extract all relevant information:

{cleaned_text}

Return the JSON object with comprehensive extracted information."""

            print("[DEBUG] Calling AI chat...")
            response = await chat(system_prompt, user_prompt)
            print(f"[DEBUG] AI response received: {len(response)} chars")
            
            # Stage 6: Processing insights
            yield await send_progress("processing", "Processing extracted insights...", 80)
            
            cleaned_response = response.strip()
            if cleaned_response.startswith("```"):
                if "```json" in cleaned_response:
                    cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
                else:
                    cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()
            
            print(f"[DEBUG] Parsing JSON response...")
            insights = json.loads(cleaned_response)
            print(f"[DEBUG] JSON parsed successfully")
            
            # Validate and ensure all required keys exist
            required_keys = ["keySkills", "experienceHighlights", "sectionsDetected", "publications", "technicalProjects", "researchAreas", "certifications", "awards", "languages"]
            for key in required_keys:
                if key not in insights:
                    insights[key] = []
            
            insights["keySkills"] = insights.get("keySkills", [])[:25]
            insights["experienceHighlights"] = insights.get("experienceHighlights", [])[:20]
            insights["publications"] = insights.get("publications", [])[:15]
            insights["technicalProjects"] = insights.get("technicalProjects", [])[:15]
            insights["researchAreas"] = insights.get("researchAreas", [])[:10]
            insights["certifications"] = insights.get("certifications", [])[:10]
            insights["awards"] = insights.get("awards", [])[:10]
            insights["languages"] = insights.get("languages", [])[:15]
            insights["sectionsDetected"] = insights.get("sectionsDetected", [])
            
            # Stage 7: Complete
            yield await send_progress("complete", "CV analysis complete!", 100)
            
            # Final data payload
            yield json.dumps({
                "stage": "complete",
                "data": {
                    "status": "success",
                    "filename": file.filename,
                    "size": len(contents),
                    "page_count": page_count,
                    "text_length": len(cleaned_text),
                    "text": cleaned_text,
                    "text_preview": cleaned_text[:400],
                    "insights": insights,
                    "message": "CV uploaded and analyzed successfully"
                }
            }) + "\n"
            print("[DEBUG] Upload stream completed successfully")
            
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON parsing failed: {str(e)}")
            yield await send_progress("error", f"Failed to parse AI response: {str(e)}", 0)
        except Exception as e:
            print(f"[ERROR] Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            yield await send_progress("error", f"Error: {str(e)}", 0)
    
    return StreamingResponse(progress_generator(), media_type="application/x-ndjson")

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