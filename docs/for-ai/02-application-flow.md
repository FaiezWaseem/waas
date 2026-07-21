# WaaS — Application Flow (for AI)

## Auth (dashboard)

1. `POST /auth/register` or login via Next `POST /api/auth/login`
2. Server returns JWT; Next sets httpOnly cookie `token` (8h)
3. Middleware protects `/dashboard/*` and enforces admin vs client routes
4. Proxied API calls attach `Authorization: Bearer <token>`

## Happy path (product)

1. Register / login  
2. Create WhatsApp **session** → scan QR (Socket.io `qr` / REST poll)  
3. Create **agent** (prompt, provider, model, handoff phone, exclusions)  
4. Bind agent + set `ai_enabled=true`  
5. Customer messages WhatsApp → optional **webhooks** → built-in **AI reply** (if enabled)  
6. Operator may set chat handoff `human` to pause AI for that JID  

## Inbound message pipeline

```
Baileys messages.upsert (not fromMe)
  → extract text
  → persist messages (direction=in)
  → dispatch message.incoming webhooks (always, even if AI off)
  → if !ai_enabled → stop
  → if no agent_id → stop
  → if chat_handoffs.mode === human → stop
  → plan quota checks
  → load agent meta + memory + docs + style guide
  → context: last ~15 msgs + chat_summaries for older
  → AI completion → send reply → persist out → message.outgoing webhook
  → optional admin escalation (human_handoff_phone)
```

## Session lifecycle

- Create → status init/connecting → QR → open/active  
- Disconnect (not logout) → reconnect  
- Logout → wipe creds, new QR  
- Server restart → `restoreSessions()` from DB + `sessions/<id>/` auth files  

## Limits (plans)

Enforced on: concurrent/created sessions, agent count, AI/API messages, unique chats.  
`-1` often means unlimited.

## Campaigns

Draft → import contacts → status `ready` → cron paced by `CAMPAIGN_RECIPIENTS_PER_HOUR` → send via session.

## Realtime (Socket.io)

- Client emits `join_session` with session id  
- Server emits `qr`, `status` to room `session:<id>`
