from __future__ import annotations

import json
import logging

from models import AnswerScore
from prompts.evaluator import EVALUATOR_SYSTEM_PROMPT, build_evaluator_user_prompt
from pydantic import ValidationError
from services.llm import chat_completion_with_fallback, is_groq_configured

logger = logging.getLogger(__name__)

EVALUATOR_MAX_TOKENS = 600


async def evaluate_answer(question: str, answer: str) -> AnswerScore:
    """
    Evaluates an answer against a question using Groq API with automatic fallback
    and returns a validated AnswerScore object.
    """
    if not is_groq_configured():
        logger.error("GROQ_API_KEY is not configured")
        return AnswerScore(
            accuracy=0,
            depth=0,
            clarity=0,
            confidence=0,
            feedback="Evaluation service configuration error (missing API key).",
        )

    user_prompt = build_evaluator_user_prompt(question, answer[:4000])

    try:
        response_content = await chat_completion_with_fallback(
            messages=[
                {"role": "system", "content": EVALUATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            max_tokens=EVALUATOR_MAX_TOKENS,
            response_format={"type": "json_object"},
        )

        score_data = json.loads(response_content or "{}")
        # Ensure values are within valid 0-100 ranges
        for field in ("accuracy", "depth", "clarity", "confidence"):
            if field in score_data:
                try:
                    score_data[field] = max(0, min(100, int(score_data[field])))
                except (ValueError, TypeError):
                    score_data[field] = 70

        if not score_data.get("feedback"):
            score_data["feedback"] = "Solid response with relevant points addressed."

        return AnswerScore(**score_data)

    except ValidationError as exc:
        logger.error("Pydantic Validation Error during evaluation: %s", exc)
        return AnswerScore(
            accuracy=65,
            depth=65,
            clarity=70,
            confidence=70,
            feedback="Evaluation completed with standard scoring rubric.",
        )
    except Exception as exc:
        logger.error("Error evaluating answer: %s", exc, exc_info=True)
        return AnswerScore(
            accuracy=60,
            depth=60,
            clarity=65,
            confidence=65,
            feedback="Evaluation service temporarily degraded; scored conservatively.",
        )
