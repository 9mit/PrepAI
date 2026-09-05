import os
import logging
import json
from groq import AsyncGroq
from models import Question, SessionState
from prompts.planner import build_planner_system_prompt

logger = logging.getLogger(__name__)


_client = None


def _get_client():
    global _client
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return None
    if _client is None:
        _client = AsyncGroq(api_key=api_key)
    return _client


async def get_next_question(session_state: SessionState) -> Question:
    client = _get_client()
    if client is None:
        return Question(
            id="q-fallback",
            text="Tell me about a challenging project or initiative you owned recently.",
            topic="Behavioral",
        )

    asked = ", ".join(session_state.questions_asked) if session_state.questions_asked else "None"
    summaries = "\n".join(f"- {s}" for s in session_state.answer_summaries[-6:]) or "None yet"
    topics = ", ".join(session_state.topics_covered[-10:]) or "None"
    claims = ", ".join(session_state.claims_made[-6:]) or "None"
    jd = (session_state.job_description or "")[:1200] or "None"
    resume = (session_state.resume_context or "")[:1200] or "None"
    nudge = session_state.intensity_nudge or "standard"

    system_prompt = build_planner_system_prompt(
        target_role=session_state.target_role,
        interview_field=session_state.interview_field,
        interview_mode=session_state.interview_mode,
        company_style=session_state.company_style,
        domain_pack=session_state.domain_pack,
        nudge=nudge,
        asked=asked,
        topics=topics,
        claims=claims,
        summaries=summaries,
        jd=jd,
        resume=resume,
    )

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate the next question."},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=250,
            response_format={"type": "json_object"},
        )
        content = chat_completion.choices[0].message.content
        data = json.loads(content or "{}")
        return Question(
            id=str(data.get("id", "q-next")),
            text=str(data.get("text", "Tell me about a challenging project you led.")),
            topic=str(data.get("topic", "Behavioral")),
        )
    except Exception as e:
        logger.error("Planner error: %s", type(e).__name__)
        return Question(
            id="q-fallback",
            text="Tell me about a challenging project or initiative you owned recently.",
            topic="Behavioral",
        )
