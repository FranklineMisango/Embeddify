from fastapi import APIRouter
from pydantic import BaseModel
from app.cv_builder.customizer import customize_cv
from app.nlp.matcher import score_match
from app.cv_builder.customizer import CV_FILES, REPO_ROOT

router = APIRouter(prefix="/cv", tags=["cv"])

class CustomizeRequest(BaseModel):
    variant: str = "data_science"  # data_science|quant|bi_sc|research|full
    job_description: str

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
