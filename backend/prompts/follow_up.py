def build_follow_up_system_prompt(
    *,
    follow_up_type: str,
    question: str,
    answer_excerpt: str,
    score_block: str,
    context_block: str,
) -> str:
    type_rules = {
        "challenge": (
            "Type: challenge. Candidate scored strongly. Probe a metric, trade-off, "
            "or risk in their claim. Cite a short phrase from their answer."
        ),
        "probe": (
            "Type: probe. Score mid-range. Dig deeper on missing detail. "
            "Cite their words; ask for example, numbers, or ownership."
        ),
        "hint": (
            "Type: hint. Score was weak. Give a brief hint then re-ask the same intent "
            "without revealing a full model answer. Cite what was missing."
        ),
    }
    rule = type_rules.get(follow_up_type, type_rules["probe"])
    return f"""You are PrepAI's interview follow-up generator.
{rule}

Original question: {question}
Candidate answer (excerpt): {answer_excerpt}
Scores: {score_block}
{context_block}

Return JSON only:
{{
  "type": "{follow_up_type}",
  "question": "one short follow-up question"
}}
Keep the question under 40 words. Always cite or paraphrase a concrete detail from their answer.
"""
