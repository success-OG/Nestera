#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

network=${NETWORK:-testnet}

latest=$(latest_manifest "$network" || true)
if [[ -z "${latest:-}" ]]; then
  printf 'No deployment manifest found for network %s.\n' "$network" >&2
  exit 1
fi

log "Using deployment manifest $latest"

if [[ ! -f "$ARTIFACT_ROOT/flattened-contract.rs" ]]; then
  "$SCRIPT_DIR/flatten-source.sh"
fi

current_source_hash=$(sha256sum "$ARTIFACT_ROOT/flattened-contract.rs" | awk '{print $1}')
manifest_source_hash=$(grep -o '"source_sha256": "[^"]*"' "$latest" | head -n 1 | cut -d '"' -f 4)
manifest_wasm_hash=$(grep -o '"wasm_sha256": "[^"]*"' "$latest" | head -n 1 | cut -d '"' -f 4)
manifest_wasm_path=$(grep -o '"wasm_path": "[^"]*"' "$latest" | head -n 1 | cut -d '"' -f 4)

if [[ "$current_source_hash" != "$manifest_source_hash" ]]; then
  printf 'Source hash mismatch: %s != %s\n' "$current_source_hash" "$manifest_source_hash" >&2
  exit 1
fi

if [[ -f "$manifest_wasm_path" ]]; then
  current_wasm_hash=$(sha256sum "$manifest_wasm_path" | awk '{print $1}')
  if [[ "$current_wasm_hash" != "$manifest_wasm_hash" ]]; then
    printf 'WASM hash mismatch: %s != %s\n' "$current_wasm_hash" "$manifest_wasm_hash" >&2
    exit 1
  fi
else
  log "WASM artifact recorded in the manifest is not present locally; skipping file hash comparison"
fi

log "Verification passed"