#!/usr/bin/env bash
# =============================================================================
# deploy.sh — One-command deploy for Embeddify (EC2 / Docker)
#
# Usage:
#   ./deploy.sh                  # pull latest, rebuild, restart
#   ./deploy.sh --no-pull        # skip git pull
#   ./deploy.sh --fast           # only restart containers, no rebuild
#   ./deploy.sh --build-backend  # rebuild only backend
#   ./deploy.sh --build-frontend # rebuild only frontend
#   ./deploy.sh --no-caddy       # skip Caddy restart (preserve SSL certs)
#
# What this does:
#   1. Optionally pulls latest code from git
#   2. Builds fresh Docker images (or skips with --fast)
#   3. Restarts all containers via docker compose
#   4. Waits for health checks then reports status
#   5. Optionally restarts Caddy (skipped with --no-caddy)
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
COMPOSE_CMD="docker compose -f ${COMPOSE_FILE}"

# ── Colours for pretty output ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Parse arguments ─────────────────────────────────────────────────────────
DO_PULL=true
DO_BUILD=true
DO_CADDY=true
BUILD_BACKEND=false
BUILD_FRONTEND=false

for arg in "$@"; do
  case "${arg}" in
    --no-pull)         DO_PULL=false       ;;
    --fast)            DO_BUILD=false      ;;
    --build-backend)   BUILD_BACKEND=true; DO_BUILD=false ;;
    --build-frontend)  BUILD_FRONTEND=true; DO_BUILD=false ;;
    --no-caddy|--skip-caddy) DO_CADDY=false ;;
    --help|-h)
      echo "Usage: $0 [--no-pull] [--fast] [--build-backend] [--build-frontend] [--no-caddy]"
      exit 0
      ;;
  esac
done

# ── Ensure docker is available ──────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log_error "Docker is required but not found in PATH."
  exit 1
fi

echo ""
echo "============================================"
echo "  🚀  Embeddify — Deploy Script"
echo "============================================"
echo ""

# ── 1. Git pull (optional) ─────────────────────────────────────────────────
if [ "$DO_PULL" = true ]; then
  log_info "Pulling latest code from git..."
  cd "$ROOT_DIR"
  if git pull origin main 2>/dev/null || git pull origin master 2>/dev/null; then
    log_ok "Git pull successful."
  else
    log_warn "Git pull skipped or not a git repository."
  fi
else
  log_info "Skipping git pull (--no-pull)."
fi

# ── 2. Copy the latest Caddyfile into context (in case docker-compose needs it) ──
log_info "Ensuring Caddyfile is up-to-date..."
# Caddyfile is mounted/baked, so we just confirm it exists
if [ -f "${ROOT_DIR}/Caddyfile" ]; then
  log_ok "Caddyfile found."
else
  log_error "Caddyfile not found at ${ROOT_DIR}/Caddyfile!"
  exit 1
fi

# ── 3. Build images (selective) ────────────────────────────────────────────
if [ "$BUILD_BACKEND" = true ]; then
  log_info "Rebuilding backend image..."
  ${COMPOSE_CMD} build --no-cache backend
  log_ok "Backend image rebuilt."

elif [ "$BUILD_FRONTEND" = true ]; then
  log_info "Rebuilding frontend image..."
  # Use DOCKER_BUILDKIT=1 for better progress reporting
  DOCKER_BUILDKIT=1 docker build --no-cache \
    -t embeddify-frontend:latest \
    -f "${ROOT_DIR}/frontend/Dockerfile" \
    "${ROOT_DIR}/frontend/"
  log_ok "Frontend image rebuilt."

elif [ "$DO_BUILD" = true ]; then
  log_info "Rebuilding all images..."
  # Frontend: build separately with explicit docker build to avoid timeout
  # on the "collecting build traces" phase (common with docker compose build)
  log_info "Building frontend (standalone build)..."
  DOCKER_BUILDKIT=1 docker build --no-cache \
    -t embeddify-frontend:latest \
    -f "${ROOT_DIR}/frontend/Dockerfile" \
    "${ROOT_DIR}/frontend/"
  log_ok "Frontend image built."

  log_info "Building backend..."
  ${COMPOSE_CMD} build --no-cache backend
  log_ok "Backend image built."
else
  log_info "Skipping build (--fast)."
fi

# ── 4. Start everything ────────────────────────────────────────────────────
log_info "Starting all services..."
${COMPOSE_CMD} up -d
log_ok "All services started."

# ── 5. Wait for health checks & report status ─────────────────────────────
echo ""
log_info "Waiting for services to become healthy..."
sleep 5

# Check each container
CONTAINERS=("embeddify-postgres" "embeddify-redis" "embeddify-backend" "embeddify-frontend")

for container in "${CONTAINERS[@]}"; do
  max_retries=12  # ~60 seconds total
  count=0
  while [ $count -lt $max_retries ]; do
    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "missing")
    health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}running{{end}}' "$container" 2>/dev/null || echo "unknown")

    if [ "$status" = "running" ] && { [ "$health" = "healthy" ] || [ "$health" = "running" ]; }; then
      log_ok "${container} — ${status} (${health})"
      break
    fi

    if [ "$status" != "running" ]; then
      log_warn "${container} — ${status} (waiting...)"
    fi

    sleep 5
    count=$((count + 1))
  done

  if [ $count -eq $max_retries ]; then
    log_warn "${container} — did not become healthy within timeout."
    log_info "Check logs: docker logs ${container} --tail 30"
  fi
done

# ── 6. Restart Caddy (to pick up Caddyfile changes) ────────────────────────
# NOTE: Skipping Caddy restart preserves existing SSL certificates.
# Use --no-caddy in CI to avoid SSL renewal on every deploy.
if [ "$DO_CADDY" = true ]; then
  if docker ps --format '{{.Names}}' | grep -q 'embeddify-caddy'; then
    log_info "Restarting Caddy to pick up config changes..."
    docker restart embeddify-caddy
    log_ok "Caddy restarted."
  fi
else
  log_info "Skipping Caddy restart (--no-caddy). SSL certificates preserved."
fi

# ── 7. Summary ─────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅  Deploy Complete!"
echo "============================================"
echo ""
echo "  Frontend  → http://localhost:3000"
echo "  Backend   → http://localhost:8000"
echo "  Docs      → http://localhost:8000/docs"
echo "  Live URL  → https://embeddify.misango.me"
echo ""
echo "  Quick commands:"
echo "    ./run-all.sh logs       → tail logs"
echo "    ./run-all.sh logs backend → backend logs"
echo "    ./run-all.sh stop       → stop all"
echo "    docker compose -f ${COMPOSE_FILE} ps → container status"
echo ""
echo "============================================"

