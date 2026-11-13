#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js was not found. Please run 'bash setup.sh' first." >&2
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/dist/index.html" ]; then
  echo "Production build not found in dist/. Building Web Dashboard now..."
  if [ ! -d "$SCRIPT_DIR/web/node_modules" ]; then
    npm --prefix web install
  fi
  npm run build:pwa
fi

export PORT="${PORT:-3000}"

echo "======================================================================"
echo "  FOODFIX WEB DASHBOARD - LOCALHOST SERVER"
echo "  Directory : $SCRIPT_DIR"
echo "  URL       : http://localhost:$PORT"
echo "  Press Ctrl+C to stop the server."
echo "======================================================================"

if command -v open >/dev/null 2>&1; then
  (sleep 1 && open "http://localhost:$PORT") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:$PORT") &
fi

exec node "$SCRIPT_DIR/scripts/serve-web.js"
