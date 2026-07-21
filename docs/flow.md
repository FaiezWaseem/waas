# WaaS Application Flow

This document describes how requests and messages move through the system: auth, dashboards, WhatsApp connection, AI replies, campaigns, and the developer API.

---

## 1. High-level architecture

```
┌─────────────┐     cookie JWT      ┌──────────────┐     Bearer JWT      ┌─────────────┐
│   Browser   │ ──────────────────► │  Next.js     │ ──────────────────► │  Express    │
│  (UI)       │ ◄── Socket.io ───── │  :3000       │                     │  :4000      │
└─────────────┘     (often direct   └──────────────┘                     │             │
                     to backend)                                          │ Connection  │
                                                                          │ Manager     │
                                                                          │ (Baileys)   │
                                                                          └──────┬──────┘
                                                                                 │
                                                                                 ▼
                                                                          WhatsApp MD
```

- **UI → API:** almost all REST goes through Next `/api` proxy so the httpOnly token never needs to be readable by JS for most calls.
- **Realtime:** Socket.io on the backend pushes QR codes and connection status to clients joined to `session:<id>`.

---

## 2. Authentication flow

### Register

```
User → POST /api/auth/register (or proxied /auth/register)
     → server auth.createUser (bcrypt hash, role default "user")
     → { user }
```

After register, the client typically logs in separately (login sets the cookie).

### Login

```
1. Browser POST /api/auth/login { email, password }
2. Next route → POST {BACKEND}/auth/login
3. Server: bcrypt compare → JWT { sub: userId, role } expires 8h
4. Next sets httpOnly cookie "token" (same 8h, SameSite=lax)
5. Response body: { user } (id, email, role, name)
6. Client often stores non-sensitive user snapshot in localStorage for UI
```

### Route protection (Next middleware)

| Path | Behavior |
|------|----------|
| `/dashboard/*` | Require valid `token` cookie; invalid → `/login` |
| `/dashboard/admin/*` | `role === "admin"` else redirect to client dashboard |
| `/dashboard/client/*` | Admin users redirected to admin dashboard |
| `/login`, `/register` | If valid token, redirect to role-appropriate dashboard |

### API calls after login

```
Browser: api.get('/sessions')  →  /api/sessions
Next proxy: reads cookie → Authorization: Bearer <token>
Express: auth.verifyToken → req.user = { sub, role }
```

### Logout

```
POST /api/auth/logout → clears cookie → client clears localStorage → /login
```

### Admin vs client

- **Admin:** users, subscriptions, payment methods, blog CMS, global stats.
- **Client:** agents/sessions, chats, campaigns, templates, developers (API keys), subscription, settings.

---

## 3. Client onboarding (happy path)

```
Register / Login
      │
      ▼
Dashboard (stats: messages, credits, agents, sessions)
      │
      ▼
Agents → Connect New Session
      │
      ├─ POST /sessions  → create DB row + Baileys socket
      ├─ Socket join_session(sessionId)
      ├─ Receive QR → scan with WhatsApp Linked Devices
      └─ status → open / active
      │
      ▼
Create / configure Agent
  (name, system prompt, provider, model, API key,
   excluded numbers, human handoff phone,
   Q&A memory, documents)
      │
      ▼
Bind agent to session + enable AI
  (PATCH /sessions/:id or POST /agents/:id/bind-session)
      │
      ▼
Inbound WhatsApp messages auto-answered by AI
```

---

## 4. WhatsApp session lifecycle

### Create session

```
POST /sessions  { agentId? }
  → reserveSessionSlot (plan max_sessions)
  → INSERT sessions (status=init, auth_path=./sessions/<id>)
  → ConnectionManager._initSocket(id)
  → return { id, status, qr: null }
```

### Connect (QR)

```
Baileys connection.update
  ├─ qr present → save to DB + io.to(`session:${id}`).emit('qr', …)
  ├─ connection open → status active/open, store phone_number, contact_name
  └─ connection close
        ├─ not logged out → reconnect after 3s
        └─ logged out → wipe auth folder, status init, re-init for new QR
```

### Restore on server start

```
db.init()
  → manager.restoreSessions()
  → for each row in sessions: _initSocket(...)
```

Auth files under `server/sessions/<id>/` allow reconnect without a new QR when credentials are still valid.

### Session operations

