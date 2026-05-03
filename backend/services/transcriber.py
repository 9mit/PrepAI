import os
import logging
import httpx

logger = logging.getLogger(__name__)

async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribes audio using Whisper via Hugging Face Inference API.
    Audio never written to disk, processed in memory.
    """
    hf_token = os.getenv("HUGGINGFACE_API_KEY")
    if not hf_token:
        logger.error("HUGGINGFACE_API_KEY is missing")
        return "Audio transcription failed due to missing API key."

    headers = {"Authorization": f"Bearer {hf_token}"}
    API_URL = "https://api-inference.huggingface.co/models/openai/whisper-small"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(API_URL, headers=headers, content=audio_bytes, timeout=30.0)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("text", "")
            else:
                logger.error(f"HF API returned {response.status_code}: {response.text}")
                return "Audio transcription failed from API."
    except Exception as e:
        logger.error(f"Error calling HF Inference API: {e}")
        return "Audio transcription encountered an error."
