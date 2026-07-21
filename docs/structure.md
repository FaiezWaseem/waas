# WaaS Project Structure

**WaaS** (WhatsApp Automation as a Service) is a monorepo with a Next.js frontend and an Express/Baileys backend. Clients connect WhatsApp numbers, bind AI agents, manage chats, run campaigns, and expose a developer API.

---

## Top-level layout

```
waas/
├── client/                 # Next.js 16 frontend (TypeScript)
├── server/                 # Node.js Express backend (JavaScript)
├── docs/                   # Project documentation
│   ├── structure.md        # This file
│   └── flow.md             # Application flows
└── README.md
```

| Path | Role |
|------|------|
| `client/` | Marketing site, auth UI, client & admin dashboards |
| `server/` | API, WhatsApp sessions, AI replies, campaigns, billing data |
| `docs/` | Architecture and flow notes |

---

## Client (`/client`)

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Axios, Socket.io Client, Framer Motion, Radix/shadcn-style UI, JWT via `jose` in middleware.

### Directory map

```
client/
├── public/                      # Static assets, sample campaign CSVs
├── src/
│   ├── app/                     # App Router pages & API routes
│   │   ├── page.tsx             # Marketing landing
│   │   ├── about/, blog/, contact/, pricing/
│   │   ├── login/, register/
│   │   ├── api/
│   │   │   ├── [...path]/route.ts   # Catch-all proxy → backend
│   │   │   ├── auth/login/           # Sets httpOnly JWT cookie
│   │   │   ├── auth/logout/
│   │   │   └── contact/
│   │   └── dashboard/
│   │       ├── page.tsx         # Role picker (demo)
│   │       ├── admin/           # Admin console
│   │       │   ├── page.tsx
│   │       │   ├── users/
│   │       │   ├── subscriptions/
│   │       │   ├── payment-methods/
│   │       │   └── blogs/
│   │       └── client/          # Tenant dashboard
│   │           ├── page.tsx     # Overview / stats
│   │           ├── agents/      # Sessions, connect, prompts
│   │           ├── chats/
│   │           ├── campaigns/
│   │           ├── templates/
│   │           ├── developers/  # API keys
│   │           ├── subscription/
│   │           └── settings/
│   ├── components/
│   │   ├── dashboard/           # Shell, Sidebar, Header
│   │   ├── marketing/           # Navbar, Footer
│   │   └── ui/
│   ├── lib/
│   │   ├── api.ts               # Axios client (baseURL `/api`)
│   │   └── utils.ts
│   └── middleware.ts            # JWT cookie guard + role redirects
└── package.json
```

### Client routes (user-facing)

| Area | Paths | Audience |
|------|--------|----------|
| Marketing | `/`, `/about`, `/blog`, `/blog/[id]`, `/contact`, `/pricing` | Public |
| Auth | `/login`, `/register` | Public (redirect if logged in) |
| Client app | `/dashboard/client/*` | Role `user` |
| Admin app | `/dashboard/admin/*` | Role `admin` |

### API proxy pattern

- Browser calls `axios` with `baseURL: '/api'`.
- Next.js `app/api/[...path]/route.ts` forwards to `BACKEND_URL` (default `http://localhost:4000`).
- Cookie `token` is attached as `Authorization: Bearer …`.
- Login (`/api/auth/login`) is special: talks to backend, then sets an **httpOnly** cookie (8h).

### Auth on the client

- **Middleware** (`middleware.ts`): protects `/dashboard/*`; verifies JWT with `JWT_SECRET`; enforces admin vs client path by `role`.
- **401 interceptor** in `lib/api.ts` redirects to `/login`.

---

## Server (`/server`)

**Stack:** Express, Socket.io, `@whiskeysockets/baileys`, better-sqlite3 (default) or MySQL, bcrypt, JWT, OpenAI-compatible AI, multer, uuid.

### Directory map

```
server/
├── index.js                 # App entry: routes, Socket.io, listen
├── data/waas.sqlite         # Default SQLite DB
├── sessions/                # Baileys multi-file auth per session id
├── uploads/                 # Avatars, agent docs
└── src/
    ├── db.js                # SQLite/MySQL pool + schema init
    ├── auth.js              # Register, login, JWT middleware
    ├── connectionManager.js # WhatsApp sockets, AI reply pipeline
    ├── agents.js            # Agent CRUD, knowledge, bind-session
    ├── ai.js                # Multi-provider chat completions
    ├── campaigns.js         # Bulk messaging + CSV/JSON import
    ├── templates.js         # User message templates (HTTP)
    ├── message_templates.js # Builtin templates + variable fill
    ├── client.js            # Client dashboard stats
    ├── admin.js             # Admin stats, users, subscriptions
    ├── subscriptions.js
    ├── payment_methods.js
    ├── api_keys.js
    ├── v1_api.js            # Public developer API (`/v1`)
    ├── webhooks.js          # Webhook CRUD + signed async delivery
    ├── webhooks_routes.js   # JWT webhook routes for dashboard
    ├── middleware/api_auth.js
    ├── userService.js       # Plans, usage, limits
    ├── alerts.js            # Quota alert notification hooks
    ├── blog.js
    ├── cron.js              # Subscription roll + campaign worker
    └── seed.js
```

