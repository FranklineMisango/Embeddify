# Embeddify

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # fill in your keys
uvicorn app.main:app --reload
```

If you want to start the backend from the repository root instead of `cd backend`, use:
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
From the repo root:
```bash
chmod +x run-all.sh
./run-all.sh
```

This starts:
- PostgreSQL in Docker (`embeddify-postgres`)
- FastAPI backend on port `8000`
- Next.js frontend on port `3000`

Press `Ctrl+C` to stop backend and frontend. The Postgres container stays running.

### Database
Needs PostgreSQL running locally. The app auto-creates tables on startup.
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=embeddify postgres:16
```

## Usage
1. Go to `/jobs` → scrape LinkedIn/Indeed
2. Go to `/match` → upload your CV PDF + paste a JD, then see match viz
3. Go to `/cv` → let DeepSeek rewrite your CV for the role, download `.tex`
4. Dashboard → Kanban tracker for all jobs
