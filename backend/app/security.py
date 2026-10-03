import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

PBKDF2_ITERATIONS = 310_000
SESSION_TTL_HOURS = 12

def hash_password(password: str) -> str:
    if not password:
        raise ValueError("password is required")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256\x24{PBKDF2_ITERATIONS}\x24{salt.hex()}\x24{digest.hex()}"

def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, iterations, salt_hex, digest_hex = encoded.split("\x24", 3)
        if scheme != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations))
        return hmac.compare_digest(candidate.hex(), digest_hex)
    except (ValueError, TypeError):
        return False

def new_session_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return raw, digest

def session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)

def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

def app_secret() -> str:
    value = os.getenv("APP_SECRET", "")
    if len(value) < 32 or value == "change-me":
        raise RuntimeError("APP_SECRET must be a strong secret (>=32 characters)")
    return value
