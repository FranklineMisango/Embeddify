# Docker Migration Guide

## Why we switched to Docker

macOS dropped support for PyTorch ≥ 2.4 on certain architectures (x86_64 + arm64
compatibility layers). The app uses `sentence-transformers`, which depends on PyTorch.

By running inside Docker with **PyTorch 2.3.1 (CPU-only)**, we get:

- ✅ Works on **any** host OS / architecture (macOS, Linux, Windows)
- ✅ No more `pip install torch` conflicts on macOS
- ✅ Isolated, reproducible environment
- ✅ All services spin up with a single command

## New & Changed Files

| File | Description |
|------|-------------|
| `docker-compose.yml` | Orchestrates Postgres, Redis, Backend & Frontend |
| `backend/Dockerfile` | Pins PyTorch 2.3.1 (CPU) + installs all deps + Playwright |
| `frontend/Dockerfile` | Multi-stage Next.js build (standalone output) |
| `backend/.dockerignore` | Speeds up Docker builds |
| `run-all.sh` | **Rewritten** — now wraps `docker compose` |

## Quick Start

```bash
# 1. Ensure your .env is at backend/.env with your API keys
#    (DEEPSEEK_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, etc.)

# 2. Build & start everything
./run-all.sh --build

# 3. Open in browser
#    Frontend: http://localhost:3000
#    Backend:  http://localhost:8000
#    API Docs: http://localhost:8000/docs
```

## Useful Commands

```bash
# Start in background
./run-all.sh --detach

# Stop all services
./run-all.sh stop

# Rebuild images from scratch (no cache)
./run-all.sh rebuild

# Tail logs
./run-all.sh logs
./run-all.sh logs backend    # just backend
./run-all.sh logs frontend   # just frontend
```

## How it works

1. **`docker compose up`** starts Postgres, Redis, Backend, and Frontend.
2. The **backend Dockerfile** installs `torch==2.3.1` (CPU-only) from the official
   PyTorch CPU wheel index before installing `requirements.txt`. This ensures
   `sentence-transformers` has a compatible PyTorch version.
3. The backend source is **mounted as a volume** (`./backend:/app`), so uvicorn's
   `--reload` flag picks up code changes instantly — no rebuild needed for edits.
4. The frontend is built once via multi-stage Docker (standalone Next.js output).

## Environment Variables

`docker-compose.yml` loads variables from `backend/.env` via the `env_file` directive.
Your `.env` is already at `backend/.env` — no changes needed.
