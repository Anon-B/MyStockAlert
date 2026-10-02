#!/bin/sh
set -eu
API=${API_URL:-http://localhost:8000}
WEB=${WEB_URL:-http://localhost:3000}
SYMBOL="E2E$(date +%s)"

curl -fsS "$API/api/v1/health" >/dev/null
curl -fsS "$WEB" >/dev/null
PORT=$(curl -fsS -X POST "$API/api/v1/portfolio" -H 'Content-Type: application/json' -d "{\"market\":\"TH\",\"symbol\":\"$SYMBOL\",\"quantity\":1,\"average_cost\":100,\"currency\":\"THB\"}")
PORT_ID=$(printf '%s' "$PORT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
WATCH=$(curl -fsS -X POST "$API/api/v1/watchlist" -H 'Content-Type: application/json' -d "{\"market\":\"TH\",\"symbol\":\"$SYMBOL\",\"upper_percent\":5,\"lower_percent\":-5}")
WATCH_ID=$(printf '%s' "$WATCH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
curl -fsS -X POST "$API/api/v1/alerts/evaluate" >/dev/null
curl -fsS -X DELETE "$API/api/v1/portfolio/$PORT_ID" >/dev/null
curl -fsS -X DELETE "$API/api/v1/watchlist/$WATCH_ID" >/dev/null
printf 'e2e smoke tests passed symbol=%s\n' "$SYMBOL"
