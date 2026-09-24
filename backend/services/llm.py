"""
Centralized LLM and Audio Inference Service for PrepAI.
Provides unified AsyncGroq client management, intelligent model routing,
rate-limit resilience, and free high-performance Whisper transcription.
"""

from __future__ import annotations

import io
import logging
import os
from typing import Any

from groq import AsyncGroq

logger = logging.getLogger("prepai.llm")

# Production-grade open-source models available on Groq
DEFAULT_PRIMARY_MODEL = "llama-3.3-70b-versatile"
DEFAULT_FAST_MODEL = "llama-3.1-8b-instant"
DEFAULT_WHISPER_MODEL = "whisper-large-v3-turbo"

_groq_client: AsyncGroq | None = None


def get_primary_model() -> str:
    return os.getenv("GROQ_MODEL", DEFAULT_PRIMARY_MODEL).strip() or DEFAULT_PRIMARY_MODEL


def get_fast_model() -> str:
    return os.getenv("GROQ_FAST_MODEL", DEFAULT_FAST_MODEL).strip() or DEFAULT_FAST_MODEL


def get_whisper_model() -> str:
    return os.getenv("GROQ_WHISPER_MODEL", DEFAULT_WHISPER_MODEL).strip() or DEFAULT_WHISPER_MODEL


def get_groq_client() -> AsyncGroq:
    """Return an initialized singleton AsyncGroq client or raise an informative error."""
    global _groq_client
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured in environment")
    if _groq_client is None:
        _groq_client = AsyncGroq(api_key=api_key)
    return _groq_client


def is_groq_configured() -> bool:
    key = os.getenv("GROQ_API_KEY", "").strip()
    return bool(key and key != "gsk_your_key_here")


async def transcribe_audio_groq(audio_bytes: bytes, filename: str = "recording.webm") -> str | None:
    """
    Transcribes audio using Whisper-large-v3-turbo via Groq's high-speed, free audio API.
    Zero disk footprint — processed in memory.
    """
    if not is_groq_configured() or not audio_bytes:
        return None

    try:
        client = get_groq_client()
        model_name = get_whisper_model()

        # Wrap raw bytes in a Named BytesIO for Groq API
        bio = io.BytesIO(audio_bytes)
        bio.name = filename

        transcription = await client.audio.transcriptions.create(
            file=(bio.name, bio.read()),
            model=model_name,
            response_format="text",
            temperature=0.0,
        )

        if isinstance(transcription, str):
            text = transcription.strip()
        else:
            text = getattr(transcription, "text", "").strip()

        return text or None
    except Exception as exc:
        logger.warning("Groq Whisper transcription failed (%s): %s", type(exc).__name__, exc)
        return None


async def chat_completion_with_fallback(
    messages: list[dict[str, Any]],
    temperature: float = 0.7,
    max_tokens: int = 1500,
    response_format: dict[str, str] | None = None,
    preferred_model: str | None = None,
) -> str:
    """
    Executes a chat completion. If the 70B model encounters a rate limit (HTTP 429)
    or transient failure, gracefully falls back to the fast 8B model.
    """
    client = get_groq_client()
    primary = preferred_model or get_primary_model()
    fast = get_fast_model()

    models_to_try = [primary]
    if fast != primary:
        models_to_try.append(fast)

    last_error: Exception | None = None

    for model in models_to_try:
        try:
            kwargs: dict[str, Any] = {
                "messages": messages,
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if response_format:
                kwargs["response_format"] = response_format

            completion = await client.chat.completions.create(**kwargs)
            content = completion.choices[0].message.content or ""
            return content.strip()
        except Exception as exc:
            last_error = exc
            err_str = str(exc).lower()
            if "rate_limit" in err_str or "429" in err_str or "overloaded" in err_str:
                logger.warning("Model %s rate limited, attempting fallback: %s", model, exc)
                continue
            # For non-rate-limit errors, re-raise or continue to fallback if available
            logger.error("Error with model %s (%s): %s", model, type(exc).__name__, exc)
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Failed to generate completion from all available models")
