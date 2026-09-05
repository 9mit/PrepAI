import os
import logging
from groq import AsyncGroq
from models import AnswerScore, FollowUp, SessionState
from prompts.follow_up import build_follow_up_system_prompt

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


async def generate_follow_up(
    question: str,
    answer: str,
    score: AnswerScore,
    session: SessionState | None = None,
) -> FollowUp:
    avg_score = (score.accuracy + score.depth + score.clarity + score.confidence) / 4.0

    if avg_score >= 80:
        follow_up_type = "challenge"
    elif avg_score >= 50:
        follow_up_type = "probe"
    else:
        follow_up_type = "hint"

    context_bits = []
    if session:
        if session.target_role:
            context_bits.append(f"Role: {session.target_role}")
        if session.interview_field:
            context_bits.append(f"Field: {session.interview_field}")
        if session.domain_pack:
            context_bits.append(f"Domain pack: {session.domain_pack}")
        if session.interview_mode:
            context_bits.append(f"Mode: {session.interview_mode}")
        if session.topics_covered:
            context_bits.append("Topics covered: " + "; ".join(session.topics_covered[-8:]))
        if session.claims_made:
            context_bits.append("Claims made: " + "; ".join(session.claims_made[-6:]))
        if session.open_threads:
            context_bits.append("Open threads: " + "; ".join(session.open_threads[-4:]))
        if session.answer_summaries:
            context_bits.append(
                "Prior summaries:\n" + "\n".join(f"- {s}" for s in session.answer_summaries[-5:])
            )
        if session.resume_context:
            context_bits.append(f"Resume excerpt: {session.resume_context[:600]}")
        if session.job_description:
            context_bits.append(f"JD excerpt: {session.job_description[:600]}")
        if session.intensity_nudge:
            context_bits.append(f"Difficulty nudge: {session.intensity_nudge}")

    score_block = (
        f"accuracy={score.accuracy}, depth={score.depth}, "
        f"clarity={score.clarity}, confidence={score.confidence}; {score.feedback}"
    )
    system_prompt = build_follow_up_system_prompt(
        follow_up_type=follow_up_type,
        question=question[:500],
        answer_excerpt=answer[:1200],
        score_block=score_block,
        context_block="\n".join(context_bits),
    )

    client = _get_client()
    if client is None:
        return FollowUp(
            type=follow_up_type,
            question="Could you elaborate with a specific example and a measurable outcome?",
        )
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Provide the follow-up JSON or a single follow-up question."},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=180,
        )
        follow_up_text = (chat_completion.choices[0].message.content or "").strip()
        if follow_up_text.startswith("{"):
            import json
            try:
                data = json.loads(follow_up_text)
                follow_up_text = str(data.get("question") or follow_up_text)
            except Exception:
                pass
        if not follow_up_text:
            follow_up_text = "You mentioned that — can you quantify the impact with a specific metric?"
        return FollowUp(type=follow_up_type, question=follow_up_text)
    except Exception as e:
        logger.error("Error generating follow up: %s", type(e).__name__)
        return FollowUp(
            type=follow_up_type,
            question="Could you elaborate with a specific example and a measurable outcome?",
        )
