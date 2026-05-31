#!/usr/bin/env bash
# =============================================================================
# run-all.sh — Docker Compose launcher for Embeddify
#
# Usage:
#   ./run-all.sh                  # build & start in foreground
#   ./run-all.sh --build          # rebuild images & start
#   ./run-all.sh --detach         # start in background
#   ./run-all.sh stop             # stop all services
#   ./run-all.sh logs             # tail logs
#   ./run-all.sh rebuild          # rebuild backend/frontend images
#
# What this does:
#   - Starts Postgres, Redis, Backend (FastAPI), and Frontend (Next.js)
#   - The backend's PyTorch is pinned to 2.3.1 (CPU-only) so that
#     sentence-transformers works on ANY host OS/architecture — including
#     macOS, which dropped support for PyTorch >= 2.4.
#   - Backend source is mounted for hot-reload (uvicorn --reload).
#   - Frontend is built as a standalone Next.js app.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
COMPOSE_CMD="docker compose -f ${COMPOSE_FILE}"

# ── Ensure docker compose is available ──────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "Error: docker is required but not found in PATH."
  exit 1
fi

# ── Sub-commands ────────────────────────────────────────────────────────────
case "${1:-up}" in

  stop)
    echo "Stopping all services..."
    ${COMPOSE_CMD} down
    echo "Done."
    exit 0
    ;;

  logs)
    shift
    ${COMPOSE_CMD} logs -f "$@"
    exit 0
    ;;

  rebuild)
    echo "Rebuilding backend & frontend images..."
    ${COMPOSE_CMD} build --no-cache backend frontend
    echo "Build complete. Start with:  ./run-all.sh"
    exit 0
    ;;

  up|*)
    # Default: docker compose up
    BUILD_FLAG=""
    DETACH_FLAG=""

    for arg in "$@"; do
      case "${arg}" in
        --build)    BUILD_FLAG="--build"   ;;
        --detach|-d) DETACH_FLAG="-d"       ;;
      esac
    done

    echo "============================================"
    echo "  Embeddify — Dockerised Launch"
    echo "============================================"
    echo ""
    echo "  Frontend  → http://localhost:3000"
    echo "  Backend   → http://localhost:8000"
    echo "  Docs      → http://localhost:8000/docs"
    echo ""
    echo "  Mode: $([ -n "$DETACH_FLAG" ] && echo 'detached' || echo 'foreground')"
    echo ""
    echo "  Press Ctrl+C to stop (foreground mode)."
    echo "============================================"
    echo ""

    ${COMPOSE_CMD} up ${BUILD_FLAG} ${DETACH_FLAG}
    ;;
esac
