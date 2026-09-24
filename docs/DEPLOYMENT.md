# Deployment

- Docker / HF Space: see root README frontmatter (`app_port: 7860`)
- **Hugging Face Spaces:** full checklist in [HF_SPACES.md](HF_SPACES.md)
- Set `PREPAI_JWT_SECRET` and `PREPAI_ENV=production` (or `ENVIRONMENT=production`)
- Redis via `REDIS_URL` for multi-process session memory
- Rate limits are in-memory — single instance only unless you add shared rate storage
- `DISABLE_DOCS=true` in production
