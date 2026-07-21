# WaaS Developer API (for AI)

Use this document when integrating with WaaS via the **Developer API only**.

**Base URL:** `{BACKEND}` (example: `http://localhost:4000`)  
**Auth:** `Authorization: Bearer sk_live_...`  
Create keys in the dashboard: **Developers → API Keys**.  
Do **not** use the Next.js cookie/session proxy for these endpoints—call the backend directly.

---

## Authentication

```http
Authorization: Bearer sk_live_<your_key>
Content-Type: application/json
```

| Status | Meaning |
|--------|---------|
| 401 | Missing or invalid API key |
| 403 | Plan limit hit (messages, sessions, agents) |
| 404 | Resource not found or not owned by key owner |
| 400 | Validation error |
| 503 | WhatsApp session not active (send) |

---

## 1. Sessions — connect WhatsApp

### Create session

```http
POST /v1/sessions

{
  "agent_id": "optional-uuid",
  "ai_enabled": true
}
```

Returns `{ session: { id, status, qr, ... } }`.  
Poll `GET /v1/sessions/:id` until `qr` is set (or listen for webhook `session.qr`).  
User scans QR in WhatsApp → **Linked Devices**. Wait for `status` `open` / `active`.

### List / get

```http
GET /v1/sessions
GET /v1/sessions/:id
```

Session fields: `id`, `status`, `qr`, `phone_number`, `contact_name`, `agent_id`, `agent_name`, `ai_enabled`, `last_active`, `created_at`.

### Update AI binding

```http
PATCH /v1/sessions/:id

{
  "agent_id": "uuid-or-null",
  "ai_enabled": true
}
```

### Update session AI + agent config

```http
PATCH /v1/sessions/:id/ai

{
  "ai_enabled": true,
  "agent_id": "uuid",
  "system_prompt": "You are a helpful WhatsApp support agent.",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "api_key": null,
  "base_url": null,
  "excluded_numbers": "123,456",
  "human_handoff_phone": "+1234567890",
  "name": "Support Bot"
}
```

### Logout / delete

```http
POST /v1/sessions/:id/logout
DELETE /v1/sessions/:id
```

---

## 2. Agents — AI settings

### Create

```http
POST /v1/agents

{
  "name": "Support Bot",
  "webhook_url": null,
  "system_prompt": "You are a friendly support agent.",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "api_key": null,
  "base_url": null,
  "excluded_numbers": null,
  "human_handoff_phone": "+1234567890"
}
```

Providers: `openai`, `claude`, `gemini`, `deepseek`, `openai_compatible`.

### List / get / patch

```http
GET /v1/agents
GET /v1/agents/:id
PATCH /v1/agents/:id
```

GET returns `has_api_key` (boolean), not the raw key.

### Bind agent to session

```http
POST /v1/agents/:id/bind-session

{
  "session_id": "uuid",
  "ai_enabled": true
}
```

### AI control patterns

- **Built-in AI:** bind agent + `ai_enabled: true`
- **Custom bot (your code replies):** `ai_enabled: false` + webhooks + `POST /v1/messages`  
  Incoming webhooks still fire when AI is disabled.

---

## 3. Webhooks — real-time events

### Register

```http
POST /v1/webhooks

{
  "url": "https://your-app.com/webhooks/waas",
  "secret": "whsec_shared_secret",
  "events": ["message.incoming", "message.outgoing", "session.status", "session.qr"],
  "is_active": true
}
```

```http
GET /v1/webhooks
PATCH /v1/webhooks/:id
DELETE /v1/webhooks/:id
POST /v1/webhooks/:id/test
```

### Events

| Event | When |
|-------|------|
| `message.incoming` | Customer text received (always, even if AI off) |
| `message.outgoing` | Outbound message (AI / API / manual) |
| `session.status` | Connection status change |
| `session.qr` | New QR for linking |

### Payload

```json
{
  "event": "message.incoming",
  "delivery_id": "uuid",
  "timestamp": "2026-07-21T12:00:00.000Z",
  "data": {
    "message_id": "...",
    "session_id": "...",
    "agent_id": "...",
    "ai_enabled": true,
    "from": "923001112233@s.whatsapp.net",
    "from_phone": "923001112233",
    "text": "Hello",
    "direction": "in"
  }
}
```

Headers: `X-WaaS-Event`, `X-WaaS-Delivery`, and if secret set:  
`X-WaaS-Signature: sha256=<hmac_sha256_hex_of_raw_body>`.

Delivery is async. Max 20 webhooks per user.  
Optional legacy: agent `webhook_url` also receives `message.incoming`.

### Custom handler recipe

1. `POST /v1/webhooks` with `message.incoming`
2. `PATCH /v1/sessions/:id` → `{ "ai_enabled": false }`
3. On webhook: read `data.session_id`, `data.from` / `data.from_phone`, `data.text`
4. Reply: `POST /v1/messages`

---

## 4. Messaging

### Text

```http
POST /v1/messages

{
  "session_id": "uuid",
  "to": "+1234567890",
  "text": "Hello from API!"
}
```

### Media

```http
POST /v1/messages

{
  "session_id": "uuid",
  "to": "+1234567890",
  "type": "image",
  "url": "https://example.com/image.png",
  "caption": "optional"
}
```

Types: `text` | `image` | `video` | `audio` | `document`.

### Template

```http
POST /v1/messages

{
  "session_id": "uuid",
  "to": "+1234567890",
  "template_id": "TEMPLATE_ID",
  "variables": { "Name": "Ali", "Date": "12 Apr 2026" }
}
```

### Usage / plan

```http
GET /v1/usage
```

---

## 5. Campaigns

```http
POST /v1/campaigns

{
  "name": "April Outreach",
  "session_id": "uuid",
  "message_template": "Hi {{name}}, ...",
  "contacts": [
    { "name": "Ali", "phone": "+923001112233", "email": "a@b.com" }
  ]
}
```

```http
GET /v1/campaigns
GET /v1/campaigns/:id
PATCH /v1/campaigns/:id
POST /v1/campaigns/:id/contacts
```

- Create status: `draft`. Set `status` to `ready` to queue sending; `stopped` to halt.
- Placeholders: `{{name}}`, `{{phone}}`, `{{email}}`
- Sends are **paced** by server (`CAMPAIGN_RECIPIENTS_PER_HOUR`), not instant.

---

## Quick endpoint index

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/sessions` | List sessions |
| POST | `/v1/sessions` | Create / start connect |
| GET | `/v1/sessions/:id` | Status + QR |
| PATCH | `/v1/sessions/:id` | `agent_id`, `ai_enabled` |
| PATCH | `/v1/sessions/:id/ai` | AI settings (+ agent fields) |
| POST | `/v1/sessions/:id/logout` | Logout WA |
| DELETE | `/v1/sessions/:id` | Delete session |
| GET/POST | `/v1/agents` | List / create |
| GET/PATCH | `/v1/agents/:id` | Get / update AI config |
| POST | `/v1/agents/:id/bind-session` | Bind to session |
| GET/POST | `/v1/webhooks` | List / register |
| PATCH/DELETE | `/v1/webhooks/:id` | Update / remove |
| POST | `/v1/webhooks/:id/test` | Test delivery |
| POST | `/v1/messages` | Send message |
| GET | `/v1/usage` | Plan usage |
| GET/POST | `/v1/campaigns` | List / create |
| GET/PATCH | `/v1/campaigns/:id` | Get / update |
| POST | `/v1/campaigns/:id/contacts` | Add contacts |
