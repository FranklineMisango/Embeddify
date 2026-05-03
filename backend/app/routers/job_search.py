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

async def search_google_jobs(query: str, location: str, num_results: int = 15) -> list[dict]:
    """Search for jobs using Google Custom Search API"""
    if not settings.google_search_api_key or not settings.google_search_engine_id:
        raise HTTPException(status_code=400, detail="Google Search API not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # Build search query - more flexible to get results
            search_query = f"{query} jobs {location}"
            
            params = {
                "key": settings.google_search_api_key,
                "cx": settings.google_search_engine_id,
                "q": search_query,
                "num": min(num_results, 10),  # Google API max is 10 per request
            }
            
            print(f"[DEBUG] Searching: {search_query}")
            response = await client.get("https://www.googleapis.com/customsearch/v1", params=params)
            response.raise_for_status()
            
            results = response.json()
            print(f"[DEBUG] Got {len(results.get('items', []))} results from Google")
            
            jobs = []
            
            if "items" in results:
                for idx, item in enumerate(results["items"]):
                    title = item.get("title", "")
                    snippet = item.get("snippet", "")
                    url = item.get("link", "")
                    
                    print(f"[DEBUG] Result {idx}: {title[:60]}... | URL: {url}")
                    
                    # More lenient filtering - just exclude obvious list pages
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
                        print(f"[DEBUG] ✗ Filtered out: {title[:60]}...")
            
            print(f"[DEBUG] Final: {len(jobs)} valid jobs after filtering")
            return jobs
    except Exception as e:
        print(f"[ERROR] Google Search failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Job search failed: {str(e)}")

def is_valid_job_posting(title: str, snippet: str, url: str) -> bool:
    """Filter out irrelevant search results - strict version"""
    title_lower = title.lower()
    snippet_lower = snippet.lower()
    url_lower = url.lower()
    
    # Exclude obvious non-job sources
    exclude_domains = [
        "reddit.com",
        "twitter.com",
        "x.com",
        "facebook.com",
        "instagram.com",
        "tiktok.com",
        "youtube.com",
        "quora.com",
        "medium.com",
        "dev.to",
        "stackoverflow.com",
        "github.com",
        "wikipedia.org",
        "news.",
        "blog.",
    ]
    
    for domain in exclude_domains:
        if domain in url_lower:
            return False
    
    # Exclude obvious list/aggregator pages
    exclude_keywords = [
        "jobs in ",
        "jobs near ",
        "job search results",
        "browse all jobs",
        "search results",
        "all jobs",
        "view all",
        "see all",
        "more jobs",
        "similar jobs",
        "related jobs",
        "r/",  # Reddit subreddit
        "discussion",
        "forum",
        "thread",
        "post",
    ]
    
    for keyword in exclude_keywords:
        if keyword in title_lower:
            return False
    
    # Exclude non-job URLs
    if any(x in url_lower for x in ["/search?", "/results?", "/browse?", "/filter?", "/r/", "/t/", "/thread"]):
        return False
    
    # Must have job-related keywords in title
    job_keywords = ["job", "position", "role", "opening", "hire", "recruit", "career", "opportunity", "engineer", "developer", "analyst", "manager", "specialist", "coordinator", "associate", "intern", "vacancy", "recruitment"]
    has_job_keyword = any(keyword in title_lower for keyword in job_keywords)
    
    if not has_job_keyword:
        return False
    
    # Exclude very short titles (likely not real jobs)
    if len(title) < 15:
        return False
    
    # Prefer known job boards and company career pages
    preferred_domains = [
        "linkedin.com",
        "indeed.com",
        "glassdoor.com",
        "monster.com",
        "dice.com",
        "builtin.com",
        "techcrunch.com/jobs",
        "angel.co",
        "crunchboard.com",
        "hired.com",
        "toptal.com",
        "upwork.com",
        "freelancer.com",
        "careers.",  # company career pages
        "jobs.",     # company job pages
        "apply.",    # company apply pages
    ]
    
    is_preferred = any(domain in url_lower for domain in preferred_domains)
    
    # If not from a preferred source, be extra strict
    if not is_preferred:
        # Must have very clear job indicators
        strong_job_keywords = ["hiring", "now hiring", "apply now", "apply here", "job opening", "position available", "we are hiring", "we're hiring"]
        has_strong_keyword = any(keyword in title_lower or keyword in snippet_lower for keyword in strong_job_keywords)
        
        if not has_strong_keyword:
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

def build_search_query(skills: list[str], level: str) -> str:
    """Build a search query from skills and level"""
    level_keywords = {
        "internship": "internship",
        "entry": "entry level junior",
        "mid": "mid-level",
        "senior": "senior",
        "lead": "lead principal",
    }
    
    level_term = level_keywords.get(level, "")
    skills_term = " OR ".join(skills[:5])  # Use top 5 skills
    
    # Add site restrictions to prioritize job boards
    return f'({level_term} {skills_term} engineer developer) (site:linkedin.com OR site:indeed.com OR site:glassdoor.com OR site:builtin.com OR site:dice.com OR site:hired.com OR site:angel.co OR "careers" OR "jobs" OR "apply now")'

@router.post("/search")
async def search_jobs(req: JobSearchRequest):
    """Search for jobs based on skills, location, and level"""
    try:
        # Build search query
        query = build_search_query(req.skills, req.level)
        
        # Search for jobs
        jobs = await search_google_jobs(query, req.location, num_results=15)
        
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
