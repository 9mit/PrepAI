# Architecture

PrepAI is a React 18 + Vite frontend with a FastAPI backend (Groq `llama-3.3-70b-versatile`).

## Client

- Hash router (`#/route`) in [`App.tsx`](../App.tsx)
- Guest JWT via [`services/apiClient.ts`](../services/apiClient.ts) (sessionStorage)
- Profile, history, telemetry, templates in localStorage
- Interview turn machine orchestrated in [`pages/InterviewRoom.tsx`](../pages/InterviewRoom.tsx) with UI split under [`components/interview/`](../components/interview/)

## Server

- Evaluate loop: score ≥80 advance, 50–79 probe, &lt;50 hint+retry
- Session memory Redis + in-memory fallback ([`backend/services/memory.py`](../backend/services/memory.py))
- Prompts live in [`backend/prompts/`](../backend/prompts/)

## Dual LLM paths per interview turn

1. Client streaming chat (`/interview/chat`) for spoken questions
2. `/session/evaluate` + follow-up for scoring decisions

Do not add a third planner call from the client.
