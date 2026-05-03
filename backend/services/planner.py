import os
import logging
import json
from typing import List
from groq import AsyncGroq
from models import Question, SessionState

logger = logging.getLogger(__name__)

async def get_next_question(session_state: SessionState) -> Question:
    """
    Selects the next question to ask based on target role, asked questions, and weak topics.
    """
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    
    # Simple logic to determine weak topics
    # In a real app we'd track per-topic scores, but here we can prompt the LLM 
    # to generate a question for the target role, avoiding the asked ones.
    
    asked_questions_text = ", ".join(session_state.questions_asked) if session_state.questions_asked else "None"
    
    system_prompt = f"""You are an expert AI interview planner.
The target role is: {session_state.target_role}.
The candidate has already been asked: {asked_questions_text}.
Based on typical interview structure, select the NEXT BEST question to ask.
If the candidate has struggled with certain areas (inferred from follow-ups), pick a relevant topic to test them.
Return a JSON object exactly matching this schema:
{{
  "id": "unique-question-id",
  "text": "The question text",
  "topic": "The topic area (e.g. System Design, Python, Behavioral)"
}}
"""

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": "Generate the next question.",
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        response_content = chat_completion.choices[0].message.content
        question_data = json.loads(response_content)
        return Question(**question_data)
        
    except Exception as e:
        logger.error(f"Error planning next question: {e}")
        return Question(id="fallback-1", text="Can you tell me about your experience with this role?", topic="General")
