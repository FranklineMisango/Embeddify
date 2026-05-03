from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import json
from typing import Optional
from app.config import settings
from app.llm import chat
from bs4 import BeautifulSoup
import re

router = APIRouter(prefix="/job-search", tags=["job-search"])

class JobSearchRequest(BaseModel):
    skills: list[str]
    location: str
    level: str  # "internship", "entry", "mid", "senior", "lead"
    job_title: Optional[str] = None
    cv_text: Optional[str] = None  # Full CV text for AI persona analysis

class JobAnalysisRequest(BaseModel):
    cv_text: str
    job_description: str
    job_title: str
    company: str

class JobMatch(BaseModel):
    title: str
    company: str
    location: str
    url: str
    snippet: str
    posted_date: Optional[str] = None

async def _fetch_google_page(client: httpx.AsyncClient, search_query: str, start: int, page_size: int) -> list[dict]:
    """Fetch a single page of Google Custom Search results (start is 1-indexed)."""
    params = {
        "key": settings.google_search_api_key,
        "cx": settings.google_search_engine_id,
        "q": search_query,
        "num": page_size,
        "start": start,
    }
    response = await client.get("https://www.googleapis.com/customsearch/v1", params=params)
    response.raise_for_status()
    return response.json().get("items", [])


async def search_google_jobs(query: str, location: str, num_results: int = 20) -> list[dict]:
    """Search for jobs using Google Custom Search API.
    
    Fetches up to two pages of 10 to reach the requested num_results (max 20),
    guaranteeing at least 10 results when available.
    """
    if not settings.google_search_api_key or not settings.google_search_engine_id:
        raise HTTPException(status_code=400, detail="Google Search API not configured")

    # Google CSE hard limit: 10 per page, pages start at index 1 and 11
    target = min(num_results, 20)
    page_size = 10  # Google API max per request

    search_query = f"{query} jobs {location}"
    print(f"[DEBUG] Searching: {search_query} (target={target})")

    try:
        async with httpx.AsyncClient() as client:
            # Always fetch page 1
            import asyncio
            page1_task = _fetch_google_page(client, search_query, start=1, page_size=page_size)

            # Fetch page 2 in parallel if we want more than 10
            if target > 10:
                page2_task = _fetch_google_page(client, search_query, start=11, page_size=page_size)
                page1_items, page2_items = await asyncio.gather(page1_task, page2_task, return_exceptions=True)
                raw_items = (page1_items if not isinstance(page1_items, Exception) else []) + \
                            (page2_items if not isinstance(page2_items, Exception) else [])
            else:
                raw_items = await page1_task

            print(f"[DEBUG] Got {len(raw_items)} raw results from Google")

            jobs = []
            seen_urls = set()

            for idx, item in enumerate(raw_items):
                title = item.get("title", "")
                snippet = item.get("snippet", "")
                url = item.get("link", "")

                if url in seen_urls:
                    continue
                seen_urls.add(url)

                print(f"[DEBUG] Result {idx}: {title[:60]} | URL: {url}")

                if is_valid_job_posting(title, snippet, url):
                    job = {
                        "title": clean_job_title(title),
                        "company": extract_company(title, url),
                        "location": location,
                        "url": url,
                        "snippet": snippet,
                        "posted_date": None,
                    }
                    jobs.append(job)
                    print(f"[DEBUG] ✓ Added: {job['title']} at {job['company']}")
                else:
                    print(f"[DEBUG] ✗ Filtered: {title[:60]}")

            print(f"[DEBUG] Final: {len(jobs)} valid jobs after filtering")
            return jobs

    except Exception as e:
        print(f"[ERROR] Google Search failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Job search failed: {str(e)}")

