import time
from datetime import datetime, timezone

def main() -> None:
    print(f"MyStockAlert worker started at {datetime.now(timezone.utc).isoformat()}")
    while True:
        time.sleep(60)

if __name__ == "__main__":
    main()
