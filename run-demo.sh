#!/usr/bin/env bash
# ======================================================================
#  FoodFix (LasangPinoy) - Automated Setup & Technical Demo Launcher
# ======================================================================

set -u

if [ -t 1 ]; then
    BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'
    YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
    BOLD=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

err()  { printf "%s[ERROR]%s %s\n" "$RED" "$RESET" "$*" >&2; }
ok()   { printf "        %sOK%s  %s\n" "$GREEN" "$RESET" "$*"; }
step() { printf "\n%s[%s/5]%s %s\n" "$BOLD$CYAN" "$1" "$RESET" "$2"; }

REPO_URL="https://github.com/Jesalyn-byte/FoodFix.git"
START_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$START_DIR"

printf "%s======================================================================%s\n" "$BOLD" "$RESET"
printf "%s  FOODFIX (LasangPinoy) - Automated Setup & Technical Demo Launcher%s\n" "$BOLD" "$RESET"
printf "%s======================================================================%s\n" "$BOLD" "$RESET"

# ---------- Step 1: Node.js ----------
step 1 "Checking for Node.js..."
if ! command -v node >/dev/null 2>&1; then
    err "Node.js is not installed or not on PATH."
    printf "Install LTS from: https://nodejs.org/en/download\n"
    exit 1
fi
ok "Node.js $(node --version)"

# ---------- Step 2: Git ----------
step 2 "Checking for Git..."
if command -v git >/dev/null 2>&1; then
    ok "$(git --version)"
else
    printf "        %s[WARN]%s Git not found; will check for local folder or ZIP.\n" "$YELLOW" "$RESET"
fi

# ---------- Step 3: Unpack ZIP / Clone / Resolve Path ----------
step 3 "Resolving project files and directory path..."
PROJECT_DIR=""

if [ -f "$START_DIR/package.json" ]; then
    PROJECT_DIR="$START_DIR"
else
    for d in "FoodFix" "FoodFix-main" "FoodFix-main/FoodFix-main" "PUPLasangpinoy" "PUPLasangpinoy-main"; do
        if [ -f "$START_DIR/$d/package.json" ]; then
            PROJECT_DIR="$START_DIR/$d"
            break
        fi
    done
fi

if [ -z "$PROJECT_DIR" ]; then
    FOUND_ZIP="$(ls -1 "$START_DIR"/FoodFix*.zip "$START_DIR"/PUPLasangpinoy*.zip "$HOME/Downloads"/FoodFix*.zip 2>/dev/null | head -n 1 || true)"
    if [ -n "$FOUND_ZIP" ] && command -v unzip >/dev/null 2>&1; then
        printf "        Unpacking %s...\n" "$FOUND_ZIP"
        mkdir -p "$START_DIR/FoodFix_Unpacked"
        unzip -q -o "$FOUND_ZIP" -d "$START_DIR/FoodFix_Unpacked"
        FOUND_PKG="$(find "$START_DIR/FoodFix_Unpacked" -name "package.json" -maxdepth 3 | head -n 1 || true)"
        if [ -n "$FOUND_PKG" ]; then
            PROJECT_DIR="$(dirname "$FOUND_PKG")"
        fi
    fi
fi

if [ -z "$PROJECT_DIR" ]; then
    if ! command -v git >/dev/null 2>&1; then
        err "Neither an existing project folder/ZIP nor Git was found."
        exit 1
    fi
    printf "        Cloning repository from %s...\n" "$REPO_URL"
    git clone "$REPO_URL" "$START_DIR/FoodFix" || exit 1
    PROJECT_DIR="$START_DIR/FoodFix"
fi

cd "$PROJECT_DIR"
ok "Directed to Project Path: $(pwd)"

# ---------- Step 4: Configure .env ----------
step 4 "Configuring .env environment variables..."
ENV_SOURCE=""
if [ -f "$PROJECT_DIR/.env" ]; then
    ENV_SOURCE="$PROJECT_DIR/.env"
else
    for f in \
        "$START_DIR/.env.demo" \
        "$START_DIR/.env.demo.txt" \
        "$START_DIR/.env" \
        "$START_DIR/env.demo" \
        "$HOME/Desktop/.env.demo" \
        "$HOME/Downloads/.env.demo"; do
        if [ -f "$f" ]; then
            ENV_SOURCE="$f"
            break
        fi
    done
fi

if [ -n "$ENV_SOURCE" ]; then
    if [ "$ENV_SOURCE" != "$PROJECT_DIR/.env" ]; then
        cp "$ENV_SOURCE" "$PROJECT_DIR/.env"
        ok "Copied $ENV_SOURCE -> $PROJECT_DIR/.env"
    else
        ok "Active .env verified at $PROJECT_DIR/.env"
    fi
elif [ -f "$PROJECT_DIR/.env.example" ]; then
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    printf "        %s[WARN]%s Created .env from .env.example. Please populate API keys in %s/.env\n" "$YELLOW" "$RESET" "$PROJECT_DIR"
fi

# ---------- Step 5: Install Dependencies ----------
step 5 "Checking project dependencies..."
if [ -f "$PROJECT_DIR/node_modules/expo/package.json" ]; then
    ok "node_modules already installed"
else
    printf "        Installing npm packages (5-15 minutes)...\n"
    if ! npm install; then
        npm install --legacy-peer-deps || exit 1
    fi
    ok "Dependencies installed"
fi

# ---------- Step 6: Interactive Menu ----------
while true; do
    cat <<EOF

======================================================================
  FOODFIX READY - TECHNICAL DEMO & DEBUGGING MENU
  Active Path: $(pwd)
======================================================================
  [1] Start Local Expo Server (Web + Mobile QR Code for Android/iOS)
  [2] Start Local Web Server Only (Opens http://localhost:8081)
  [3] Launch Lamion AI Live Technical Debugger (Terminal Chat & Guardrails)
  [1] Launch Production Web Dashboard (Fast http://localhost:3000 - Instant Load)
  [2] Start Expo Metro Dev Server (Web + Mobile QR Code http://localhost:8081)
  [3] Launch Lamion AI Live Technical Debugger (CLI Chat & Guardrails)
  [4] Populate / Reset Live Defense Data (Orders #1041-#1045, GCash, Chat)
  [5] Run Automated Test Suite (117 Unit Tests: Lamion AI + Guardrails + DB)
  [6] Run TypeScript Compiler Verification (npx tsc --noEmit)
  [0] Exit
======================================================================
EOF
    read -r -p "Select an option [1-6, or 0 to exit] (default=1): " CHOICE
    CHOICE="${CHOICE:-1}"
    case "$CHOICE" in
        1) npx serve dist -l 3000 ;;
        2) npx expo start -c ;;
        3) node scripts/debug-lamion-demo.js ;;
        4) node scripts/seed-defense-data.js ;;
        5) npm test ;;
        6) npx tsc --noEmit && ok "0 TypeScript errors!" ;;
        0) exit 0 ;;
    esac
done
