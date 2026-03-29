"""
AlphaFold-inspired match scoring:
- Overall score  = cosine similarity of sentence embeddings (like pTM)
- Per-section scores = keyword overlap per CV section (like per-residue pLDDT)
"""
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

# CV sections we track (maps to LaTeX section names)
CV_SECTIONS = {
    "experience": r"\\section\{(?:Professional|Employment|Research)[^}]*\}(.*?)(?=\\section|\\end\{document\})",
    "projects": r"\\section\{(?:Projects|Engineering)[^}]*\}(.*?)(?=\\section|\\end\{document\})",
    "skills": r"\\section\{Technical Skills\}(.*?)(?=\\section|\\end\{document\})",
    "education": r"\\section\{Education\}(.*?)(?=\\section|\\end\{document\})",
    "publications": r"\\section\{(?:Publications|Quantitative Research)[^}]*\}(.*?)(?=\\section|\\end\{document\})",
}

def _strip_latex(text: str) -> str:
    text = re.sub(r"\\[a-zA-Z]+\{([^}]*)\}", r"\1", text)
    text = re.sub(r"\\[a-zA-Z]+", " ", text)
    text = re.sub(r"[{}]", " ", text)
    return " ".join(text.split())

def score_match(cv_latex: str, job_description: str) -> dict:
    model = get_model()
    cv_plain = _strip_latex(cv_latex)

    # Overall semantic similarity
    embs = model.encode([cv_plain, job_description])
    overall = float(cosine_similarity([embs[0]], [embs[1]])[0][0])

    # Per-section scores
    section_scores = {}
    for section, pattern in CV_SECTIONS.items():
        match = re.search(pattern, cv_latex, re.DOTALL | re.IGNORECASE)
        if match:
            section_text = _strip_latex(match.group(1))
            if section_text.strip():
                s_embs = model.encode([section_text, job_description])
                section_scores[section] = round(float(cosine_similarity([s_embs[0]], [s_embs[1]])[0][0]), 3)
            else:
                section_scores[section] = 0.0
        else:
            section_scores[section] = 0.0

    # Keyword extraction from JD
    jd_words = set(re.findall(r"\b[a-zA-Z]{4,}\b", job_description.lower()))
    cv_words = set(re.findall(r"\b[a-zA-Z]{4,}\b", cv_plain.lower()))
    keyword_overlap = round(len(jd_words & cv_words) / max(len(jd_words), 1), 3)

    return {
        "overall": round(overall, 3),
        "sections": section_scores,
        "keyword_overlap": keyword_overlap,
        "confidence_label": _confidence_label(overall),
    }

def _confidence_label(score: float) -> str:
    """AlphaFold-style confidence labels."""
    if score >= 0.80: return "Very High"
    if score >= 0.65: return "High"
    if score >= 0.50: return "Medium"
    if score >= 0.35: return "Low"
    return "Very Low"