def is_valid_job_posting(title: str, snippet: str, url: str) -> bool:
    """Filter out only obvious non-job sources - lenient version"""
    title_lower = title.lower()
    url_lower = url.lower()
    
    # Only exclude obvious non-job sources
    exclude_domains = [
        "reddit.com",
        "twitter.com",
        "x.com",
        "facebook.com",
        "instagram.com",
        "tiktok.com",
        "youtube.com",
        "quora.com",
        "wikipedia.org",
    ]
    
    for domain in exclude_domains:
        if domain in url_lower:
            return False
    
    # Exclude obvious search result pages
    exclude_keywords = [
        "search results",
        "browse all jobs",
        "view all jobs",
        "see all jobs",
    ]
    
    for keyword in exclude_keywords:
        if keyword in title_lower:
            return False
    
    # Exclude non-job URLs (search pages, filters)
    if any(x in url_lower for x in ["/search?", "/results?", "/browse?", "/filter?"]):
        return False
    
    # Must have some job-related indicator
    job_keywords = ["job", "position", "role", "opening", "hire", "recruit", "career", "opportunity", "engineer", "developer", "analyst", "manager", "specialist", "coordinator", "associate", "intern", "vacancy", "recruitment", "careers", "opportunities"]
    has_job_keyword = any(keyword in title_lower for keyword in job_keywords)
    
    if not has_job_keyword:
        return False
    
    # Minimum title length
    if len(title) < 5:
        return False
    
    return True

def clean_job_title(title: str) -> str:
    """Clean up job title by removing extra text"""
    # Remove common suffixes
    suffixes = [
        " - LinkedIn",
        " | LinkedIn",
        " - Indeed",
        " | Indeed",
        " - Glassdoor",
        " | Glassdoor",
        " - Careers",
        " | Careers",
        " - Jobs",
        " | Jobs",
    ]
    
    for suffix in suffixes:
        if suffix in title:
            title = title.replace(suffix, "").strip()
    
    return title

def extract_company(title: str, url: str = "") -> str:
    """Extract company name from job title and URL"""
    # Try to extract from URL first (more reliable)
    if url:
        # Extract domain
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        
        # Remove www and common suffixes
        domain = domain.replace("www.", "").split(".")[0]
        
        # Capitalize
        if domain and domain not in ["linkedin", "indeed", "glassdoor", "careers", "jobs"]:
            return domain.capitalize()
    
    # Fallback: extract from title
    # Look for company name before common separators
    separators = [" - ", " | ", " at ", " for "]
    for sep in separators:
        if sep in title:
            parts = title.split(sep)
            # Company is usually after the job title
            if len(parts) > 1:
                potential_company = parts[-1].strip()
                # Remove common suffixes
                for suffix in [" - LinkedIn", " | LinkedIn", " - Indeed", " | Indeed", " Jobs", " Careers"]:
                    potential_company = potential_company.replace(suffix, "").strip()
                if potential_company and len(potential_company) < 50:
                    return potential_company
    
    return "Unknown"

