import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

API_URL = "https://api-inference.huggingface.co/models/openai/whisper-small"


async def transcribe_audio(audio_bytes: bytes) -> Optional[str]:
    """
    Transcribes audio using Whisper via Hugging Face Inference API.
    Audio never written to disk, processed in memory.
    Returns transcribed text, or None if transcription failed.
    """
    hf_token = os.getenv("HUGGINGFACE_API_KEY")
    if not hf_token or not hf_token.strip() or hf_token == "your-key-here":
        logger.error("HUGGINGFACE_API_KEY is missing or unconfigured")
        return None

    headers = {"Authorization": f"Bearer {hf_token.strip()}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(API_URL, headers=headers, content=audio_bytes)

            if response.status_code == 200:
                result = response.json()
                text = str(result.get("text", "")).strip()
                return text or None
            else:
                logger.error("HF Inference API error %d: %s", response.status_code, response.text[:200])
                return None
    except Exception as e:
        logger.error("Exception during audio transcription: %s", e)
        return None
