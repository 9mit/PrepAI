"""Security helpers: JWT guest tokens, trusted IP, audit logging."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from collections import defaultdict
from pathlib import Path
from typing import Optional

from fastapi import Header, HTTPException, Request

logger = logging.getLogger("prepai.security")

TOKEN_TTL_SEC = int(os.getenv("PREPAI_TOKEN_TTL_SEC", "3600"))
AUTH_ISSUE_LIMIT = 8
AUTH_ISSUE_WINDOW = 60

_jwt_secret: Optional[bytes] = None
_issue_buckets: dict[str, list[float]] = defaultdict(list)

AUDIT_PATH = Path(os.getenv("PREPAI_AUDIT_LOG", "/tmp/prepai/audit.log"))


def _secret() -> bytes:
    global _jwt_secret
    if _jwt_secret is not None:
        return _jwt_secret
    raw = os.getenv("PREPAI_JWT_SECRET", "").strip()
    if raw:
        _jwt_secret = raw.encode("utf-8")
    else:
        # Ephemeral secret for local/dev — set PREPAI_JWT_SECRET in production
        _jwt_secret = secrets.token_bytes(32)
        logger.warning("PREPAI_JWT_SECRET not set; using ephemeral in-memory secret")
    return _jwt_secret


def _b64url(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    import base64
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def mint_access_token(subject: str = "guest") -> tuple[str, int]:
    """Return (token, expires_in_seconds). Compact HMAC-signed JWT-like token."""
    now = int(time.time())
    exp = now + TOKEN_TTL_SEC
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64url(json.dumps(
        {"sub": subject, "iat": now, "exp": exp, "jti": secrets.token_hex(8)},
        separators=(",", ":"),
    ).encode())
    signing_input = f"{header}.{payload}".encode("ascii")
    sig = _b64url(hmac.new(_secret(), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}", TOKEN_TTL_SEC


def verify_access_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("format")
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected = hmac.new(_secret(), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url(expected), sig_b64):
            raise ValueError("sig")
        payload = json.loads(_b64url_decode(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc


def prune_stale_buckets(buckets: dict[str, list[float]], window_sec: float) -> None:
    now = time.time()
    stale_keys = [k for k, timestamps in buckets.items() if not timestamps or (now - timestamps[-1] >= window_sec)]
    for k in stale_keys:
        buckets.pop(k, None)


def trusted_client_ip(request: Request) -> str:
    """
    Prefer direct connection IP. Only trust X-Real-IP or the *rightmost* X-Forwarded-For hop
    when TRUST_PROXY=true (nginx terminates TLS / proxy).
    Never use the leftmost client-supplied XFF value (spoofable).
    """
    trust_proxy = os.getenv("TRUST_PROXY", "true").lower() in ("1", "true", "yes")
    if trust_proxy:
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            hops = [h.strip() for h in forwarded.split(",") if h.strip()]
            if hops:
                return hops[-1]
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_issue_rate(ip: str) -> None:
    if len(_issue_buckets) > 500:
        prune_stale_buckets(_issue_buckets, AUTH_ISSUE_WINDOW)
    now = time.time()
    bucket = [t for t in _issue_buckets[ip] if now - t < AUTH_ISSUE_WINDOW]
    if len(bucket) >= AUTH_ISSUE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many auth requests")
    bucket.append(now)
    _issue_buckets[ip] = bucket


async def require_bearer(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        audit_event("auth_missing", request, {})
        raise HTTPException(status_code=401, detail="Authorization Bearer token required")
    token = authorization.split(" ", 1)[1].strip()
    claims = verify_access_token(token)
    request.state.auth_sub = claims.get("sub", "guest")
    return claims


def audit_event(event: str, request: Request, extra: Optional[dict] = None) -> None:
    """Append-only audit line. Best-effort; never logs secrets or bodies."""
    record = {
        "ts": int(time.time()),
        "event": event,
        "ip": trusted_client_ip(request),
        "path": request.url.path,
        "method": request.method,
        "sub": getattr(request.state, "auth_sub", None),
    }
    if extra:
        # Scrub obvious secret keys
        safe = {k: v for k, v in extra.items() if k.lower() not in {"password", "token", "authorization", "api_key"}}
        record.update(safe)
    line = json.dumps(record, separators=(",", ":"))
    try:
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with AUDIT_PATH.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        logger.info("audit %s", line)


def sanitize_filename(value: str, fallback: str = "session") -> str:
    cleaned = "".join(c for c in value if c.isalnum() or c in "-_")[:64]
    return cleaned or fallback
