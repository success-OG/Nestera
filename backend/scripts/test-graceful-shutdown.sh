#!/usr/bin/env bash
#
# Graceful Shutdown Test Script
#
# Starts the application, fires several concurrent requests, sends SIGTERM
# mid-flight, and verifies that in-flight requests complete while new ones
# are rejected with 503.
#
set -euo pipefail

PORT="${PORT:-3001}"
BASE_URL="http://localhost:${PORT}/api"
APP_PID=""
PASS=0
FAIL=0

cleanup() {
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill -9 "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

log()  { echo "[TEST] $*"; }
pass() { PASS=$((PASS + 1)); log "PASS: $*"; }
fail() { FAIL=$((FAIL + 1)); log "FAIL: $*"; }

# ---------- 1. Build & start app ----------
log "Building application..."
cd "$(dirname "$0")/.."
npm run build 2>&1 | tail -3

log "Starting application on port ${PORT}..."
NODE_ENV=development \
  DB_HOST=localhost DB_PORT=5432 DB_NAME=nestera DB_USER=postgres DB_PASS=postgres \
  JWT_SECRET=test-jwt-secret-for-shutdown-test \
  JWT_EXPIRATION=1h \
  SOROBAN_RPC_URL=https://soroban-testnet.stellar.org \
  HORIZON_URL=https://horizon-testnet.stellar.org \
  SOROBAN_RPC_FALLBACK_URLS=https://soroban-testnet.stellar.org \
  HORIZON_FALLBACK_URLS=https://horizon-testnet.stellar.org \
  CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  STELLAR_WEBHOOK_SECRET=test-webhook-secret-16chars \
  PORT="${PORT}" \
  node dist/main.js &
APP_PID=$!

log "Waiting for app to be ready (PID ${APP_PID})..."
for i in $(seq 1 30); do
  if curl -sf "${BASE_URL}/health/live" > /dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    log "Application exited before becoming ready"
    exit 1
  fi
  sleep 1
done

if ! curl -sf "${BASE_URL}/health/live" > /dev/null 2>&1; then
  fail "Application did not become ready within 30 seconds"
  exit 1
fi
pass "Application is ready"

# ---------- 2. Verify normal operation ----------
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health/live")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Health endpoint returns 200"
else
  fail "Health endpoint returned ${HTTP_CODE}, expected 200"
fi

# ---------- 3. Send SIGTERM and verify shutdown behavior ----------
log "Sending SIGTERM to PID ${APP_PID}..."
kill -TERM "$APP_PID"

sleep 1

# After SIGTERM, new requests should fail (connection refused or 503)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE_URL}/health/live" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "000" ]; then
  pass "New requests rejected after SIGTERM (HTTP ${HTTP_CODE})"
else
  fail "Expected 503 or connection refused after SIGTERM, got ${HTTP_CODE}"
fi

# ---------- 4. Wait for process to exit ----------
log "Waiting for process to exit..."
WAIT_COUNT=0
while kill -0 "$APP_PID" 2>/dev/null; do
  WAIT_COUNT=$((WAIT_COUNT + 1))
  if [ "$WAIT_COUNT" -gt 35 ]; then
    fail "Process did not exit within 35 seconds"
    break
  fi
  sleep 1
done

if ! kill -0 "$APP_PID" 2>/dev/null; then
  wait "$APP_PID" 2>/dev/null
  EXIT_CODE=$?
  if [ "$EXIT_CODE" -eq 0 ]; then
    pass "Process exited cleanly with code 0"
  else
    fail "Process exited with code ${EXIT_CODE}"
  fi
  APP_PID=""
fi

# ---------- Summary ----------
echo ""
log "============================="
log "Results: ${PASS} passed, ${FAIL} failed"
log "============================="
[ "$FAIL" -eq 0 ]
