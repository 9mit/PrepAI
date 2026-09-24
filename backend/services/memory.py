from __future__ import annotations

import logging
import os
import time
from typing import Any

from models import SessionState

try:
    import redis.asyncio as aioredis  # type: ignore[import-untyped]
    HAS_REDIS = True
except ImportError:
    aioredis = None  # type: ignore[assignment]
    HAS_REDIS = False

logger = logging.getLogger(__name__)

redis_client: Any = None
_redis_available: bool | None = None

# In-memory fallback: session_id -> (SessionState JSON, expires_at epoch)
_memory_store: dict[str, tuple[str, float]] = {}
SESSION_TTL_SEC = 3600


async def init_redis() -> None:
    global redis_client, _redis_available
    if not HAS_REDIS or aioredis is None:
        logger.info("Redis package not installed; using in-memory session store")
        redis_client = None
        _redis_available = False
        return
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = aioredis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
        _redis_available = True
        logger.info("Redis connected successfully")
    except Exception as exc:
        logger.warning("Redis unavailable (%s); using in-memory session store", type(exc).__name__)
        redis_client = None
        _redis_available = False


def _memory_get(session_id: str) -> str | None:
    entry = _memory_store.get(session_id)
    if not entry:
        return None
    data, expires_at = entry
    if time.time() > expires_at:
        _memory_store.pop(session_id, None)
        return None
    return data


def _memory_set(session_id: str, data: str) -> None:
    now = time.time()
    if len(_memory_store) > 100:
        expired = [sid for sid, (_, exp) in _memory_store.items() if now > exp]
        for sid in expired:
            _memory_store.pop(sid, None)
    _memory_store[session_id] = (data, now + SESSION_TTL_SEC)


async def get_session(session_id: str) -> SessionState | None:
    global _redis_available
    if _redis_available is None:
        await init_redis()

    raw: str | None = None
    if _redis_available and redis_client:
        try:
            raw = await redis_client.get(f"session:{session_id}")
        except Exception as exc:
            logger.warning("Redis get failed (%s); falling back to memory", type(exc).__name__)
            _redis_available = False
            raw = _memory_get(session_id)
    else:
        raw = _memory_get(session_id)

    if not raw:
        return None
    try:
        return SessionState.model_validate_json(raw)
    except Exception as exc:
        logger.error("Error parsing session state: %s", exc)
        return None


async def save_session(session_state: SessionState) -> None:
    global _redis_available
    if _redis_available is None:
        await init_redis()

    data = session_state.model_dump_json()
    if _redis_available and redis_client:
        try:
            await redis_client.setex(f"session:{session_state.session_id}", SESSION_TTL_SEC, data)
            return
        except Exception as exc:
            logger.warning("Redis save failed (%s); using memory", type(exc).__name__)
            _redis_available = False

    _memory_set(session_state.session_id, data)


async def create_session(
    session_id: str,
    target_role: str,
    target_questions: int = 5,
    job_description: str = "",
    resume_context: str = "",
    interview_field: str = "",
    company_style: str = "",
    interview_mode: str = "",
    domain_pack: str = "",
) -> SessionState:
    session = SessionState(
        session_id=session_id,
        target_role=target_role,
        target_questions=target_questions,
        job_description=job_description or "",
        resume_context=resume_context or "",
        interview_field=interview_field or "",
        company_style=company_style or "",
        interview_mode=interview_mode or "",
        domain_pack=domain_pack or "",
    )
    await save_session(session)
    return session


async def ping_redis() -> bool:
    global _redis_available
    try:
        if _redis_available is None:
            await init_redis()
        if _redis_available and redis_client:
            return bool(await redis_client.ping())
        return False
    except Exception as exc:
        logger.error("Redis ping failed: %s", exc)
        _redis_available = False
        return False
