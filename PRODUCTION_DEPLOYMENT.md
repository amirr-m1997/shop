# Production Deployment Checklist

Realtime relies on Django Channels over an ASGI server, Redis channel layer, and
Cookie-based auth. REST remains authoritative; the channel layer holds only
ephemeral group/presence state. Tick every item before shipping.

## 1. Redis
- [ ] `CHANNELS_REDIS_URL` is set (e.g. `redis://:password@host:6379/0`).
  - Empty value falls back to `InMemoryChannelLayer` — works only for a single
    dev process. **Without Redis, realtime will not fan out across workers.**
  - The layer is configured with `capacity=1000`, `expiry=60`,
    `group_expiry=86400` (backend/shop/settings.py).
- [ ] The **same Redis instance/db** is reachable from every ASGI worker (group
    membership must be shared), and Redis is not shared with anything that could
    evict channel-layer keys.
- [ ] `REDIS_URL` is set for Django caches. When empty, `CACHES` falls back to
    `LocMemCache` (per-process) — acceptable for cache only, not for state shared
    between workers.
- [ ] Verify with `manage.py check` — it logs a warning when `CHANNELS_REDIS_URL`
    is missing.

## 2. CORS / Origins
- [ ] `CORS_ALLOWED_ORIGINS` includes every real frontend origin
    (comma-separated, e.g. `https://shop.example.com`). No wildcards —
    `CORS_ALLOW_CREDENTIALS = True`.
- [ ] `CSRF_TRUSTED_ORIGINS` mirrors the same list.
- [ ] `ALLOWED_HOSTS` includes the backend host(s).
- [ ] WS origins are enforced by `TokenAuthMiddleware` using the same origin
    allowlist — add the production origin to `CORS_ALLOWED_ORIGINS` or the
    socket will close with 4404/4403.

## 3. `shop_auth` cookie
- [ ] `AUTH_TOKEN_COOKIE_SECURE = not DEBUG` → set `DEBUG=False` in production so
    the cookie is `Secure` (sent only over HTTPS).
- [ ] `AUTH_TOKEN_COOKIE_HTTPONLY = True` (always; set in views.py).
- [ ] `AUTH_TOKEN_COOKIE_SAMESITE` defaults to `Lax` — safe when the frontend and
    backend share the site. If the frontend is a **separate origin** (cross-site),
    `Lax` will not be sent on the WS upgrade handshake; use the `token.<key>`
    subprotocol fallback instead (never put the token in the URL).
- [ ] `AUTH_TOKEN_COOKIE_MAX_AGE` (default 14 days) matches the desired session
    lifetime.
- [ ] Cookie is scoped `path=/` and never exposed to JS.

## 4. ASGI / WebSocket proxy
- [ ] Serve the app with an **ASGI** server (`daphne`, `uvicorn`, or `hypercorn`)
    against `shop.asgi.application` — Channels consumers do not run under
    `gunicorn`/WSGI.
- [ ] Terminate TLS at the reverse proxy and set
    `TRUST_PROXY_HEADERS=True` so `SECURE_PROXY_SSL_HEADER` is honored
    (backend/shop/settings.py).
- [ ] nginx `location /ws/`:
  - [ ] `proxy_pass http://<asgi-upstream>;`
  - [ ] `proxy_http_version 1.1;`
  - [ ] `proxy_set_header Upgrade $http_upgrade;`
  - [ ] `proxy_set_header Connection "upgrade";`
  - [ ] `proxy_set_header Host $host;`
  - [ ] `proxy_read_timeout` raised (>= 60s, matching the 30s heartbeat).
  - [ ] Vite dev proxy already maps `/ws` → `ws://localhost:8000` (frontend/vite.config.js).
- [ ] Run **all** workers with the same `CHANNELS_REDIS_URL` so sockets can
    address each other's groups.

## 5. Monitoring / resilience
- [ ] The client heartbeats every 30s and reconnects with backoff (max 30s); the
    server closes idle sockets after 60s (close 4408). A WS-capable health check
    (or at least `/api/health`) is recommended.
- [ ] Realtime is best-effort: `group_send` errors are swallowed and pages fall
    back to REST polling. Do not treat channel-layer failures as data loss.
- [ ] Rate limits and connection caps apply (5 sockets/user; 60 msg/min) — tune
    via `REALTIME` settings in backend/shop/settings.py.