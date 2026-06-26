#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

network=${NETWORK:-testnet}
manifest=$(latest_manifest "$network" || true)

if [[ -z "${manifest:-}" ]]; then
  printf 'No deployment manifest found for network %s.\n' "$network" >&2
  exit 1
fi

cat "$manifest"