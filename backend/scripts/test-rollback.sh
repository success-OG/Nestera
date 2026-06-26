#!/usr/bin/env bash
set -euo pipefail

# Minimal rollback test script: run migrations then iteratively revert them
# Requires: working backend DB configured via env and typeorm CLI available (npx typeorm)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Building backend..."
pnpm --filter backend build

echo "Running migrations..."
(cd "$ROOT_DIR" && pnpm --filter backend exec -- npx typeorm migration:run) || { echo "Migration run failed"; exit 1; }

echo "Reverting migrations one-by-one (up to 50 attempts)"
for i in $(seq 1 50); do
  echo "Revert attempt #$i"
  if (cd "$ROOT_DIR" && pnpm --filter backend exec -- npx typeorm migration:revert); then
    echo "Reverted one migration"
  else
    echo "No more migrations to revert or revert failed"
    break
  fi
done

echo "Rollback test completed"
