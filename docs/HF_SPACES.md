# Hugging Face Spaces deployment

PrepAI ships as a **Docker Space** (SDK: `docker`, port **7860**). Root [`Dockerfile`](../Dockerfile) builds the Vite SPA and runs nginx + FastAPI + Redis via [`entrypoint.sh`](../entrypoint.sh).

## Space settings

| Setting | Value |
|---------|--------|
| SDK | Docker |
| Port | 7860 |
| App file | (none — Docker CMD) |

## Secrets (Space → Settings → Variables and secrets)

| Secret | Required | Notes |
|--------|----------|--------|
| `GROQ_API_KEY` | **Yes** | Server-side LLM |
| `PREPAI_JWT_SECRET` | Recommended | Long random string; if unset, entrypoint generates one per container restart (sessions reset) |
| `HUGGINGFACE_API_KEY` | Optional | Whisper STT via HF Inference |
| `FRONTEND_URL` | Optional | Auto-set from `SPACE_HOST` when on Spaces |
| `DISABLE_DOCS` | Optional | Defaults `true` in entrypoint |
| `TRUST_PROXY` | Optional | Defaults `true` on Spaces |

Do **not** put `GROQ_API_KEY` in the frontend. Leave `VITE_API_URL` empty (same-origin via nginx).

## Verify after deploy

1. `https://<your-space>.hf.space/health` → `{"status":"ok","redis":true}`
2. Open the Space UI → login / guest flow → Start interview
3. Feedback form on Profile (proxied at `/feedback`)
4. Confirm the app loads inside the HF iframe (CSP `frame-ancestors` allows huggingface.co)

## Local parity

```bash
cp .env.example .env   # set GROQ_API_KEY
docker compose up --build
# http://localhost:7860
```

## Notes

- In-memory rate limits are per container (fine for a single Space replica).
- Ephemeral JWT secrets invalidate guest tokens on Space restart — set `PREPAI_JWT_SECRET` for stability.
- See also [ENVIRONMENT.md](ENVIRONMENT.md) and [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).
