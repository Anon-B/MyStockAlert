#!/bin/sh
set -eu
API=${API_URL:-http://localhost:8000}
WEB=${WEB_URL:-http://localhost:3000}
SYMBOL="E2E$(date +%s)"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

# Local/internal E2E uses the bootstrap demo account unless explicitly overridden.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
E2E_USERNAME=${E2E_USERNAME:-demo}
E2E_PASSWORD=${E2E_PASSWORD:-${APP_BOOTSTRAP_PASSWORD:-}}
if [ -z "$E2E_PASSWORD" ]; then
  echo "E2E_PASSWORD or APP_BOOTSTRAP_PASSWORD is required" >&2
  exit 2
fi

curl -fsS "$API/api/v1/health" >/dev/null
curl -fsS "$WEB" >/dev/null
curl -fsS -c "$COOKIE_JAR" -X POST "$API/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$E2E_USERNAME\",\"password\":\"$E2E_PASSWORD\"}" >/dev/null
PORT=$(curl -fsS -b "$COOKIE_JAR" -X POST "$API/api/v1/portfolio" -H 'Content-Type: application/json' -d "{\"market\":\"TH\",\"symbol\":\"$SYMBOL\",\"quantity\":1,\"average_cost\":100,\"currency\":\"THB\"}")
PORT_ID=$(printf '%s' "$PORT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
WATCH=$(curl -fsS -b "$COOKIE_JAR" -X POST "$API/api/v1/watchlist" -H 'Content-Type: application/json' -d "{\"market\":\"TH\",\"symbol\":\"$SYMBOL\",\"upper_percent\":5,\"lower_percent\":-5}")
WATCH_ID=$(printf '%s' "$WATCH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
curl -fsS -b "$COOKIE_JAR" -X POST "$API/api/v1/alerts/evaluate" >/dev/null
curl -fsS -b "$COOKIE_JAR" -X DELETE "$API/api/v1/portfolio/$PORT_ID" >/dev/null
curl -fsS -b "$COOKIE_JAR" -X DELETE "$API/api/v1/watchlist/$WATCH_ID" >/dev/null
printf 'e2e smoke tests passed symbol=%s\n' "$SYMBOL"
