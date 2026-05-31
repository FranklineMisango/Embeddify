"""Tailor a CV text to a specific job description using DeepSeek."""
from app.llm import chat

from app.constants import VARIANT_LABELS

SYSTEM_PROMPT = """You are an expert CV writer.
Given a CV and a job description, rewrite the CV to better match the role while keeping the facts accurate.
Rewrite only the content that needs to change, preserve the candidate's experience, and return only the tailored CV text.
Do not use LaTeX formatting unless it already appears in the source CV. Return plain text or markdown only, with no explanation."""


async def customize_cv(cv_text: str, job_description: str, variant: str = "data_science") -> str:
    style = VARIANT_LABELS.get(variant, VARIANT_LABELS["data_science"])
    user_prompt = f"""TARGET STYLE:
{style}

JOB DESCRIPTION:
{job_description}

CURRENT CV:
{cv_text}

Return the tailored CV text."""
    return await chat(SYSTEM_PROMPT, user_prompt)