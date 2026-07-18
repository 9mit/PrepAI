# PrepAI — single HF Spaces container: SPA + FastAPI + Redis behind nginx :7860
FROM node:18-alpine AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Same-origin API via nginx reverse proxy
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    redis-server \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-build /app/dist /app/dist
COPY nginx.conf /etc/nginx/conf.d/prepai.conf
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf 2>/dev/null || true \
    && printf 'user www-data;\nworker_processes auto;\npid /run/nginx.pid;\nevents { worker_connections 1024; }\nhttp {\n  include /etc/nginx/mime.types;\n  default_type application/octet-stream;\n  sendfile on;\n  keepalive_timeout 65;\n  include /etc/nginx/conf.d/*.conf;\n}\n' > /etc/nginx/nginx.conf

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh \
    && mkdir -p /tmp/prepai /var/log/nginx /var/lib/nginx /run \
    && sed -i 's/\r$//' /app/entrypoint.sh

ENV REDIS_URL=redis://127.0.0.1:6379
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["/app/entrypoint.sh"]
