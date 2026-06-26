#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

ensure_dir "$ARTIFACT_ROOT"

flattened_source="$ARTIFACT_ROOT/flattened-contract.rs"
source_manifest="$ARTIFACT_ROOT/source-manifest.txt"

log "Flattening Soroban sources"

{
  printf '// Generated source bundle for deployment verification.\n'
  printf '// Do not edit by hand.\n\n'

  while IFS= read -r source_file; do
    relative_path=${source_file#"$CONTRACTS_ROOT/"}
    printf '// ---- %s ----\n' "$relative_path"
    cat "$source_file"
    printf '\n\n'
  done < <(find "$CONTRACTS_ROOT/src" -type f -name '*.rs' | sort)
} > "$flattened_source"

find "$CONTRACTS_ROOT/src" -type f -name '*.rs' | sort | while IFS= read -r source_file; do
  sha256sum "$source_file"
done > "$source_manifest"

sha256sum "$flattened_source" | awk '{print $1}' > "$ARTIFACT_ROOT/flattened-contract.rs.sha256"

log "Flattened source written to $flattened_source"
log "Source manifest written to $source_manifest"