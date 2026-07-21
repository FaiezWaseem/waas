# WaaS — Webhooks & Messaging API (for AI)

Base URL: `{BACKEND}`  
Auth: `Authorization: Bearer sk_live_...`

## Webhooks — real-time inbound WhatsApp

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

Also: `GET /v1/webhooks`, `PATCH /v1/webhooks/:id`, `DELETE /v1/webhooks/:id`, `POST /v1/webhooks/:id/test`  
Dashboard JWT mirrors these at `/webhooks`.

### Supported events

| Event | When |
|-------|------|
| `message.incoming` | Customer text received (after DB persist; **before/regardless of AI**) |
| `message.outgoing` | Outbound text (AI, API, or manual) |
| `session.status` | Baileys connection status changes |
| `session.qr` | New QR for linking |

### Delivery format

HTTP `POST` JSON body:

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
    "direction": "in",
    "push_name": "optional",
    "timestamp": null
  }
}
```

Headers:

- `Content-Type: application/json`
- `X-WaaS-Event: message.incoming`
- `X-WaaS-Delivery: <delivery_id>`
- `X-WaaS-Signature: sha256=<hmac_hex>` when secret set (HMAC-SHA256 of **raw body** with secret)

Delivery is **async** (does not block AI). Max 20 webhooks per user.  
Legacy: if agent has `webhook_url`, it also receives `message.incoming`.

### Custom bot recipe

1. Register webhook for `message.incoming`  
2. `PATCH /v1/sessions/:id` with `{ "ai_enabled": false }`  
3. On webhook: process `data.text`, `data.from_phone`, `data.session_id`  
4. Reply: `POST /v1/messages`  

---

## Messaging API

### Send text

```http
POST /v1/messages
{
  "session_id": "uuid",
  "to": "+1234567890",
  "text": "Hello from API!"
}
```

### Send media

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

Types: `text`, `image`, `video`, `audio`, `document`.

### Send template

```http
POST /v1/messages
{
  "session_id": "uuid",
  "to": "+1234567890",
  "template_id": "TEMPLATE_ID",
  "variables": { "Name": "Ali", "Date": "12 Apr 2026" }
}
```

Subject to plan **message limits** (403 if exceeded). Session must be active (503 if not).

### Usage

```http
GET /v1/usage
```

---

## Campaigns (outbound bulk)

```http
POST /v1/campaigns
{
  "name": "April Outreach",
  "session_id": "uuid",
  "message_template": "Hi {{name}}, ...",
  "contacts": [{ "name": "Ali", "phone": "+92300...", "email": "a@b.com" }]
}
```

```http
GET /v1/campaigns
GET /v1/campaigns/:id
PATCH /v1/campaigns/:id   # status: draft | ready | stopped | ...
POST /v1/campaigns/:id/contacts
```

Placeholders: `{{name}}`, `{{phone}}`, `{{email}}`. Sending is **paced** by server cron (`CAMPAIGN_RECIPIENTS_PER_HOUR`), not instant blast.

---

## Error patterns

| Status | Meaning |
|--------|---------|
| 401 | Missing/invalid API key |
| 403 | Plan limit (messages, sessions, agents) |
| 404 | Session/agent/campaign not owned or missing |
| 400 | Validation (missing fields, bad URL) |
| 503 | Session not active (send) |
