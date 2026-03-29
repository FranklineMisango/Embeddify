"""Tailor a CV LaTeX file to a specific job description using DeepSeek."""
import os
import pathlib
from app.llm import chat

CV_FILES = {
    "data_science": "Data_Science_Machine_Learning/Frankline_Oyolo_2026_Resume.tex",
    "quant": "Quant_Researcher/Frankline_Oyolo_QRD_2025.tex",
    "bi_sc": "Business_Intelligence_Supply_Chain/Frankline_Oyolo_BI_SC_2026.tex",
    "research": "Research_Roles/Frankline_Oyolo_Research_Resume.tex",
    "full": "Bigger_CV_Education/Frankline_Oyolo_2026_CV.tex",
}

REPO_ROOT = pathlib.Path(__file__).parents[4]  # workspace root

SYSTEM_PROMPT = """You are an expert CV writer and LaTeX engineer.
Given a LaTeX CV and a job description, rewrite ONLY the bullet points and summary 
to better match the job — keep all LaTeX commands, structure, and formatting intact.
Emphasize relevant skills, reorder bullet points by relevance, and inject keywords 
from the job description naturally. Return ONLY the complete modified LaTeX, no explanation."""

async def customize_cv(variant: str, job_description: str) -> str:
    tex_path = REPO_ROOT / CV_FILES.get(variant, CV_FILES["data_science"])
    latex = tex_path.read_text()
    user_prompt = f"""JOB DESCRIPTION:
{job_description}

CURRENT CV (LaTeX):
{latex}

Return the tailored LaTeX CV."""
    return await chat(SYSTEM_PROMPT, user_prompt)