async def infer_candidate_persona(cv_text: str, skills: list[str], level: str) -> dict:
    """Use AI to deeply analyze the CV and infer the candidate's ideal job persona."""
    
    level_labels = {
        "internship": "internship / student",
        "entry": "entry-level (0-2 years)",
        "mid": "mid-level (2-5 years)",
        "senior": "senior (5+ years)",
        "lead": "lead / principal",
    }
    # These are the exact terms we'll inject into the Google query — not left to the AI
    level_search_terms = {
        "internship": "internship",
        "entry": "junior",
        "mid": "mid-level",
        "senior": "senior",
        "lead": "lead",
        "any": "",   # no level filter
        "": "",      # no level filter
    }
    level_label = level_labels.get(level, level)

    prompt = f"""You are an expert career advisor and recruiter. Analyze this CV thoroughly and determine the candidate's professional identity.

CANDIDATE EXPERIENCE LEVEL: {level_label}
EXTRACTED SKILLS: {', '.join(skills[:20])}

FULL CV TEXT:
{cv_text[:4000]}

Based on the CV, determine:
1. What is this person's PRIMARY professional identity / strongest persona? (e.g. "quantitative researcher", "data scientist", "software engineer", "financial analyst")
2. What are the TOP 3 most specific job titles that would be a perfect match?
3. What industry/domain are they strongest in?
4. What is the best 2-4 word job role description (NO level/seniority words, NO location) to search for this person? e.g. "quantitative researcher", "data scientist", "software engineer"

Return ONLY a JSON object:
{{
  "primary_persona": "one clear job title that best describes this candidate",
  "top_job_titles": ["title1", "title2", "title3"],
  "industry": "primary industry or domain",
  "role_query": "2-4 word role description only, no seniority or location",
  "reasoning": "one sentence explaining why this persona fits"
}}

Return ONLY valid JSON, no markdown."""

    try:
        response = await chat("You are a career advisor identifying the best job search strategy for a candidate.", prompt)
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```json")[1].split("```")[0].strip() if "```json" in cleaned else cleaned.split("```")[1].split("```")[0].strip()
        persona = json.loads(cleaned)

        # Always build the final search query ourselves so the level term is guaranteed
        role_query = persona.get("role_query") or persona.get("primary_persona", " ".join(skills[:2]))
        level_term = level_search_terms.get(level, "")
        search_query = f"{level_term} {role_query}".strip()

        persona["search_query"] = search_query
        print(f"[DEBUG] AI persona: {persona.get('primary_persona')} | query: {search_query}")
        return persona
    except Exception as e:
        print(f"[DEBUG] Persona inference failed: {e}, falling back to skills-based query")
        skills_term = " ".join(skills[:2]) if skills else "developer"
        level_term = level_search_terms.get(level, "")
        return {
            "primary_persona": skills_term,
            "top_job_titles": [skills_term],
            "industry": "technology",
            "search_query": f"{level_term} {skills_term}".strip(),
            "reasoning": "Fallback to skills-based query"
        }


def build_search_query(skills: list[str], level: str, job_title: str = None) -> str:
    """Build a search query from skills and level, prioritizing actual job titles"""
    level_search_terms = {
        "internship": "internship",
        "entry": "junior",
        "mid": "mid-level",
        "senior": "senior",
        "lead": "lead",
        "any": "",
        "": "",
    }
    
    level_term = level_search_terms.get(level, "")
    
    # If we have a job title from the CV, use it as the primary search term
    if job_title and job_title.strip() and len(job_title.strip()) > 2:
        clean_title = job_title.strip().replace(".pdf", "").replace(".docx", "").strip()
        if clean_title and len(clean_title) > 2:
            return f"{level_term} {clean_title}".strip()
    
    # Fallback: use top 2 skills
    skills_term = " ".join(skills[:2]) if skills else "developer"
    return f"{level_term} {skills_term}".strip()

@router.post("/search")
async def search_jobs(req: JobSearchRequest):
    """Search for jobs based on skills, location, and level"""
    try:
        # Build search query
        query = build_search_query(req.skills, req.level, req.job_title)
        
        # Search for jobs
        jobs = await search_google_jobs(query, req.location, num_results=20)
        
        if not jobs:
            return {
                "status": "success",
                "jobs": [],
                "message": "No jobs found matching your criteria"
            }
        
        return {
            "status": "success",
            "jobs": jobs,
            "count": len(jobs),
            "message": f"Found {len(jobs)} job opportunities"
        }
    except Exception as e:
        print(f"[ERROR] Job search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Job search failed: {str(e)}")

@router.post("/search-and-rank")
async def search_and_rank_jobs(req: JobSearchRequest):
    """Search for jobs using AI-inferred candidate persona, then rank results against the full CV."""
    try:
        # Step 1: Use AI to infer the candidate's persona from the full CV
        if req.cv_text and len(req.cv_text.strip()) > 100:
            print("[DEBUG] Inferring candidate persona from full CV text...")
            persona = await infer_candidate_persona(req.cv_text, req.skills, req.level)
            search_query = persona.get("search_query", "")
            primary_persona = persona.get("primary_persona", "")
            top_titles = persona.get("top_job_titles", [])
            print(f"[DEBUG] Persona: {primary_persona} | Search: {search_query}")
        else:
            # Fallback to skills-based query
            search_query = build_search_query(req.skills, req.level, req.job_title)
            primary_persona = req.job_title or " ".join(req.skills[:2])
            top_titles = []
            print(f"[DEBUG] No CV text, using skills-based query: {search_query}")

        # Step 2: Search Google with the persona-driven query
        jobs = await search_google_jobs(search_query, req.location, num_results=20)

        if not jobs:
            return {
                "status": "success",
                "jobs": [],
                "persona": primary_persona,
                "message": "No jobs found matching your criteria"
            }

        # Step 3: AI ranking using full CV context
        print(f"[DEBUG] Ranking {len(jobs)} jobs against full CV persona...")

        jobs_summary = "\n".join([
            f"{i+1}. Title: {job['title']}\n   Company: {job['company']}\n   Snippet: {job['snippet'][:200]}"
            for i, job in enumerate(jobs)
        ])

        cv_context = req.cv_text[:2000] if req.cv_text else f"Skills: {', '.join(req.skills[:15])}"

        ranking_prompt = f"""You are an expert recruiter. Rank these job postings by how well they match this specific candidate.

CANDIDATE PERSONA: {primary_persona}
IDEAL JOB TITLES: {', '.join(top_titles)}
EXPERIENCE LEVEL: {req.level}
LOCATION: {req.location}

CV SUMMARY (first 2000 chars):
{cv_context}

JOB POSTINGS TO RANK:
{jobs_summary}

Rank ALL jobs from best to worst match. Consider:
1. How closely the job title matches the candidate's persona and background
2. Whether the required skills align with what's in the CV
3. Seniority level match
4. Industry/domain relevance

Return ONLY a JSON object:
{{
  "ranking": [
    {{"position": 1, "job_index": 0, "match_score": 95, "reason": "Matches candidate's X background because..."}},
    ...
  ]
}}

Include ALL {len(jobs)} jobs in the ranking. Return ONLY valid JSON."""

        try:
            ranking_response = await chat("You are a recruiter ranking jobs for a specific candidate.", ranking_prompt)
            cleaned = ranking_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```json")[1].split("```")[0].strip() if "```json" in cleaned else cleaned.split("```")[1].split("```")[0].strip()

            ranking_data = json.loads(cleaned)

            if "ranking" in ranking_data:
                ranked_jobs = []
                for rank_item in ranking_data["ranking"]:
                    job_idx = rank_item.get("job_index", 0)
                    if 0 <= job_idx < len(jobs):
                        job = jobs[job_idx].copy()
                        job["ai_match_score"] = rank_item.get("match_score", 0)
                        job["ai_reason"] = rank_item.get("reason", "")
                        ranked_jobs.append(job)
                jobs = ranked_jobs
                print(f"[DEBUG] AI ranked {len(jobs)} jobs")
        except Exception as e:
            print(f"[DEBUG] AI ranking failed, returning unranked: {e}")

        return {
            "status": "success",
            "jobs": jobs,
            "count": len(jobs),
            "persona": primary_persona,
            "message": f"Found {len(jobs)} jobs matched to your profile as {primary_persona}"
        }
    except Exception as e:
        print(f"[ERROR] Job search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Job search failed: {str(e)}")