| Action | Endpoint | Effect |
|--------|----------|--------|
| List | `GET /sessions` | DB + live status overlay |
| Detail | `GET /sessions/:id` | Ownership check, QR, message count |
| Bind agent / AI toggle | `PATCH /sessions/:id` | Updates DB + in-memory map |
| Logout WA | `POST /sessions/:id/logout` | Baileys logout / reset to init |
| Delete | `DELETE /sessions/:id` | Close socket, delete DB (+ linked agent), remove auth dir |

---

## 5. Inbound message → AI reply (core automation)

Triggered by Baileys `messages.upsert` inside `connectionManager`.

```
Incoming WA message (not fromMe)
        │
        ▼
Extract text (conversation / extendedText)
        │
        ▼
Persist messages row (direction=in)
        │
        ▼
Gate checks (any fail → no AI reply)
  • session.aiEnabled !== false
  • session has agent_id
  • chat_handoffs.mode !== 'human'
  • user has active plan
  • under max_messages / max_chats
  • sender not in agent excluded_numbers
        │
        ▼
Load agent + meta + Q&A memory + document text
  → apply WhatsApp style guide to system prompt
        │
        ▼
Build context
  • last ~15 messages as chat turns
  • older messages → chat_summaries (LLM summary if stale)
        │
        ▼
sendPresenceUpdate('composing')
  → ai.chatCompletion(provider, model, …)
        │
        ▼
Optional escalation detector (keyword prefilter + LLM JSON)
  → if shouldEscalate: message admin phone, set handoff human
        │
        ▼
Send reply to customer (if any)
  → persist direction=out
  → increment usage.messages_count
sendPresenceUpdate('paused')
```

### Human handoff

- **Auto:** escalation detector + `human_handoff_phone` on the agent.
- **Manual:** `PATCH /sessions/:id/chats/:chatId/control` with `{ mode: "ai" | "human", note }`.
- While `mode === "human"`, AI will not answer that chat JID until switched back to `ai`.

### Manual messaging from dashboard

```
POST /sessions/:id/chats/:chatId/messages  { text }
  → ownership check
  → manager.sendMessage(...)
```

Used for live operator replies while handoff is human (or anytime).

---

## 6. Agents flow

```
POST /agents
  → plan max_agents check
  → agents + agents_meta (prompt, provider, model, keys, exclusions, handoff phone)

POST /agents/:id/run  { messages }
  → test completion with knowledge base (no WhatsApp)

POST /agents/:id/bind-session  { sessionId }
  → sessions.agent_id + live memory update

Memory / docs:
  agent_memory (Q&A pairs)
  agent_documents (uploaded files, extracted_text injected into prompt)
```

---

## 7. Campaigns flow

```
Create campaign (name, session_id, message_template)
        │
        ▼
Import contacts (CSV / JSON) → campaign_contacts (pending)
        │
        ▼
Status → ready / running
        │
        ▼
cron processCampaigns (interval from CAMPAIGN_RECIPIENTS_PER_HOUR)
  → pick ready campaigns
  → for pending contacts: format {{name}}, {{phone}}, {{email}}
  → send via bound session's Baileys socket
  → mark contact send_status
  → stop / complete when done or status=stopped
```

Templates for ad-hoc sends also exist under **Templates** and the **v1** API (`template_id` + variables).

---

## 8. Subscriptions, limits, and billing data

```
plans ── max_sessions, max_agents, max_messages, max_chats, price_monthly
   │
subscriptions ── period_start / period_end per user
   │
usage ── messages_count, chats_count, sessions_count for the period
```

**Enforcement points:**

| Resource | Where checked |
|----------|----------------|
| Concurrent sessions | `reserveSessionSlot` on create |
| Agents | `agents.js` / legacy create in `index.js` |
| AI replies | inbound handler before reply |
| Developer API sends | `checkMessageLimit` + post-send increment |

**Cron (`cron.js`):**

- Every hour: roll expired subscription periods, seed next period usage, stub invoice from prior usage.
- High-frequency interval: process campaign sends.

**Quota alerts:** `alerts.notifyUser` via registered `notification_hooks` when limits are exceeded.

---

## 9. Developer API (`/v1`)

Separate from dashboard JWT.

```
Client  Authorization: Bearer <api_key>
     → middleware hashes key (sha256), loads user
     → attaches req.user.sub, plan limit, current usage
     → routes in v1_api.js
```

