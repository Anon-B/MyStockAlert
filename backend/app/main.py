from datetime import datetime, timezone
from fastapi import FastAPI

app = FastAPI(title="MyStockAlert API", version="0.1.0")

@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/api/v1/health")
def api_health() -> dict:
    return {"status": "ok", "service": "backend"}
