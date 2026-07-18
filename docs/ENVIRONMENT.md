# Environment variables

See [`.env.example`](../.env.example).

| Variable | Notes |
|----------|--------|
| `GROQ_API_KEY` | Required server-side |
| `REDIS_URL` | Session memory |
| `PREPAI_JWT_SECRET` | **Required** when `PREPAI_ENV`/`ENVIRONMENT` is production |
| `PREPAI_TOKEN_TTL_SEC` | Guest JWT TTL |
| `DISABLE_DOCS` | Hide OpenAPI |
| `TRUST_PROXY` | Client IP behind proxy |
| `VITE_API_URL` | Frontend API base (empty = same origin) |
| `VITE_USE_OLLAMA` | Quiz via Ollama |

Threat model: XSS on the origin can read localStorage (history, profiles). JWT is sessionStorage-only.
