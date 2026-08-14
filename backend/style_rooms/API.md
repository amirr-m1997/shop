# Style Rooms — API contract (frontend integration)

Backend prefix: `/api/style-rooms/`. Auth: `Authorization: Token <key>` (authenticated only).
Error responses are `{"error": "<fa message>"}` with the documented HTTP status.

## Response shape families — read this first

Almost every endpoint returns one of **two shapes**. A client must branch on them:

| Family | Looks like | Endpoints |
|---|---|---|
| **Room resource** | a full room JSON object (see below) | `POST /` , `GET /`, `GET /{pk}/`, `PATCH/PUT /{pk}/`, `POST /{pk}/join/` |
| **`{"status": ...}` (action ack)** | `{"status":"ok", ...}` | `POST /{pk}/leave/`, `DELETE /{pk}/members/{user_id}/`, `DELETE /{pk}/items/{item_id}/` |
| **Empty 204** | no body | `DELETE /{pk}/` (room delete) |
| **Token object** | `{"token": "...", "expires_at": "..."}` | `POST /{pk}/invite/` (owner) |
| **Paginated list** | `{"count":n,"next":..,"previous":..,"results":[...]}` | `GET /`, `GET /{pk}/members/`, `GET /{pk}/items/`, `GET /{pk}/activity/` |
| **Single nested object** | affect/member/item JSON (not the room) | `POST /{pk}/members/` → member, `POST /{pk}/items/` → item |

- `join` → **room resource** (201 when newly joined, 200 when already a member). Do **not** gate on a `join_status` field — it does not exist.
- Direct invite (`POST /{pk}/members/`) → member object (`{id, user, role, joined_at}`), 201 if created / 200 idempotent, 400 if already a member.
- Room `DELETE` returns 204 with **no body** — treat it as success if `response.status === 204`, NOT by reading a JSON body.

## Endpoints

| Method | Path | Permission | Request body | Success |
|---|---|---|---|---|
| POST | `/api/style-rooms/` | any auth | `{title, description?, cover?, visibility?}` | **201 room** |
| GET | `/api/style-rooms/` | any auth (my rooms) | — | **200 paginated rooms** |
| GET | `/api/style-rooms/{pk}/` | member | — | **200 room**; non-member → 404 |
| PATCH/PUT | `/api/style-rooms/{pk}/` | owner | `{title?, description?, cover?, visibility?}` | **200 room** |
| DELETE | `/api/style-rooms/{pk}/` | owner | — | **204 no body** |
| POST | `/api/style-rooms/{pk}/invite/` | owner | `{}` | **200 `{token, expires_at}`** (rotates old token) |
| POST | `/api/style-rooms/{pk}/join/` | any auth | `{token}` | **201/200 room** |
| POST | `/api/style-rooms/{pk}/leave/` | member (not owner) | `{}` | **200 `{status:"ok", left:true}`** |
| GET | `/api/style-rooms/{pk}/members/` | member | — | **200 paginated members** |
| POST | `/api/style-rooms/{pk}/members/` | owner (direct invite) | `{user_id}` or `{username}` | **201/200 member** |
| DELETE | `/api/style-rooms/{pk}/members/{user_id}/` | owner | — | **200 `{status:"ok", removed:true}`** (owner removal → 400) |
| GET | `/api/style-rooms/{pk}/items/` | member | — | **200 paginated items** |
| POST | `/api/style-rooms/{pk}/items/` | member | `{product_id}` | **201 item** |
| DELETE | `/api/style-rooms/{pk}/items/{item_id}/` | owner or adder | — | **200 `{status:"ok", removed:true}`** |
| GET | `/api/style-rooms/{pk}/activity/` | member | — | **200 paginated events** |

## Key payload shapes

**Room** (`create`, `list`, `retrieve`, `update`, `join`):
```
owner (PublicUser), title, description, cover,
visibility ('private'|'invite_only'),
member_count (total), item_count (total),
is_owner (bool), my_role ('owner'|'member'|null),
created_at, updated_at
```
- `member_count`/`item_count` are **room totals**, not caller-scoped.
- `my_role` is the caller's role; `is_owner` is `my_role === 'owner'`. Prefer `my_role` over owner-vs-me comparisons.
- Access is membership-based in **both** `visibility` modes (the flag is informational only).

**Item** (`GET/POST /items/`): `id, product, added_by, is_unavailable, created_at`.
- `product` is the live `ProductListSerializer` payload (current price/images/brand — no price snapshot is stored) including `is_active`.
- `is_unavailable` = item's product has been deactivated (`product.is_active === false`). Distinguish:
  - `is_unavailable===true` + `product.is_active===false` → **deactivated product**, still in the room.
  - `is_unavailable===false` → available.
  - product **missing** from the items list → the product was hard-deleted (the room item is cascade-deleted) — it never returns `is_unavailable:true`.

**Member** (`POST /members/`, items of `GET /members/`): `id, user, role, joined_at`.

**Event** (`GET /activity/`): `id, type, actor, payload, created_at`.

**Pagination**: `page_size` (default 20, `?page_size=` up to 100) is used by `GET /`, `GET /{pk}/members/`, `GET /{pk}/items/`, `GET /{pk}/activity/`.

## Direct invite vs self-service join

- **Direct invite** (`POST /{pk}/members/`, owner only): immediately creates a membership (and a chat `Notification`). Give the owner a "add member" control; target by `user_id` or exact `username`.
- **Self-service join** (`POST /{pk}/invite/` → share `token`; `POST /{pk}/join/`): owner generates a one-time token (rotates any previous token; `expires_at`; `10/hour` throttled). The visitor proves the token and becomes a member.
- Security: non-members get a uniform **404** on all `{pk}` reads/writes except `invite`/`join` (so UUIDs are not enumerable); owner-only actions are 403 for non-owners.