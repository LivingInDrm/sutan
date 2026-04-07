#!/bin/bash
# Sutan — one-shot launcher for all services
# Usage: ./start-all.sh  or  npm run start:all

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSET_MANAGER_DIR="$ROOT_DIR/tools/asset-manager"

GAME_PORT=5173
ASSET_BACKEND_PORT=8100
ASSET_FRONTEND_PORT=8101
LADLE_PORT=61000

# ── Install asset-manager backend deps (fast, idempotent) ────────────────────
echo "[asset-manager] Installing Python dependencies..."
pip install -q -r "$ASSET_MANAGER_DIR/backend/requirements.txt"

# ── Install asset-manager frontend deps ──────────────────────────────────────
echo "[asset-manager] Installing frontend npm dependencies..."
cd "$ASSET_MANAGER_DIR/frontend" && npm install --silent && cd "$ROOT_DIR"

# ── Start Game (Vite dev server) ─────────────────────────────────────────────
echo "[game] Starting Vite dev server on port $GAME_PORT..."
cd "$ROOT_DIR"
npm run dev &
GAME_PID=$!

# ── Start Asset Manager backend ───────────────────────────────────────────────
echo "[asset-manager] Starting FastAPI backend on port $ASSET_BACKEND_PORT..."
cd "$ASSET_MANAGER_DIR/backend"
uvicorn main:app --host 0.0.0.0 --port "$ASSET_BACKEND_PORT" --reload &
ASSET_BACKEND_PID=$!

# ── Start Asset Manager frontend ──────────────────────────────────────────────
echo "[asset-manager] Starting Vite frontend on port $ASSET_FRONTEND_PORT..."
cd "$ASSET_MANAGER_DIR/frontend"
npm run dev -- --port "$ASSET_FRONTEND_PORT" &
ASSET_FRONTEND_PID=$!

# ── Start Ladle ───────────────────────────────────────────────────────────────
echo "[ladle] Starting Ladle component explorer on port $LADLE_PORT..."
cd "$ROOT_DIR"
npm run ladle &
LADLE_PID=$!

echo ""
echo "════════════════════════════════════════════════════"
echo "  Sutan — All services running"
echo ""
echo "  Game            : http://localhost:$GAME_PORT"
echo "  Asset Manager   : http://localhost:$ASSET_FRONTEND_PORT"
echo "  Asset API       : http://localhost:$ASSET_BACKEND_PORT"
echo "  Ladle           : http://localhost:$LADLE_PORT"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "════════════════════════════════════════════════════"

# ── Graceful shutdown ──────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "[shutdown] Stopping all services..."
  kill "$GAME_PID" 2>/dev/null || true
  kill "$ASSET_BACKEND_PID" 2>/dev/null || true
  kill "$ASSET_FRONTEND_PID" 2>/dev/null || true
  kill "$LADLE_PID" 2>/dev/null || true
  wait "$GAME_PID" "$ASSET_BACKEND_PID" "$ASSET_FRONTEND_PID" "$LADLE_PID" 2>/dev/null || true
  echo "[shutdown] Done."
}

trap cleanup EXIT INT TERM

wait
