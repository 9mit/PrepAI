# Interview engine

1. Setup → `/session/start` with role, JD, resume, mode, domain pack
2. Browser STT + Piper/browser TTS
3. Each answer → `/session/evaluate` with real `filler_ratio`
4. Follow-up / retry / advance per score bands
5. End → `/interview/analyze` → `interview_history` localStorage

Silence commit: 3200ms ([`hooks/useInterviewTurnMachine.ts`](../hooks/useInterviewTurnMachine.ts)).

Shortcuts: Space barge-in, Esc Leave, Ctrl+E End.
