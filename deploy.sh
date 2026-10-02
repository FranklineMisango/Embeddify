\#!/usr/bin/env bash
# =============================================================================
# deploy.sh — One-command deploy for Embeddify (Local or EC2 / Docker)
#
# Usage:
#   ./deploy.sh                          # pull latest, rebuild, restart (local)
#   ./deploy.sh --no-pull                # skip git pull
#   ./deploy.sh --fast                   # only restart containers, no rebuild
#   ./deploy.sh --build-backend          # rebuild only backend
#   ./deploy.sh --build-frontend         # rebuild only frontend
#   ./deploy.sh --fresh                  # start Caddy and provision TLS on a new host
#
#   # ── EC2 remote deployment ──────────────────────────────────────────────
#   ./deploy.sh --ec2 HOST               # deploy to EC2 (SSH)
#   ./deploy.sh --ec2 HOST --fast        # fast restart on EC2
#   ./deploy.sh --ec2 HOST --no-pull     # skip pull on EC2
#
#   SSH credentials are resolved in order:
#     1. --ec2-user USER / --ec2-key PATH  (CLI flags)
#     2. EC2_USER / EC2_SSH_KEY env vars
#     3. Defaults: ubuntu / ~/.ssh/ec2-key.pem
#
#   App directory on EC2 defaults to ~/codechest/Embeddify.
#   Override with --ec2-dir PATH or EC2_DIR env var.
#
# What this does:
#   1. Optionally pulls latest code from git
#   2. Builds fresh Docker images (or skips with --fast)
#   3. Restarts all containers via docker compose
#   4. Waits for health checks then reports status
#   5. Starts Caddy only for a fresh deployment; routine updates leave it running
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
FRESH_DEPLOY=false
BUILD_BACKEND=false
BUILD_FRONTEND=false
EC2_HOST=""
EC2_USER="${EC2_USER:-ubuntu}"
EC2_SSH_KEY="${EC2_SSH_KEY:-${HOME}/.ssh/ec2-key.pem}"
EC2_DIR="${EC2_DIR:-codechest/Embeddify}"
REMAINING_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull)              DO_PULL=false;        REMAINING_ARGS+=("$1"); shift ;;
    --fast)                 DO_BUILD=false;       REMAINING_ARGS+=("$1"); shift ;;
    --build-backend)        BUILD_BACKEND=true; DO_BUILD=false; REMAINING_ARGS+=("$1"); shift ;;
    --build-frontend)       BUILD_FRONTEND=true; DO_BUILD=false; REMAINING_ARGS+=("$1"); shift ;;
    --fresh)                FRESH_DEPLOY=true;  REMAINING_ARGS+=("$1"); shift ;;
    --ec2)                  EC2_HOST="$2"; shift 2 ;;
    --ec2-user)             EC2_USER="$2";  shift 2 ;;
    --ec2-key)              EC2_SSH_KEY="$2"; shift 2 ;;
    --ec2-dir)              EC2_DIR="$2";   shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--no-pull] [--fast] [--build-backend] [--build-frontend] [--fresh]"
      echo "       $0 --ec2 HOST [--ec2-user USER] [--ec2-key PATH] [--ec2-dir DIR] [options]"
      exit 0
      ;;
    *)                      REMAINING_ARGS+=("$1"); shift ;;
  esac
done

# ── If --ec2 was given, forward the deploy to the EC2 host via SSH ──────────
if [ -n "$EC2_HOST" ]; then
  echo ""
  echo "============================================"
  echo "  🚀  Embeddify — Remote Deploy to EC2"
  echo "  Host: ${EC2_HOST}"
  echo "  User: ${EC2_USER}"
  echo "  Key:  ${EC2_SSH_KEY}"
  echo "  Dir:  ${EC2_DIR}"
  echo "============================================"
  echo ""

  # Validate SSH key exists
  if [ ! -f "$EC2_SSH_KEY" ]; then
    log_error "SSH key not found: ${EC2_SSH_KEY}"
    log_info "Provide one via --ec2-key PATH or EC2_SSH_KEY env var."
    exit 1
  fi

  # Build the remote command — re-invoke deploy.sh on the EC2 host
  REMOTE_CMD="cd \"${EC2_DIR}\" && ./deploy.sh ${REMAINING_ARGS[*]}"

  log_info "Connecting to ${EC2_HOST} via SSH..."

  # shellcheck disable=SC2029
  ssh -i "$EC2_SSH_KEY" \
      -o StrictHostKeyChecking=accept-new \
      -o ConnectTimeout=10 \
      -t \
      "${EC2_USER}@${EC2_HOST}" \
      "set -e; ${REMOTE_CMD}"

  SSH_EXIT=$?
  if [ $SSH_EXIT -eq 0 ]; then
    log_ok "Remote deploy completed successfully."
  else
    log_error "Remote deploy failed (exit code ${SSH_EXIT})."
  fi
  exit $SSH_EXIT
fi

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

# ── 4. Start application services ─────────────────────────────────────────
log_info "Starting application services..."
${COMPOSE_CMD} up -d postgres redis backend frontend
log_ok "Application services started."

# Caddy is intentionally excluded from routine updates. Its ACME state lives
# in named volumes, and leaving the container running avoids unnecessary TLS
# checks or certificate requests during application deployments.
if [ "$FRESH_DEPLOY" = true ]; then
  log_info "Starting Caddy for fresh TLS provisioning..."
  ${COMPOSE_CMD} up -d caddy
  log_ok "Caddy started; certificates will be provisioned if needed."
else
  log_info "Leaving Caddy unchanged. Use --fresh only on a new host."
fi

# ── 5. Wait for health checks & report status ─────────────────────────────
echo ""
log_info "Waiting for services to become healthy..."
sleep 5

# Check each container
CONTAINERS=("embeddify-postgres" "embeddify-redis" "embeddify-backend" "embeddify-frontend")

for container in "${CONTAINERS[@]}"; do
  max_retries=30  # ~150 seconds total (backend can be slow to load PyTorch)
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
    elif [ "$health" != "healthy" ] && [ "$health" != "running" ]; then
      log_warn "${container} — running but health is '${health}' (waiting...)"
    fi

    sleep 5
    count=$((count + 1))
  done

  if [ $count -eq $max_retries ]; then
    log_warn "${container} — did not become healthy within timeout."
    log_info "Check logs: docker logs ${container} --tail 30"
  fi
done

# ── 6. Summary ──────────────────────────────────────────────────────────────
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
