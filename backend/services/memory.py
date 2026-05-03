import json
import redis.asyncio as redis
import os
import logging
from typing import Optional
from models import SessionState

logger = logging.getLogger(__name__)

# Initialize Redis client. We will configure it from env later
redis_client = None

async def init_redis():
    global redis_client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url, decode_responses=True)

async def get_session(session_id: str) -> Optional[SessionState]:
    if not redis_client:
        await init_redis()
    
    data = await redis_client.get(f"session:{session_id}")
    if data:
        try:
            return SessionState.model_validate_json(data)
        except Exception as e:
            logger.error(f"Error parsing session state: {e}")
            return None
    return None

async def save_session(session_state: SessionState):
    if not redis_client:
        await init_redis()
        
    try:
        data = session_state.model_dump_json()
        await redis_client.setex(f"session:{session_state.session_id}", 3600, data)
    except Exception as e:
        logger.error(f"Error saving session state: {e}")

async def create_session(session_id: str, target_role: str) -> SessionState:
    session = SessionState(session_id=session_id, target_role=target_role)
    await save_session(session)
    return session
