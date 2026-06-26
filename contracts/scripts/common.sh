#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CONTRACTS_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
ARTIFACT_ROOT="$CONTRACTS_ROOT/target/nestera-contract-ops"
DEPLOYMENT_ROOT="$ARTIFACT_ROOT/deployments"
GENERATED_DOCS_DIR="$CONTRACTS_ROOT/docs/generated"

log() {
  printf '[nestera-contracts] %s\n' "$*"
}

ensure_dir() {
  mkdir -p "$1"
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
}

latest_manifest() {
  local network="$1"
  local manifest_dir="$DEPLOYMENT_ROOT/$network"
  if [[ ! -d "$manifest_dir" ]]; then
    return 1
  fi
  find "$manifest_dir" -maxdepth 1 -name '*.json' -type f | sort | tail -n 1
}