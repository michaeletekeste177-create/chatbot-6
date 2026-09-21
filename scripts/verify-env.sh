#!/usr/bin/env bash
# verify-env.sh — sanity-check local dev architecture for Hibretfamily
# Usage: bash scripts/verify-env.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  local min_hint="$3"

  if command -v "$cmd" >/dev/null 2>&1; then
    local version
    version=$("$cmd" --version 2>&1 | head -n 1)
    echo -e "${GREEN}✔${NC} ${name} found: ${version}"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✘${NC} ${name} not found on PATH. ${min_hint}"
    FAIL=$((FAIL+1))
  fi
}

echo "== Hibretfamily local environment check =="
echo ""

check "Node.js" "node" "Install Node 18+ from https://nodejs.org"
check "NPM"     "npm"  "Ships with Node.js — reinstall Node if missing."

# Python: prefer python3, fall back to python
if command -v python3 >/dev/null 2>&1; then
  check "Python" "python3" "Install Python 3.10+ from https://python.org"
elif command -v python >/dev/null 2>&1; then
  check "Python" "python" "Install Python 3.10+ from https://python.org"
else
  echo -e "${RED}✘${NC} Python not found on PATH (checked python3 and python)."
  FAIL=$((FAIL+1))
fi

echo ""

# Extra checks that matter for this stack specifically
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
  if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${YELLOW}⚠${NC}  Node ${NODE_MAJOR} detected — Supabase JS v2 and modern Express want Node 18+."
  fi
fi

if [ -f "server/.env" ]; then
  echo -e "${GREEN}✔${NC} server/.env present"
else
  echo -e "${YELLOW}⚠${NC}  server/.env missing — copy server/.env.example and fill in your keys."
fi

echo ""
echo "== Summary: ${PASS} passed, ${FAIL} failed =="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
