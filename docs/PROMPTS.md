# Prompt system

`PROMPT_VERSION = 2026.07.launch` (FE + BE).

## Frontend

[`services/prompts/`](../services/prompts/) — `buildInterviewerSystemPrompt`, re-exports caps/rules from `interviewContext` / `domainPacks`.

## Backend

[`backend/prompts/`](../backend/prompts/) — `SYSTEM_GUARDRAIL`, planner, follow_up, evaluator, analyze, parse_resume.

Call sites import builders only; do not paste multi-paragraph prompts into pages.

Chat requests still prepend `SYSTEM_GUARDRAIL` in FastAPI.
