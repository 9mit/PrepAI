# Domain packs

Data module: [`services/domainPacks.ts`](../services/domainPacks.ts).

Each pack: `plannerHints`, `scoringFocus`, `followUpStrategy`, `rubricBullets`.

Field aliases via `FIELD_TO_PACK` (Technology / Business / Finance / Marketing / HR).

Pack id is sent on session start and analyze; FE injects pack block into system prompt.
