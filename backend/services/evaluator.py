import os
import json
import logging
from groq import AsyncGroq
from models import AnswerScore
from pydantic import ValidationError
from prompts.evaluator import EVALUATOR_SYSTEM_PROMPT, build_evaluator_user_prompt

logger = logging.getLogger(__name__)

EVALUATOR_MAX_TOKENS = 400


async def evaluate_answer(question: str, answer: str) -> AnswerScore:
    """
    Evaluates an answer against a question using Groq API and returns a structured Pydantic object.
    """
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    user_prompt = build_evaluator_user_prompt(question, answer[:4000])

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": EVALUATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            max_tokens=EVALUATOR_MAX_TOKENS,
            response_format={"type": "json_object"},
        )

        response_content = chat_completion.choices[0].message.content
        score_data = json.loads(response_content or "{}")
        validated_score = AnswerScore(**score_data)
        return validated_score

    except ValidationError as e:
        logger.error("Pydantic Validation Error during evaluation: %s", e)
        return AnswerScore(
            accuracy=0, depth=0, clarity=0, confidence=0,
            feedback="System failed to parse the evaluation properly.",
        )
    except Exception as e:
        logger.error("Error calling Groq API: %s", e)
        return AnswerScore(
            accuracy=0, depth=0, clarity=0, confidence=0,
            feedback="Error connecting to evaluation service.",
        )
