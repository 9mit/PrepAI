import json
import time
import redis.asyncio as redis
import os
import logging
from typing import Optional, Dict, Tuple
from models import SessionState

logger = logging.getLogger(__name__)

redis_client = None
_redis_available: Optional[bool] = None

# In-memory fallback: session_id -> (SessionState JSON, expires_at epoch)
_memory_store: Dict[str, Tuple[str, float]] = {}
SESSION_TTL_SEC = 3600


async def init_redis():
    global redis_client, _redis_available
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = redis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
        _redis_available = True
        logger.info("Redis connected")
    except Exception as e:
        logger.warning("Redis unavailable (%s); using in-memory session store", type(e).__name__)
        redis_client = None
        _redis_available = False


def _memory_get(session_id: str) -> Optional[str]:
    entry = _memory_store.get(session_id)
    if not entry:
        return None
    data, expires_at = entry
    if time.time() > expires_at:
        _memory_store.pop(session_id, None)
        return None
    return data


def _memory_set(session_id: str, data: str) -> None:
    _memory_store[session_id] = (data, time.time() + SESSION_TTL_SEC)


async def get_session(session_id: str) -> Optional[SessionState]:
    global _redis_available
    if _redis_available is None:
        await init_redis()

    raw: Optional[str] = None
    if _redis_available and redis_client:
        try:
            raw = await redis_client.get(f"session:{session_id}")
        except Exception as e:
            logger.warning("Redis get failed (%s); falling back to memory", type(e).__name__)
            _redis_available = False
            raw = _memory_get(session_id)
    else:
        raw = _memory_get(session_id)

    if not raw:
        return None
    try:
        return SessionState.model_validate_json(raw)
    except Exception as e:
        logger.error("Error parsing session state: %s", e)
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
        except Exception as e:
            logger.warning("Redis save failed (%s); using memory", type(e).__name__)
            _redis_available = False

    _memory_set(session_state.session_id, data)


async def create_session(
    session_id: str,
    target_role: str,
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
        # In-memory mode still allows sessions — report degraded but usable
        return False
    except Exception as e:
        logger.error("Redis ping failed: %s", e)
        _redis_available = False
        return False
