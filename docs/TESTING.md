# Testing

## Frontend

```bash
npm test
npx tsc --noEmit
```

Suite: [`services/hardening.test.ts`](../services/hardening.test.ts) (scoring, voice, packs, skill profile, seats).

## Backend

Add `pytest` when ready. Smoke ideas: `/health`, scoring helpers in `services/report.py`. Run API from `backend/` with `uvicorn main:app`.
