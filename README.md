# CV Job Matcher

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # fill in your keys
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
Needs PostgreSQL running locally. The app auto-creates tables on startup.
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=cvmatcher postgres:16
```

## Usage
1. Go to `/jobs` → scrape LinkedIn/Indeed
2. Go to `/match` → paste a JD, see AlphaFold-style match viz
3. Go to `/cv` → let DeepSeek rewrite your CV for the role, download `.tex`
4. Dashboard → Kanban tracker for all jobs
