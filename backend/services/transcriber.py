from __future__ import annotations

import logging
import os

import httpx
from services.llm import transcribe_audio_groq

logger = logging.getLogger(__name__)

HF_API_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo"


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str | None:
    """
    Transcribes audio using Whisper.
    1. Primary: Groq Whisper-large-v3-turbo (free, fast, in-memory, uses GROQ_API_KEY).
    2. Fallback: Hugging Face Inference API if HUGGINGFACE_API_KEY is configured.
    Audio is never written to disk, processed entirely in memory.
    """
    if not audio_bytes:
        return None

    # Try Groq Whisper first (fastest, free, reliable)
    groq_result = await transcribe_audio_groq(audio_bytes, filename=filename)
    if groq_result:
        return groq_result

    # Fallback to Hugging Face Inference API if configured
    hf_token = os.getenv("HUGGINGFACE_API_KEY", "").strip()
    if not hf_token or hf_token == "your-key-here":
        logger.debug("HUGGINGFACE_API_KEY not set for fallback transcription")
        return None

    headers = {"Authorization": f"Bearer {hf_token}"}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(HF_API_URL, headers=headers, content=audio_bytes)
            if response.status_code == 200:
                result = response.json()
                text = str(result.get("text", "")).strip()
                return text or None
            logger.warning("HF Inference API error %d: %s", response.status_code, response.text[:200])
            return None
    except Exception as exc:
        logger.error("Exception during HF audio transcription: %s", exc)
        return None
