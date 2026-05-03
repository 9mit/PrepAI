import os
import logging
from groq import AsyncGroq
from models import AnswerScore, FollowUp

logger = logging.getLogger(__name__)

async def generate_follow_up(question: str, answer: str, score: AnswerScore) -> FollowUp:
    """
    Generates a follow-up based on the score. The logic is in Python.
    average score >= 80 -> challenge
    50 <= average score < 80 -> probe
    average score < 50 -> hint
    """
    avg_score = (score.accuracy + score.depth + score.clarity + score.confidence) / 4.0
    
    if avg_score >= 80:
        follow_up_type = "challenge"
        system_prompt = "Generate a tough follow-up challenge question that pushes the candidate's strong understanding of the topic. The candidate answered the previous question well. Return just the question text."
    elif avg_score >= 50:
        follow_up_type = "probe"
        system_prompt = "Generate a probing follow-up question that targets the gaps in the candidate's answer. The answer was shallow. Return just the question text."
    else:
        follow_up_type = "hint"
        system_prompt = "Generate a helpful hint for the candidate to answer the question better. Then ask them to retry the original question. Return the hint and the retry request as a single brief paragraph."

    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    user_prompt = f"Original Question: {question}\nCandidate's Answer: {answer}\nFeedback: {score.feedback}\n\nPlease provide the response."

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
            temperature=0.7,
        )
        
        follow_up_text = chat_completion.choices[0].message.content.strip()
        return FollowUp(type=follow_up_type, question=follow_up_text)
        
    except Exception as e:
        logger.error(f"Error generating follow up: {e}")
        return FollowUp(type=follow_up_type, question="Could you elaborate more on your answer?")