### HTTP surface (backend)

| Prefix / path | Auth | Module |
|---------------|------|--------|
| `GET /health` | None | `index.js` |
| `POST /auth/register`, `POST /auth/login` | None | `auth` |
| `GET /public/plans` | None | `index.js` |
| `/blog` | Mixed | `blog.js` |
| `/me`, `/me/avatar` | JWT | `index.js` |
| `/sessions`, `/sessions/:id/*` | JWT | `index.js` + manager |
| `/agents` | JWT | `agents.js` |
| `/client` | JWT | `client.js` |
| `/campaigns` | JWT | `campaigns.js` |
| `/templates` | JWT | `templates.js` |
| `/subscriptions` | JWT | `subscriptions.js` |
| `/payment-methods` | JWT | `payment_methods.js` |
| `/api-keys` | JWT | `api_keys.js` |
| `/admin/*` | JWT + admin | `admin.js` + plans in `index.js` |
| `/v1/*` | API key | `v1_api.js` (messages, sessions, agents, AI, webhooks, campaigns) |
| `/webhooks` | JWT | `webhooks_routes.js` (dashboard webhook CRUD) |
| `GET /uploads/*` | Static | multer files |

Default port: **4000** (falls through to next free port if busy).

### Core domain modules

| Module | Responsibility |
|--------|----------------|
| `connectionManager.js` | Create/restore/delete WhatsApp sessions; QR/status via Socket.io; inbound message → AI reply; handoff; chat list/messages |
| `agents.js` | Agent CRUD; system prompt / provider / model; Q&A memory; document upload; bind agent to session |
| `ai.js` | OpenAI, Claude, Gemini, DeepSeek, OpenAI-compatible endpoints |
| `campaigns.js` | Campaigns, contacts, rate-limited send runner |
| `userService.js` | Plan resolution and usage counters (messages, chats, sessions) |
| `webhooks.js` | User webhooks for `message.incoming`, session QR/status, HMAC delivery |
| `cron.js` | Hourly subscription period roll; campaign processing interval from `CAMPAIGN_RECIPIENTS_PER_HOUR` |
| `db.js` | Schema for users, agents, sessions, messages, plans, subscriptions, usage, campaigns, handoffs, summaries, API keys, webhooks, etc. |

### Runtime data on disk

| Path | Contents |
|------|----------|
| `server/data/waas.sqlite` | Primary DB when `DB_TYPE=sqlite` |
| `server/sessions/<sessionId>/` | Baileys credentials (`creds.json`, …) |
| `server/uploads/` | Profile avatars, agent documents |

---

## Data model (conceptual)

```
users ──┬── agents ── agents_meta
        │      ├── agent_memory
        │      └── agent_documents
        ├── sessions ── messages
        │      ├── chat_handoffs (per chat JID: ai | human)
        │      └── chat_summaries
        ├── subscriptions ── plans
        ├── usage
        ├── invoices
        ├── campaigns ── campaign_contacts
        ├── message_templates
        ├── api_keys
        └── notification_hooks
```

**Roles:** `user` (client) and `admin`.

**Plans:** enforce `max_sessions`, `max_agents`, `max_messages`, `max_chats` ( `-1` often treated as unlimited in limit checks).

---

## Configuration

### Server (typical env)

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default 4000) |
| `JWT_SECRET` | JWT signing (must match client middleware) |
| `DB_TYPE` | `sqlite` (default) or `mysql` |
| `SQLITE_FILE` / MySQL `DB_*` | DB location/credentials |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | Default AI |
| `CAMPAIGN_RECIPIENTS_PER_HOUR` | Campaign send rate |

### Client (typical env)

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | Server origin for API proxy |
| `JWT_SECRET` | Same as server for middleware verification |

---

## How the two apps connect

```
Browser  →  Next.js (:3000)
              │  /api/* proxy + cookie→Bearer
              ▼
            Express (:4000)
              │  Baileys sessions
              ▼
            WhatsApp multi-device
              │  Socket.io (QR, status)
              ▲
Browser  ←────┘  (join_session rooms)
```

---

## Notable implementation details

1. **Session ↔ agent binding** drives auto-replies; `sessions.ai_enabled` can mute AI without unbinding.
2. **Human handoff** is per chat JID (`chat_handoffs.mode`: `ai` | `human`), with optional admin phone escalation.
3. **Conversation memory:** last ~15 messages + rolling `chat_summaries` for older history.
4. **Developer API** uses hashed API keys (`api_keys`) and `/v1` routes, separate from dashboard JWT.
5. **DB abstraction** accepts Postgres-style `$1` placeholders; SQLite and MySQL adapters normalize them.
6. **CORS** on the server is open (`origin: '*'`); browser auth relies on the Next proxy + cookies rather than cross-origin credentials.
