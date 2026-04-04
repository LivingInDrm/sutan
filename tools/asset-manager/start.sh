#!/bin/bash
# Sutan Asset Manager — one-shot launcher
# Usage: OPENAI_API_KEY=sk-xxx ./tools/asset-manager/start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

BACKEND_PORT=8100
FRONTEND_PORT=8101

# ── API key check ─────────────────────────────────────────────────────────────
if [ -z "$OPENAI_API_KEY" ]; then
  echo "[WARN] OPENAI_API_KEY is not set. Image generation will fail."
  echo "       Set it before starting: OPENAI_API_KEY=sk-xxx ./start.sh"
fi

# ── Install backend dependencies ─────────────────────────────────────────────
echo "[backend] Installing Python dependencies..."
pip install -q -r "$BACKEND_DIR/requirements.txt"

# ── Install frontend dependencies ────────────────────────────────────────────
echo "[frontend] Installing npm dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

# ── Start backend ─────────────────────────────────────────────────────────────
echo "[backend] Starting FastAPI on port $BACKEND_PORT..."
cd "$BACKEND_DIR"
OPENAI_API_KEY="$OPENAI_API_KEY" uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

# ── Start frontend ────────────────────────────────────────────────────────────
echo "[frontend] Starting Vite dev server on port $FRONTEND_PORT..."
cd "$FRONTEND_DIR"
npm run dev -- --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

echo ""
echo "════════════════════════════════════════════"
echo "  Sutan Asset Manager is running"
echo "  Backend API : http://localhost:$BACKEND_PORT"
echo "  Frontend UI : http://localhost:$FRONTEND_PORT"
echo "  Press Ctrl+C to stop both services"
echo "════════════════════════════════════════════"

# ── Graceful shutdown ─────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "[shutdown] Stopping services..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "[shutdown] Done."
}

trap cleanup EXIT INT TERM

wait
