#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if [[ ! -f .env ]]; then
  echo "Missing .env; copy .env.example and configure it." >&2
  exit 1
fi
set -a
source .env
set +a

export RUNTIME_PROJECT_NAME="AI Aerospace MRO"
export RUNTIME_AI_ENDPOINT="/api/ai/aerospace-maintenance-review"
export RUNTIME_AI_FEATURE="aerospace-maintenance-governance-review"
export RUNTIME_AI_SYSTEM_PROMPT="Review aerospace maintenance evidence conservatively, highlighting airworthiness, traceability, compliance, and human release authority."

if [[ ! -d backend/node_modules || ! -d frontend/node_modules ]]; then
  echo "Dependencies are missing; run ./scripts/bootstrap.sh explicitly." >&2
  exit 1
fi

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is occupied; refusing to terminate another process." >&2
    exit 1
  fi
done

(cd backend && PORT="$BACKEND_PORT" npm start) &
backend_pid=$!
(cd frontend && HOST=127.0.0.1 PORT="$FRONTEND_PORT" VITE_API_BASE="http://127.0.0.1:$BACKEND_PORT/api" npm start) &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
cleanup
set +e
wait "$backend_pid"; backend_status=$?
wait "$frontend_pid"; frontend_status=$?
set -e
if (( backend_status != 0 || frontend_status != 0 )); then
  echo "A child service exited unexpectedly (backend=$backend_status frontend=$frontend_status)." >&2
  exit 1
fi
