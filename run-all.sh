#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

POSTGRES_CONTAINER_NAME="cvmatcher-postgres"
POSTGRES_IMAGE="postgres:16"
POSTGRES_DB="cvmatcher"
POSTGRES_USER="user"
POSTGRES_PASSWORD="password"
POSTGRES_PORT="5432"

BACKEND_PORT="8000"
FRONTEND_PORT="3000"

BACKEND_PID=""
FRONTEND_PID=""

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

cleanup() {
  echo
  echo "Shutting down services..."

  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
    kill "${FRONTEND_PID}" >/dev/null 2>&1 || true
  fi

  wait >/dev/null 2>&1 || true
  echo "Stopped backend and frontend."
  echo "Postgres container '${POSTGRES_CONTAINER_NAME}' remains running."
}

trap cleanup EXIT INT TERM

if ! command_exists docker; then
  echo "Error: docker is required but not found in PATH."
  exit 1
fi

if ! command_exists uvicorn; then
  echo "Error: uvicorn is required but not found in PATH."
  echo "Install backend dependencies first:"
  echo "  cd backend && pip install -r requirements.txt"
  exit 1
fi

if ! command_exists npm; then
  echo "Error: npm is required but not found in PATH."
  exit 1
fi

echo "Ensuring Postgres container is running..."
if docker ps --format '{{.Names}}' | grep -Fxq "${POSTGRES_CONTAINER_NAME}"; then
  echo "Postgres container '${POSTGRES_CONTAINER_NAME}' is already running."
elif docker ps -a --format '{{.Names}}' | grep -Fxq "${POSTGRES_CONTAINER_NAME}"; then
  docker start "${POSTGRES_CONTAINER_NAME}" >/dev/null
  echo "Started existing Postgres container '${POSTGRES_CONTAINER_NAME}'."
else
  docker run -d \
    --name "${POSTGRES_CONTAINER_NAME}" \
    -p "${POSTGRES_PORT}:5432" \
    -e "POSTGRES_USER=${POSTGRES_USER}" \
    -e "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
    -e "POSTGRES_DB=${POSTGRES_DB}" \
    "${POSTGRES_IMAGE}" >/dev/null
  echo "Created and started Postgres container '${POSTGRES_CONTAINER_NAME}'."
fi

echo "Starting backend on http://localhost:${BACKEND_PORT} ..."
(
  cd "${ROOT_DIR}"
  uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port "${BACKEND_PORT}" --reload
) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:${FRONTEND_PORT} ..."
(
  cd "${ROOT_DIR}/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo
echo "All services started."
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Press Ctrl+C to stop backend and frontend."
echo

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"

# If one process exits, script exits and cleanup trap runs.
