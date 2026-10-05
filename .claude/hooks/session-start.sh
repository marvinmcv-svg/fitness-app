#!/bin/bash
# Cloud sessions only: install deps so tests run and the app can be built
# into the side-panel preview (npm run build:artifact).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
