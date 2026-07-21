# WaaS — Sessions & AI Developer API (for AI)

Base URL: `{BACKEND}` (e.g. `http://localhost:4000`)  
Auth header: `Authorization: Bearer sk_live_...` (create key in dashboard → Developers)

## Sessions — connect WhatsApp via API

### Create session

```http
POST /v1/sessions
Content-Type: application/json

{
  "agent_id": "optional-uuid",
  "ai_enabled": true
}
```

Returns `session` with `id`. Poll for QR or use webhook `session.qr`.

### List / get

```http
GET /v1/sessions
GET /v1/sessions/:id
```

Response fields include: `id`, `status`, `qr`, `phone_number`, `contact_name`, `agent_id`, `agent_name`, `ai_enabled`, `last_active`, `created_at`.

### Update AI binding

```http
PATCH /v1/sessions/:id
{
  "agent_id": "uuid-or-null",
  "ai_enabled": true
}
```

### Update session AI + agent config in one call

```http
PATCH /v1/sessions/:id/ai
{
  "ai_enabled": true,
  "agent_id": "uuid",
  "system_prompt": "You are a helpful WhatsApp support agent.",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "api_key": "optional-override",
  "base_url": "optional",
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

### Connect flow (integration recipe)

1. `POST /v1/sessions`  
2. Loop `GET /v1/sessions/:id` until `qr` is set (or handle `session.qr` webhook)  
3. User scans QR in WhatsApp → Linked Devices  
4. Wait until `status` is `open` or `active`  
5. Bind agent / enable AI  

Plan session limits return **403** with message about session limit.

---

## Agents — AI personas

### Create

```http
POST /v1/agents
{
  "name": "Support Bot",
  "webhook_url": "https://optional-legacy-per-agent-hook",
  "system_prompt": "You are a friendly support agent.",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "api_key": null,
  "base_url": null,
  "excluded_numbers": null,
  "human_handoff_phone": "+1234567890"
}
```

### List / get / patch

```http
GET /v1/agents
GET /v1/agents/:id
PATCH /v1/agents/:id
```

GET masks raw `api_key` as `has_api_key` boolean.

### Bind agent to session

```http
POST /v1/agents/:id/bind-session
{
  "session_id": "uuid",
  "ai_enabled": true
}
```

### AI behavior notes for integrators

- `ai_enabled: false` → no built-in AI reply; **webhooks still fire**  
- Use that pattern for fully custom bots: webhook in → your logic → `POST /v1/messages` out  
- Providers: `openai`, `claude`, `gemini`, `deepseek`, `openai_compatible`  
- Agent Q&A memory and documents are managed mainly via JWT dashboard routes under `/agents/:id/memory` and `/agents/:id/documents` (not full v1 surface yet)
