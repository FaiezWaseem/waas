# WaaS — Overview & Structure (for AI)

WaaS (WhatsApp Automation as a Service) is a monorepo:

| Path | Role |
|------|------|
| `client/` | Next.js 16 App Router, TypeScript, Tailwind — marketing site + dashboards |
| `server/` | Express + Baileys + Socket.io — WhatsApp, AI replies, campaigns, developer API |
| `docs/` | Human + AI documentation |

## Stack

- **Frontend:** Next.js 16, React 19, Axios (`baseURL: /api`), JWT cookie auth, Socket.io client
- **Backend:** Express on port **4000** (default), SQLite (`better-sqlite3`) or MySQL, `@whiskeysockets/baileys`, multi-provider AI (OpenAI-compatible, Claude, Gemini, DeepSeek)
- **Auth:** Dashboard uses httpOnly cookie `token` (JWT 8h). Developer API uses `Authorization: Bearer sk_live_...` (API keys hashed SHA-256)

## Request path (dashboard)

```
Browser → Next.js :3000 /api/* → proxy adds Bearer from cookie → Express :4000
```

Developer integrations should call the **backend base URL** directly (e.g. `http://localhost:4000/v1/...`), not the Next proxy.

## Roles

- `user` — client dashboard `/dashboard/client/*`
- `admin` — admin dashboard `/dashboard/admin/*`

## Core entities

```
users → agents (+ agents_meta, agent_memory, agent_documents)
      → sessions (WhatsApp Baileys; agent_id, ai_enabled)
      → messages
      → subscriptions / plans / usage
      → campaigns / campaign_contacts
      → message_templates
      → api_keys
      → webhooks
      → chat_handoffs, chat_summaries
```

## Important modules (server)

| File | Responsibility |
|------|----------------|
| `connectionManager.js` | Sessions, QR, inbound AI pipeline, webhooks dispatch |
| `agents.js` | Agent CRUD (JWT) |
| `ai.js` | LLM providers |
| `v1_api.js` | Developer REST API |
| `webhooks.js` | User webhook CRUD + signed delivery |
| `campaigns.js` | Bulk outbound |
| `userService.js` | Plan limits & usage |

## Env highlights

**Server:** `PORT`, `JWT_SECRET`, `DB_TYPE`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `CAMPAIGN_RECIPIENTS_PER_HOUR`  
**Client:** `BACKEND_URL`, `JWT_SECRET` (must match server for middleware), `NEXT_PUBLIC_API_URL` (docs base URL)