### Sessions & AI (API connect flow)

```
POST /v1/sessions  { agent_id?, ai_enabled? }
  → create Baileys session
  → GET /v1/sessions/:id  (poll for qr / status)
  → or subscribe to webhooks: session.qr, session.status

PATCH /v1/sessions/:id
PATCH /v1/sessions/:id/ai
  → agent_id, ai_enabled
  → optional agent prompt/provider/model updates

POST /v1/agents
PATCH /v1/agents/:id
POST /v1/agents/:id/bind-session
```

### Messaging

```
POST /v1/messages
  { session_id, to, type, text | url, template_id?, variables? }
  → ownership of session
  → send via ConnectionManager
  → increment message usage
  → optional message.outgoing webhook
```

### Real-time webhooks

```
POST /v1/webhooks  { url, secret?, events[] }
  events: message.incoming | message.outgoing | session.status | session.qr

On WhatsApp inbound:
  persist message
  → dispatch message.incoming to matching webhooks (async)
  → if agent.webhook_url set, also POST there
  → then built-in AI path (if ai_enabled and agent bound)

Payload headers:
  X-WaaS-Event, X-WaaS-Delivery, X-WaaS-Signature (sha256 HMAC when secret set)
```

Dashboard JWT also manages hooks at `/webhooks` (Developers UI).

API keys are created/managed under the client **Developers** page (`/api-keys`).

---

## 10. Admin flows

```
Login as role=admin
  → /dashboard/admin
  → /admin/stats, /admin/users, /admin/subscriptions
  → payment methods CRUD
  → blog posts CRUD
  → plan management (/admin/plans)
```

Admin cannot use the client dashboard routes (middleware redirects).

---

## 11. Marketing / public site

| Page | Data source |
|------|-------------|
| Landing, about, pricing | Mostly static + `GET /public/plans` for pricing |
| Blog list/detail | `/blog` backend |
| Contact | Next `/api/contact` (email via nodemailer-style route) |

No WhatsApp connection is required for the public site.

---

## 12. Realtime Socket.io contract

**Server rooms:** `session:<sessionId>` after client emits `join_session`.

| Event | Direction | Payload (conceptual) |
|-------|-----------|----------------------|
| `join_session` | Client → Server | sessionId |
| `qr` | Server → Client | `{ sessionId, qr }` |
| `status` | Server → Client | `{ sessionId, status }` |

QR strings are also persisted on the session row so a refresh can still show connect state via REST.

---

## 13. End-to-end sequence: first automated reply

```
1. User logs in → cookie set
2. User creates session → QR via socket
3. User scans QR → session active
4. User creates agent with prompt + model
5. User binds agent; enables ai_enabled
6. Customer texts WhatsApp number
7. Baileys upsert → DB in-message → AI → WA out-message → DB out-message
8. User sees thread under Chats (from messages table)
9. If customer says "talk to human" (and handoff phone set):
   admin gets WA ping; chat switches to human mode; AI stops until reset
```

---

## 14. Error / edge cases worth knowing

- **No plan:** AI path logs and skips reply (messages still stored).
- **Quota exceeded:** no AI reply; optional webhook alert.
- **AI provider failure:** typing paused; error logged; no outbound text.
- **Session delete:** associated agent may be deleted with the session.
- **Port in use:** server tries `PORT+1`, etc.
- **Proxy failures:** Next catch-all returns 500 with proxy error log.
- **JWT secret mismatch** between client middleware and server causes dashboard redirects / 401s.

---

## 15. Quick reference: request paths from the browser

| UI intent | Browser path | Backend path |
|-----------|--------------|--------------|
| Login | `POST /api/auth/login` | `POST /auth/login` |
| Profile | `GET /api/me` | `GET /me` |
| Stats | `GET /api/client/stats` | `GET /client/stats` |
| Sessions | `GET/POST /api/sessions` | same under `/sessions` |
| Agents | `/api/agents` | `/agents` |
| Campaigns | `/api/campaigns` | `/campaigns` |
| Templates | `/api/templates` | `/templates` |
| API keys | `/api/api-keys` | `/api-keys` |
| Admin users | `/api/admin/users` | `/admin/users` |
| External integrations | (direct to server) | `/v1/*` with API key |
