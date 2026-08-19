# Chat / Support / Style Rooms — production notes

These notes close phase 7. They are operational, not a rewrite of the domain.

## Redis is required in production

Two separate env vars:

| Variable | Used for | Fallback if empty |
|---|---|---|
| `REDIS_URL` | Django cache, REST throttles, WS send-budget, presence | LocMem in DEBUG / tests only |
| `CHANNELS_REDIS_URL` | Channels group fan-out | InMemoryChannelLayer in DEBUG / tests only |

`DEBUG=False` (and not `manage.py test`) refuses to start without a Redis cache. If realtime is enabled it also requires `CHANNELS_REDIS_URL`. LocMem would multiply every send-budget and throttle by the worker count; presence would also split per process.

Django's `RedisCache.incr` is `EXISTS` then `INCR`. If a send-budget key expires between those two calls, Redis can recreate the **old window** key with no TTL. That is a low-priority orphan-key leak, not a budget bypass: the window id is part of the key, so the next minute still starts at zero.

## ASGI, not WSGI, for sockets

- `ASGI_APPLICATION = shop.asgi.application`
- Serve with Daphne or Uvicorn (ASGI). Gunicorn/WSGI cannot terminate `/ws/...`.
- Frontend and nginx must proxy **`/ws/`** with `Upgrade` / `Connection`.
- Socket paths are `/ws/chat/user/<id>/`, `/ws/chat/private/<id>/`, `/ws/style-rooms/<uuid>/`, `/ws/support/conversations/<id>/`, `/ws/support/departments/<dept>/`.

## Concurrency that is already locked in code

- Style Room member cap: `select_for_update()` on the room row in `add_member` / `join_room`.
- Support claim: `select_for_update()` on the conversation row.
- Private send / receipts / delete: single service functions + `transaction.atomic`.
- Real concurrent join tests need PostgreSQL row locks; SQLite will not prove the race.

## Seen / Push / spam (do not regress)

- Seen is never implied by opening a page, fetching messages, or receiving a WS frame.
- Push is skipped when `presence_status(recipient) == 'online'`. Clicking a push does not mark seen.
- Duplicate text (≥ 8 chars, 15s), `Idempotency-Key`, 15-minute delete-for-everyone, 5 forward targets, 3 reports/day, half send budget for accounts younger than 7 days.

## Web Push

Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIM_EMAIL`. Without keys, subscriptions are stored but nothing is delivered. Delivery uses `pywebpush` when installed.

- HTTP `404` / `410` delete that subscription (`chat_push_stale`).
- HTTP `401` / `403` keep the subscription and log `chat_push_error` — those statuses can be a global VAPID misconfiguration.
- 5xx, timeouts and other transport errors keep the subscription.
- Push runs only after `transaction.on_commit`. Failures never roll back the Message.
- Push is skipped when `presence_status(recipient) == 'online'` (same helper the socket layer writes). `away` and `offline` are eligible.
- `chat_push_error` / `chat_push_stale` are WARNING. `chat_push_sent` / `chat_push_skipped` stay INFO so default production (root WARNING) is not flooded.

## CI: PostgreSQL lock test and Redis send-budget test

These two suites skip on SQLite / LocMem. Wire them to real services:

```yaml
# GitHub Actions sketch
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: shop_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ['5432:5432']
  redis:
    image: redis:7
    ports: ['6379:6379']
```

```bash
export SECRET_KEY=ci-secret DEBUG=True
export DB_NAME=shop_test DB_USER=postgres DB_PASSWORD=postgres DB_HOST=127.0.0.1
export REDIS_URL=redis://127.0.0.1:6379/0
python manage.py test style_rooms.tests_concurrency chat.tests_send_budget chat.tests_push
```

SQLite still runs the rest of the suite; the lock/budget cases report `skipped` there on purpose.
