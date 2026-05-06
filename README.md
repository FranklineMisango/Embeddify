# Embeddify

> AI-powered job matching & strategic career planning — upload your CV once, get ranked opportunities, deep match analysis, and agentic target-role strategy.

![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-00D084?style=flat-square)
![DeepSeek](https://img.shields.io/badge/LLM-DeepSeek-6366f1?style=flat-square)
![SentenceTransformers](https://img.shields.io/badge/NLP-Sentence--Transformers-orange?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## App Flow

### 1 — Upload your CV
Upload your PDF once. Embeddify extracts the full text and runs it through DeepSeek to build a structured profile: skills, experience highlights, projects, publications, research areas, certifications, and awards.

![CV Upload & Profile](images/cover_page_load_1.png)

---

### 2 — Explore your skill profile
Review everything the AI extracted from your CV. Edit or confirm your key skills before searching.

![Skills & Insights](images/cv_skills_2.png)

---

### 3 — Auto job search & deep match analysis
The search page fires automatically on load. DeepSeek reads your full CV, infers your professional persona, and builds a targeted Google search query. Results are ranked by AI match score. Click any job to run a comprehensive analysis: overall match %, section-by-section breakdown, matched skills, missing skills, quick wins, critical gaps, recommendations, interview topics, and next steps.

![Job Match Analysis](images/matcher_3.png)

---

### 4 — Generate target-role strategy (LangGraph ReAct agent)
On the **Documents** page, enter a target role (or let Embeddify infer one from your CV). The system orchestrates a multi-step strategy using **LangGraph**:

1. **Variant Selection** — Scores your CV against reference templates (Data Science, Quant, Research, BI, etc.)
2. **Job Market Signal Fetch** — Retrieves live job listings via Google Custom Search to understand market demands
3. **Strategy Synthesis** — DeepSeek analyzes your CV + market signals and generates:
   - **Focus notes** — 3–7 actionable improvements
   - **Resume sentiment** — Is your CV strong for this role?
   - **Market sentiment** — How competitive is this role in the market?
   - **Action plan** — Concrete next steps (skills to acquire, projects to build, etc.)
   - **Evidence** — Cited quotes from your CV, reference templates, and job listings
   - **Job requirements** — Key market signals surfaced from real job postings

All strategy analysis is **evidence-backed** with citations to source documents.

---

## Tech Stack

### AI & NLP
| Component | Technology |
|---|---|
| **Agentic Orchestration** | **LangGraph** (ReAct pattern) |
| LLM Framework | **LangChain** + **LangChain OpenAI** |
| LLM (CV analysis, persona inference, JD matching, strategy synthesis) | **DeepSeek** (`deepseek-chat`) via OpenAI-compatible API |
| Fallback LLM | **OpenAI** `gpt-4o` |
| Semantic similarity scoring | **Sentence Transformers** `all-MiniLM-L6-v2` |
| Cosine similarity | **scikit-learn** |
| Job search | **Google Custom Search API** (2 parallel pages → up to 20 results) |
| CV text extraction | **PyPDF2** |
| JD scraping | **Playwright** + **BeautifulSoup4** |

### Backend
| Component | Technology |
|---|---|
| API framework | **FastAPI** + **Uvicorn** |
| Database ORM | **SQLAlchemy** + **Alembic** |
| Database | **PostgreSQL 16** |
| Async HTTP | **httpx** |
| Task queue | **Celery** + **Redis** |

### Frontend
| Component | Technology |
|---|---|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| HTTP client | **Axios** |
| State | React Context + localStorage |

---

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # fill in your keys
uvicorn app.main:app --reload
```

Or from the repo root:
```bash
uvicorn app.main:app --app-dir backend --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Run Everything With One Command
```bash
chmod +x run-all.sh
./run-all.sh
```

This starts:
- PostgreSQL in Docker (`embeddify-postgres`)
- FastAPI backend on port `8000`
- Next.js frontend on port `3000`

Press `Ctrl+C` to stop backend and frontend. The Postgres container keeps running.

### Database (manual)
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=embeddify postgres:16
```

Tables are created automatically on first startup.

---

## Environment Variables

**`backend/.env`**
```
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...          # optional fallback
LLM_PROVIDER=deepseek
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
DATABASE_URL=postgresql://user:password@localhost:5432/embeddify
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Features

- **Auto job search** — fires on page load, no manual query needed
- **AI persona inference** — DeepSeek reads your full CV and determines your professional identity before searching
- **Comprehensive JD analysis** — 10+ dimensions: overall match, section scores, matched/missing skills, quick wins, critical gaps, recommendations, interview prep, next steps
- **LangGraph ReAct target-role strategy agent** — Multi-step agentic orchestration:
  - Variant selection (CV similarity scoring)
  - Live job market signal fetching
  - Evidence-backed strategy synthesis with citations
  - Focus notes, sentiment analysis, actionable next steps
- **CV profile extraction** — Structured insights from your resume: skills, highlights, projects, publications, research areas, certifications
- **Kanban tracker** — track applications across Scraped → Applied → Interview → Offer → Rejected
- **Semantic scoring** — `all-MiniLM-L6-v2` embeddings for cosine similarity matching
