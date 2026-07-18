# Scoring

## Session evaluate (per answer)

Pydantic `AnswerScore`: accuracy, depth, clarity, confidence (0–100).

Bands on average of four metrics:

- ≥80 → advance (challenge follow-up optional when strong streak)
- 50–79 → probe follow-up
- &lt;50 → hint + retry

## Final report formula (official)

`(accuracy*0.35 + depth*0.25 + adaptability*0.20 + speed*0.10 + confidence*0.10) / 100 * 10000`, clamped [1, 10000].

Frontend approximation: [`services/scoring.ts`](../services/scoring.ts).

Analyze categories: Communication, Role Knowledge, Problem Solving, Cultural Fit, Confidence — plus coach fields (better/excellent answers, tips, mistakes).
