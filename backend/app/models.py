from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True)
    title = Column(String(255))
    company = Column(String(255))
    location = Column(String(255))
    description = Column(Text)
    url = Column(String(512), unique=True)
    source = Column(String(64))  # linkedin, indeed, etc.
    status = Column(String(32), default="scraped")  # scraped|applied|interview|offer|rejected
    match_score = Column(Float, nullable=True)
    match_breakdown = Column(JSON, nullable=True)  # per-section scores
    scraped_at = Column(DateTime, default=datetime.utcnow)

class CVVersion(Base):
    __tablename__ = "cv_versions"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, nullable=True)
    variant = Column(String(64))  # data_science, quant, bi_sc, research
    latex_content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
