#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

ensure_dir "$GENERATED_DOCS_DIR"

generated_docs="$GENERATED_DOCS_DIR/contract-documentation.md"

log "Generating contract documentation bundle"

cat <<EOF > "$generated_docs"
# Nestera Contract Documentation Bundle

Generated on: $(date -u +%Y-%m-%dT%H:%M:%SZ)

This bundle is assembled from the contract reference, operations guide, and formal verification report.

---

EOF

for doc_file in \
  "$CONTRACTS_ROOT/CONTRACT_REFERENCE.md" \
  "$CONTRACTS_ROOT/docs/CONTRACT_OPERATIONS.md" \
  "$CONTRACTS_ROOT/docs/FORMAL_VERIFICATION.md" \
  "$CONTRACTS_ROOT/docs/SOROBAN_STORAGE.md" \
  "$CONTRACTS_ROOT/docs/SECURITY.md" \
  "$CONTRACTS_ROOT/docs/TESTING.md"
do
  printf '## %s\n\n' "$(basename "$doc_file")" >> "$generated_docs"
  cat "$doc_file" >> "$generated_docs"
  printf '\n\n---\n\n' >> "$generated_docs"
done

log "Generated documentation written to $generated_docs"