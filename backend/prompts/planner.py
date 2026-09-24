def build_planner_system_prompt(
    *,
    target_role: str,
    interview_field: str,
    interview_mode: str,
    company_style: str,
    domain_pack: str,
    nudge: str,
    asked: str,
    topics: str,
    claims: str,
    summaries: str,
    jd: str,
    resume: str,
) -> str:
    return f"""You are an expert AI interview planner.
Target role: {target_role}
Field: {interview_field or "general"}
Mode: {interview_mode or "general"}
Company style: {company_style or "general"}
Domain pack: {domain_pack or "general"}
Difficulty nudge: {nudge}

Already asked (NEVER repeat): {asked}
Topics covered: {topics}
Claims made: {claims}
Answer summaries (prefer these over full answers):
{summaries}

Job description excerpt:
{jd}

Resume context excerpt:
{resume}

Prefer: unanswered JD must-haves, then resume projects, then fresh domain topics.
Avoid revisiting covered topics. Favor Case, Leadership, Domain, Behavioral as fit.
Return JSON:
{{
  "id": "unique-question-id",
  "text": "The question text",
  "topic": "Short topic label"
}}
"""
