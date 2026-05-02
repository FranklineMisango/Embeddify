from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db
from app.routers import jobs, cv

app = FastAPI(title="CV Job Matcher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        await init_db()
    except Exception as e:
        print(f"Warning: Could not initialize database: {e}")
        print("Running in database-unavailable mode")

app.include_router(jobs.router)
app.include_router(cv.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
