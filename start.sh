#!/bin/bash

# ============================================
#  AeroMRO Pro - AI Aerospace MRO Platform
#  Startup Script
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        ✈  AeroMRO Pro - Startup Script       ║${NC}"
echo -e "${CYAN}║     AI-Powered Aerospace MRO Platform        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- Load environment ----
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
  echo -e "${RED}✗ .env file not found! Please create one.${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}

# ---- Kill processes on used ports ----
echo -e "${YELLOW}→ Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"

kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}  Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

echo -e "${GREEN}✓ Ports cleared${NC}"

# ---- Check PostgreSQL ----
echo -e "${YELLOW}→ Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}✗ PostgreSQL not found. Please install it.${NC}"
  exit 1
fi

# Try to connect
if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &>/dev/null; then
  echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo -e "${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
    exit 1
  }
  sleep 2
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# ---- Install backend dependencies ----
echo -e "${YELLOW}→ Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# ---- Seed database ----
echo -e "${YELLOW}→ Seeding database...${NC}"
node seed.js
echo -e "${GREEN}✓ Database seeded successfully${NC}"

# ---- Install frontend dependencies ----
echo -e "${YELLOW}→ Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# ---- Start backend with auto-reload ----
echo -e "${YELLOW}→ Starting backend on port ${BACKEND_PORT}...${NC}"
cd "$SCRIPT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID) with auto-reload${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}→ Waiting for backend...${NC}"
for i in {1..30}; do
  if curl -s "http://localhost:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is ready${NC}"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
  fi
done

# ---- Start frontend with auto-reload ----
echo -e "${YELLOW}→ Starting frontend on port ${FRONTEND_PORT}...${NC}"
cd "$SCRIPT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID) with auto-reload${NC}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          🚀 AeroMRO Pro is Running!          ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  Frontend:  ${GREEN}http://localhost:${FRONTEND_PORT}${CYAN}            ║${NC}"
echo -e "${CYAN}║  Backend:   ${GREEN}http://localhost:${BACKEND_PORT}${CYAN}            ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  Login:     admin@aeromro.com / password123  ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  Auto-reload is enabled for both servers.    ║${NC}"
echo -e "${CYAN}║  Press Ctrl+C to stop all services.          ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- Cleanup on exit ----
cleanup() {
  echo ""
  echo -e "${YELLOW}→ Shutting down AeroMRO Pro...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  kill_port $BACKEND_PORT
  kill_port $FRONTEND_PORT
  echo -e "${GREEN}✓ All services stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
