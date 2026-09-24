# Launch checklist

- [ ] Setup → Leave returns Home without errors
- [ ] Setup → full interview → End → Analytics coach cards
- [ ] Adaptive quiz completes; telemetry shows `quiz_complete`
- [ ] No console errors on happy path
- [ ] Mobile: setup chips wrap; Analytics search usable
- [ ] Keyboard: Space / Esc / Ctrl+E
- [ ] Offline banner appears when network offline
- [ ] ErrorBoundary recovers from thrown UI error
- [ ] Feedback form on Profile submits
- [ ] Diagnostics export contains no transcripts/PII
- [ ] Privacy + Terms reachable from footer
- [ ] `PREPAI_JWT_SECRET` set in production (or accept ephemeral secret on Spaces)
- [ ] HF Space: `/health` ok, `/feedback` works, iframe loads ([HF_SPACES.md](HF_SPACES.md))
- [ ] `npm test` and `npx tsc --noEmit` green
