import os
import json
import logging
from groq import AsyncGroq
from models import AnswerScore
from pydantic import ValidationError

logger = logging.getLogger(__name__)

async def evaluate_answer(question: str, answer: str) -> AnswerScore:
    """
    Evaluates an answer against a question using Groq API and returns a structured Pydantic object.
    """
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    
    system_prompt = """You are an expert AI interview evaluator.
Your task is to evaluate the user's answer to the interview question.
You must return a raw JSON object matching this schema EXACTLY, with no markdown formatting or extra text:
{
  "accuracy": integer between 0 and 100,
  "depth": integer between 0 and 100,
  "clarity": integer between 0 and 100,
  "confidence": integer between 0 and 100,
  "feedback": "string explaining the scores briefly"
}
Scoring Rubric:
- accuracy: Factual correctness and relevance to the question.
- depth: Level of detail, examples provided, and technical understanding.
- clarity: How well the answer is structured and easy to understand.
- confidence: Assertiveness and certainty in the tone (derived from the text).
"""

    user_prompt = f"Question: {question}\n\nCandidate's Answer: {answer}"

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        response_content = chat_completion.choices[0].message.content
        
        # Pydantic validation
        score_data = json.loads(response_content)
        validated_score = AnswerScore(**score_data)
        return validated_score
        
    except ValidationError as e:
        logger.error(f"Pydantic Validation Error during evaluation: {e}")
        # Return a fallback score to handle failures gracefully
        return AnswerScore(
            accuracy=0, depth=0, clarity=0, confidence=0,
            feedback="System failed to parse the evaluation properly."
        )
    except Exception as e:
        logger.error(f"Error calling Groq API: {e}")
        return AnswerScore(
            accuracy=0, depth=0, clarity=0, confidence=0,
            feedback="Error connecting to evaluation service."
        )
