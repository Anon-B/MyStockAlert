#!/bin/zsh
set -e

docker run -d --name mystockalert-backend-1 --network mystockalert_default -p 8000:8000 \
  -e DATABASE_URL=postgresql://mystockalert:change-me@postgres:5432/mystockalert \
  -e APP_SECRET=change-me mystockalert-backend:local \
  sh -c 'alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000'

docker run -d --name mystockalert-frontend-1 --network mystockalert_default -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 mystockalert-frontend:local
