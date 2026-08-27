from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import Job
from app.scraper.linkedin import scrape_linkedin
from app.scraper.indeed import scrape_indeed
from app.nlp.matcher import score_match
from app.routers.job_search import is_valid_job_posting
from pydantic import BaseModel

router = APIRouter(prefix="/jobs", tags=["jobs"])

class ScrapeRequest(BaseModel):
    query: str
    location: str = ""
    sources: list[str] = ["linkedin", "indeed"]
    limit: int = 20

class StatusUpdate(BaseModel):
    status: str

@router.post("/scrape")
async def scrape_jobs(req: ScrapeRequest, db: AsyncSession = Depends(get_db)):
    all_jobs = []
    if "linkedin" in req.sources:
        all_jobs += await scrape_linkedin(req.query, req.location, req.limit)
    if "indeed" in req.sources:
        all_jobs += await scrape_indeed(req.query, req.location, req.limit)

    all_jobs = [
        job for job in all_jobs
        if is_valid_job_posting(job.get("title", ""), job.get("description", ""), job.get("url", ""), req.location)
    ]

    saved = []
    for j in all_jobs:
        existing = await db.execute(select(Job).where(Job.url == j["url"]))
        if existing.scalar_one_or_none():
            continue
        job = Job(**j)
        db.add(job)
        saved.append(j)
    await db.commit()
    return {"scraped": len(all_jobs), "new": len(saved)}

@router.get("/")
async def list_jobs(status: str = None, db: AsyncSession = Depends(get_db)):
    q = select(Job).order_by(Job.scraped_at.desc())
    if status:
        q = q.where(Job.status == status)
    result = await db.execute(q)
    jobs = result.scalars().all()
    return [{"id": j.id, "title": j.title, "company": j.company, "location": j.location,
             "url": j.url, "source": j.source, "status": j.status,
             "match_score": j.match_score, "match_breakdown": j.match_breakdown,
             "scraped_at": j.scraped_at} for j in jobs]

@router.delete("/all")
async def clear_all_jobs(db: AsyncSession = Depends(get_db)):
    """Delete all scraped jobs from the database."""
    from sqlalchemy import delete
    await db.execute(delete(Job))
    await db.commit()
    return {"ok": True, "message": "All jobs cleared"}

@router.patch("/{job_id}/status")
async def update_status(job_id: int, body: StatusUpdate, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    job.status = body.status
    await db.commit()
    return {"ok": True}

@router.post("/{job_id}/match")
async def match_job(job_id: int, cv_text: str = "", db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="cv_text is required")
    result = score_match(cv_text, job.description)
    job.match_score = result["overall"]
    job.match_breakdown = result
    await db.commit()
    return result
