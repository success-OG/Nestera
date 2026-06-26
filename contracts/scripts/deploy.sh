#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

require_command cargo

network=${NETWORK:-testnet}

ensure_dir "$ARTIFACT_ROOT"
ensure_dir "$DEPLOYMENT_ROOT/$network"

log "Building contract WASM"
cargo build --manifest-path "$CONTRACTS_ROOT/Cargo.toml" --target wasm32-unknown-unknown --release

wasm_path=$(find "$CONTRACTS_ROOT/target/wasm32-unknown-unknown/release" -maxdepth 1 -name '*.wasm' -type f | sort | tail -n 1)
if [[ -z "${wasm_path:-}" ]]; then
  printf 'Unable to locate built WASM artifact.\n' >&2
  exit 1
fi

"$SCRIPT_DIR/flatten-source.sh"

flattened_source="$ARTIFACT_ROOT/flattened-contract.rs"
wasm_hash=$(sha256sum "$wasm_path" | awk '{print $1}')
source_hash=$(sha256sum "$flattened_source" | awk '{print $1}')
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

manifest_dir="$DEPLOYMENT_ROOT/$network"
manifest_path="$manifest_dir/$timestamp.json"

cat > "$manifest_path" <<EOF
{
  "network": "$network",
  "contract_id": "${CONTRACT_ID:-}",
  "wasm_path": "$wasm_path",
  "wasm_sha256": "$wasm_hash",
  "source_bundle": "$flattened_source",
  "source_sha256": "$source_hash",
  "created_at": "$timestamp"
}
EOF

log "Deployment manifest written to $manifest_path"

if [[ -n "${DEPLOY_COMMAND:-}" ]]; then
  log "DEPLOY_COMMAND is set; run it with the generated WASM path if you want to push on-chain"
  log "$DEPLOY_COMMAND \"$wasm_path\""
else
  log "No DEPLOY_COMMAND supplied; skipping on-chain deployment step"
fi