@router.post("/fetch-job-description")
async def fetch_job_description(req: BaseModel):
    """Fetch full job description from URL"""
    class FetchRequest(BaseModel):
        url: str
    
    try:
        url = req.url if hasattr(req, 'url') else req.__dict__.get('url')
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        print(f"[DEBUG] Fetching job description from: {url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0, follow_redirects=True)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text
            text = soup.get_text()
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Limit to first 2000 characters to avoid huge descriptions
            description = text[:2000]
            
            print(f"[DEBUG] Fetched {len(description)} characters")
            
            return {
                "status": "success",
                "description": description,
                "url": url
            }
    except Exception as e:
        print(f"[ERROR] Failed to fetch job description: {str(e)}")
        # Return the snippet as fallback
        return {
            "status": "error",
            "description": "Could not fetch full description. Please visit the job posting directly.",
            "url": url
        }

@router.post("/analyze-jd")
async def analyze_job_description(req: JobAnalysisRequest):
    """Analyze job description against CV with comprehensive matching"""
    try:
        system_prompt = """You are an expert job matching analyst. Analyze the job description against the provided CV and provide a VERY comprehensive assessment.

Return ONLY a valid JSON object with these exact keys:
{
  "overallMatch": 0-100 percentage,
  "matchScore": {
    "skills": 0-100,
    "experience": 0-100,
    "education": 0-100,
    "seniority": 0-100
  },
  "keywordOverlap": 0-100 percentage,
  "matchedSkills": [list of skill strings from CV that match the JD],
  "missingSkills": [list of skill strings required NOT in CV],
  "keyRequirements": [list of top 10 key requirement strings from JD],
  "cvStrengths": [list of 5-8 strength strings relevant to this role],
  "gaps": [list of 5-8 gap strings between CV and JD],
  "recommendations": [list of 5-8 actionable recommendation strings to improve match],
  "estimatedFit": "excellent" | "good" | "moderate" | "poor",
  "fitExplanation": "detailed explanation of why this fit level",
  "sectionAnalysis": {
    "experience": {"match": 0-100, "details": "detailed analysis of experience match"},
    "projects": {"match": 0-100, "details": "detailed analysis of projects match"},
    "skills": {"match": 0-100, "details": "detailed analysis of skills match"},
    "education": {"match": 0-100, "details": "detailed analysis of education match"},
    "publications": {"match": 0-100, "details": "detailed analysis of publications match"}
  },
  "quickWins": [list of 3-5 skill/experience strings that can be quickly acquired],
  "criticalGaps": [list of 2-3 critical gap strings that would need significant work],
  "interviewTopics": [list of 5-8 topic strings to prepare for in interviews],
  "nextSteps": [list of 3-5 specific next step strings if interested in applying]
}

IMPORTANT FORMATTING RULES:
1. ALL arrays must contain ONLY STRINGS, not objects
2. matchedSkills, missingSkills, keyRequirements, cvStrengths, gaps, recommendations, quickWins, criticalGaps, interviewTopics, nextSteps must ALL be arrays of strings
3. Do NOT use objects with keys like {recommendation, timeline} - just use plain strings
4. Each string should be complete and self-contained

ANALYSIS GUIDELINES:
1. Be VERY thorough and specific - provide detailed explanations
2. Consider both hard skills and soft skills
3. Evaluate experience level and seniority alignment
4. Identify quick wins (skills that can be learned quickly)
5. Highlight critical gaps that would need addressing
6. Provide actionable recommendations with timelines embedded in the string
7. Analyze each section (experience, projects, skills, education, publications)
8. Calculate keyword overlap percentage
9. Provide interview preparation topics
10. Be honest about fit - don't inflate scores

Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations."""

        user_prompt = f"""Analyze this job opportunity against the provided CV and provide a VERY comprehensive assessment:

JOB TITLE: {req.job_title}
COMPANY: {req.company}

JOB DESCRIPTION:
{req.job_description}

CV TEXT:
{req.cv_text}

Provide a comprehensive job matching analysis with detailed explanations for each section. Remember: ALL arrays must contain ONLY STRINGS, not objects."""

        print("[DEBUG] Calling AI for comprehensive JD analysis...")
        response = await chat(system_prompt, user_prompt)
        print(f"[DEBUG] AI response received: {len(response)} chars")
        
        # Parse response
        cleaned_response = response.strip()
        if cleaned_response.startswith("```"):
            if "```json" in cleaned_response:
                cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
            else:
                cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()
        
        analysis = json.loads(cleaned_response)
        
        # Ensure all array fields contain only strings
        string_array_fields = [
            "matchedSkills", "missingSkills", "keyRequirements", "cvStrengths",
            "gaps", "recommendations", "quickWins", "criticalGaps", "interviewTopics", "nextSteps"
        ]
        
        for field in string_array_fields:
            if field in analysis and isinstance(analysis[field], list):
                # Convert any objects to strings
                analysis[field] = [
                    item if isinstance(item, str) else (
                        item.get("recommendation", str(item)) if isinstance(item, dict) else str(item)
                    )
                    for item in analysis[field]
                ]
        
        return {
            "status": "success",
            "analysis": analysis,
            "job": {
                "title": req.job_title,
                "company": req.company,
            }
        }
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON parsing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    except Exception as e:
        print(f"[ERROR] JD analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
