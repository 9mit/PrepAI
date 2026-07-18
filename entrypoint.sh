#!/bin/bash
set -e

export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export FRONTEND_URL="${FRONTEND_URL:-}"
export TRUST_PROXY="${TRUST_PROXY:-true}"
export DISABLE_DOCS="${DISABLE_DOCS:-true}"
# Generate durable JWT secret if not provided (persists for container lifetime)
if [ -z "${PREPAI_JWT_SECRET:-}" ]; then
  export PREPAI_JWT_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  echo "[prepai] Generated ephemeral PREPAI_JWT_SECRET for this container"
fi

echo "[prepai] Starting Redis..."
redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --save "" --appendonly no

echo "[prepai] Waiting for Redis..."
for i in $(seq 1 30); do
  if redis-cli ping 2>/dev/null | grep -q PONG; then
    break
  fi
  sleep 0.2
done

echo "[prepai] Starting FastAPI (uvicorn)..."
cd /app/backend
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1 &
UVICORN_PID=$!

echo "[prepai] Waiting for API health..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

echo "[prepai] Starting nginx on :7860..."
nginx -g "daemon off;" &
NGINX_PID=$!

cleanup() {
  echo "[prepai] Shutting down..."
  kill "$NGINX_PID" "$UVICORN_PID" 2>/dev/null || true
  redis-cli shutdown nosave 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Keep container alive while either process runs
while kill -0 "$NGINX_PID" 2>/dev/null && kill -0 "$UVICORN_PID" 2>/dev/null; do
  sleep 2
done

echo "[prepai] A dependent process exited"
exit 1
