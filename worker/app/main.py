import asyncio
import os
from datetime import datetime, timezone
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
POLL_SECONDS = int(os.getenv("MARKET_POLL_SECONDS", "60"))

async def poll_market() -> None:
    started = datetime.now(timezone.utc)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(f"{BACKEND_URL}/api/v1/market/quotes")
            response.raise_for_status()
            quotes = response.json()
        print(f"market poll ok quotes={len(quotes)} started={started.isoformat()}")
    except Exception as exc:
        print(f"market poll failed error={exc}")

async def main() -> None:
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(poll_market, "interval", seconds=POLL_SECONDS, id="market-poll", max_instances=1, coalesce=True)
    scheduler.start()
    print(f"MyStockAlert worker started poll_seconds={POLL_SECONDS}")
    await poll_market()
    try:
        await asyncio.Event().wait()
    finally:
        scheduler.shutdown(wait=False)

if __name__ == "__main__":
    asyncio.run(main())
