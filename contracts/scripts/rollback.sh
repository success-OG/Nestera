#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

network=${NETWORK:-testnet}
rollback_manifest=${ROLLBACK_MANIFEST:-}

if [[ -z "$rollback_manifest" ]]; then
  rollback_manifest=$(latest_manifest "$network" || true)
fi

if [[ -z "${rollback_manifest:-}" || ! -f "$rollback_manifest" ]]; then
  printf 'Rollback manifest not found. Set ROLLBACK_MANIFEST to a valid file.\n' >&2
  exit 1
fi

log "Rollback target manifest: $rollback_manifest"
log "Rollback is a redeploy of the recorded wasm/source bundle; no on-chain state is mutated here"
cat "$rollback_manifest"