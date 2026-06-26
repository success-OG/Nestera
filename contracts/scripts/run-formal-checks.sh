#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/common.sh"

REPORT_DIR="$CONTRACTS_ROOT/docs/generated"
ensure_dir "$REPORT_DIR"

report_file="$REPORT_DIR/verification-report.md"

echo "# Verification Test Report" > "$report_file"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$report_file"
echo "" >> "$report_file"

log "Running contract unit tests (focused on invariants and critical flows)"

if cargo test --manifest-path "$CONTRACTS_ROOT/Cargo.toml" --lib -- --nocapture; then
  echo "All tests passed." >> "$report_file"
  log "Unit tests passed; report written to $report_file"
else
  echo "Some tests failed — inspect cargo test output above." >> "$report_file"
  log "Unit tests failed; report written to $report_file"
  exit 1
fi
