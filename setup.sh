#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo "  FOODFIX (LasangPinoy) - One-Time Dependency & Environment Setup"
echo "  Installing into: $SCRIPT_DIR"
echo "======================================================================"
echo

echo "[1/5] Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is required. Install LTS from https://nodejs.org/" >&2
  exit 1
fi
echo "      OK  Node.js $(node --version)"

echo "[2/5] Checking environment configuration (.env)..."
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  if [ -f "$SCRIPT_DIR/.env.demo" ]; then
    cp "$SCRIPT_DIR/.env.demo" "$SCRIPT_DIR/.env"
    echo "      Created .env from .env.demo"
  elif [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "      [WARN] Created .env from .env.example - please fill in API keys."
  fi
else
  echo "      OK  Active .env verified at $SCRIPT_DIR/.env"
fi

echo "[3/5] Installing root dependencies into $SCRIPT_DIR/node_modules..."
if ! npm install; then
  echo "      [WARN] Retrying with --legacy-peer-deps..."
  npm install --legacy-peer-deps
fi
echo "      OK  Root node_modules installed."

echo "[4/5] Installing React Web Dashboard dependencies into $SCRIPT_DIR/web/node_modules..."
if [ -f "$SCRIPT_DIR/web/package.json" ]; then
  npm --prefix web install
  echo "      OK  Web node_modules installed."
fi

echo "[5/5] Building FoodFix Web Dashboard into $SCRIPT_DIR/dist..."
npm run build:pwa

echo
echo "======================================================================"
echo "  SETUP COMPLETE!"
echo "  All dependencies installed in: $SCRIPT_DIR"
echo "  Next step: Run 'bash start-localhost.sh' to start http://localhost:3000"
echo "======================================================================"
