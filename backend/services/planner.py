from __future__ import annotations

import json
import logging

from models import Question, SessionState
from prompts.planner import build_planner_system_prompt
from services.llm import chat_completion_with_fallback, is_groq_configured

logger = logging.getLogger(__name__)


async def get_next_question(session_state: SessionState) -> Question:
    fallback_q = Question(
        id="q-fallback",
        text="Tell me about a challenging technical or strategic initiative you led recently.",
        topic="Behavioral",
    )

    if not is_groq_configured():
        return fallback_q

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
        content = await chat_completion_with_fallback(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate the next question."},
            ],
            temperature=0.7,
            max_tokens=400,
            response_format={"type": "json_object"},
        )
        data = json.loads(content or "{}")
        q_id = str(data.get("id", f"q-{len(session_state.questions_asked) + 1}"))
        q_text = str(data.get("text", "")).strip() or fallback_q.text
        q_topic = str(data.get("topic", "Technical & Behavioral")).strip()
        return Question(id=q_id, text=q_text, topic=q_topic)
    except Exception as exc:
        logger.error("Planner error: %s", exc)
        return fallback_q
