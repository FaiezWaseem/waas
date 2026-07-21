const express = require('express')
const router = express.Router()
const db = require('./db')
const { ConnectionManagerInstance } = require('./connectionManager')
const { checkMessageLimit } = require('./middleware/api_auth')
const userService = require('./userService')
const { getBuiltinTemplateById, applyTemplateVariables } = require('./message_templates')
const webhooks = require('./webhooks')
const { v4: uuidv4 } = require('uuid')

function normalizePhone(value = '') {
  return String(value).trim().replace(/[^\d+]/g, '')
}

function normalizeCampaignContact(input) {
  if (!input || typeof input !== 'object') return null
  const phone = normalizePhone(input.phone || input.mobile || input.number || input.whatsapp || input.contact)
  if (!phone) return null
  return {
    name: String(input.name || input.full_name || input.customer || '').trim() || null,
    phone,
    email: String(input.email || '').trim() || null,
    payload: JSON.stringify(input),
  }
}

async function ensureCampaignOwnership(campaignId, userId) {
  const result = await db.pool.query('SELECT * FROM campaigns WHERE id=$1 AND user_id=$2', [campaignId, userId])
  if (!result.rows || !result.rows.length) return null
  return result.rows[0]
}

async function ensureSessionOwnership(sessionId, userId) {
  const result = await db.pool.query('SELECT * FROM sessions WHERE id=$1 AND user_id=$2', [sessionId, userId])
  if (!result.rows || !result.rows.length) return null
  return result.rows[0]
}

async function ensureAgentOwnership(agentId, userId) {
  const result = await db.pool.query('SELECT * FROM agents WHERE id=$1 AND user_id=$2', [agentId, userId])
  if (!result.rows || !result.rows.length) return null
  return result.rows[0]
}

function formatSession(row, liveStatus = null) {
  return {
    id: row.id,
    status: liveStatus ? liveStatus.status : row.status,
    qr: liveStatus && liveStatus.qr ? liveStatus.qr : row.qr || null,
    phone_number: row.phone_number || null,
    contact_name: row.contact_name || null,
    agent_id: row.agent_id || null,
    agent_name: row.agent_name || null,
    ai_enabled: !!(row.ai_enabled === 1 || row.ai_enabled === true || row.ai_enabled === '1'),
    last_active: row.last_active || null,
    created_at: row.created_at || null,
  }
}

async function applySessionAiSettings(sessionId, userId, { agent_id, ai_enabled }) {
  const session = await ensureSessionOwnership(sessionId, userId)
  if (!session) return { error: 'Session not found or not owned by user', status: 404 }

  if (agent_id !== undefined) {
    if (agent_id) {
      const agent = await ensureAgentOwnership(agent_id, userId)
      if (!agent) return { error: 'Agent not found or not owned by user', status: 404 }
    }
    await db.pool.query('UPDATE sessions SET agent_id=$1 WHERE id=$2', [agent_id || null, sessionId])
    if (ConnectionManagerInstance.sessions.has(sessionId)) {
      const s = ConnectionManagerInstance.sessions.get(sessionId)
      s.agentId = agent_id || null
      ConnectionManagerInstance.sessions.set(sessionId, s)
    }
  }

  if (ai_enabled !== undefined) {
    const enabled = !!ai_enabled
    await db.pool.query('UPDATE sessions SET ai_enabled=$1 WHERE id=$2', [enabled ? 1 : 0, sessionId])
    if (ConnectionManagerInstance.sessions.has(sessionId)) {
      const s = ConnectionManagerInstance.sessions.get(sessionId)
      s.aiEnabled = enabled
      ConnectionManagerInstance.sessions.set(sessionId, s)
    }
  }

  const updated = await ensureSessionOwnership(sessionId, userId)
  const liveStatus = ConnectionManagerInstance.getSessionStatus(sessionId)
  return { session: formatSession(updated, liveStatus) }
}

// Send Message
router.post('/messages', checkMessageLimit, async (req, res) => {
  try {
    const { session_id, to, type = 'text', text, url, caption, template_id, variables = {} } = req.body
    const userId = req.user.sub

    if (!session_id || !to) {
      return res.status(400).json({ error: 'Missing session_id or to' })
    }

    // Build Content
    let content
    if (type === 'text') {
        let finalText = text

        if (template_id) {
          let template = getBuiltinTemplateById(template_id)
          if (!template) {
            const templateRes = await db.pool.query(
              'SELECT id,name,body FROM message_templates WHERE id=$1 AND user_id=$2',
              [template_id, userId]
            )
            template = templateRes.rows && templateRes.rows[0] ? templateRes.rows[0] : null
          }

          if (!template) return res.status(404).json({ error: 'Template not found' })
          finalText = applyTemplateVariables(template.body, variables)
        }

        if (!finalText) return res.status(400).json({ error: 'Missing text or valid template_id' })
        content = { text: finalText }
    } else if (['image', 'video', 'audio', 'document'].includes(type)) {
        if (!url) return res.status(400).json({ error: 'Missing url for media' })
        content = { [type]: { url } }
        if (caption) content.caption = caption
    } else {
         return res.status(400).json({ error: 'Invalid type. Supported: text, image, video, audio, document' })
    }

    // 1. Verify Session Ownership
    console.log('[API] Sending message:', { session_id, to, type, content })

    // We can trust the session_id check in sendMessage if we pass it, 
    // but better to verify ownership first to prevent sending via other's session if ID is guessed.
    const sessionRes = await db.pool.query(
      'SELECT id FROM sessions WHERE id=$1 AND user_id=$2',
      [session_id, userId]
    )

    if (!sessionRes.rows.length) {
      return res.status(404).json({ error: 'Session not found or not owned by user' })
    }

    // 2. Format JID
    const jid = to.includes('@') ? to : `${to.replace(/\+/g, '')}@s.whatsapp.net`

    // 3. Send via Manager
    const result = await ConnectionManagerInstance.sendMessage(session_id, jid, content)

    // 4. Increment Usage
    try {
      await userService.incrementUsage(userId, 'messages')
    } catch (e) {
      console.error('Failed to increment API usage:', e)
    }

    res.json({ 
      id: result.id, 
      status: 'sent',
      to: jid,
      timestamp: result.time
    })

  } catch (e) {
    console.error(e)
    const status = e.message === 'Session not active' ? 503 : 500
    res.status(status).json({ error: e.message })
  }
})

// ---------------------------------------------------------------------------
// Sessions — connect WhatsApp + AI settings via API
// ---------------------------------------------------------------------------

// List Sessions
router.get('/sessions', async (req, res) => {
  try {
    const r = await db.pool.query(`
      SELECT s.id, s.status, s.qr, s.phone_number, s.contact_name, s.agent_id, s.ai_enabled,
             s.last_active, s.created_at, a.name as agent_name
      FROM sessions s
      LEFT JOIN agents a ON a.id = s.agent_id
      WHERE s.user_id=$1
      ORDER BY s.created_at DESC
    `, [req.user.sub])

    const sessions = (r.rows || []).map((row) => {
      const liveStatus = ConnectionManagerInstance.getSessionStatus(row.id)
      return formatSession(row, liveStatus)
    })
    res.json({ sessions })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Create / connect a new WhatsApp session (returns id; poll for QR or use session.qr webhook)
router.post('/sessions', async (req, res) => {
  try {
    const userId = req.user.sub
    const { agent_id, ai_enabled } = req.body || {}

    if (agent_id) {
      const agent = await ensureAgentOwnership(agent_id, userId)
      if (!agent) return res.status(404).json({ error: 'Agent not found or not owned by user' })
    }

    const session = await ConnectionManagerInstance.createSession(userId, agent_id || null)

    if (ai_enabled !== undefined) {
      await applySessionAiSettings(session.id, userId, { ai_enabled })
    } else if (agent_id) {
      // When binding an agent on create, default AI on so the session is ready after scan
      await applySessionAiSettings(session.id, userId, { ai_enabled: true })
    }

    const row = await ensureSessionOwnership(session.id, userId)
    const liveStatus = ConnectionManagerInstance.getSessionStatus(session.id)
    res.status(201).json({ session: formatSession(row, liveStatus) })
  } catch (e) {
    console.error(e)
    const status = e.code === 'SESSION_LIMIT' ? 403 : 500
    res.status(status).json({ error: e.message })
  }
})

// Get one session (includes live QR / status for connect flow)
router.get('/sessions/:id', async (req, res) => {
  try {
    const r = await db.pool.query(`
      SELECT s.id, s.status, s.qr, s.phone_number, s.contact_name, s.agent_id, s.ai_enabled,
             s.last_active, s.created_at, a.name as agent_name
      FROM sessions s
      LEFT JOIN agents a ON a.id = s.agent_id
      WHERE s.id=$1 AND s.user_id=$2
    `, [req.params.id, req.user.sub])

    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'Session not found or not owned by user' })

    const liveStatus = ConnectionManagerInstance.getSessionStatus(req.params.id)
    res.json({ session: formatSession(r.rows[0], liveStatus) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Update session AI settings (bind agent, enable/disable AI)
router.patch('/sessions/:id', async (req, res) => {
  try {
    const { agent_id, ai_enabled } = req.body || {}
    if (agent_id === undefined && ai_enabled === undefined) {
      return res.status(400).json({ error: 'Provide agent_id and/or ai_enabled' })
    }

    const result = await applySessionAiSettings(req.params.id, req.user.sub, { agent_id, ai_enabled })
    if (result.error) return res.status(result.status).json({ error: result.error })
    res.json({ ok: true, session: result.session })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Convenience: update only AI settings under a dedicated path
router.patch('/sessions/:id/ai', async (req, res) => {
  try {
    const { agent_id, ai_enabled, system_prompt, provider, model, api_key, base_url, excluded_numbers, human_handoff_phone, name } = req.body || {}

    // Session-level fields
    if (agent_id !== undefined || ai_enabled !== undefined) {
      const result = await applySessionAiSettings(req.params.id, req.user.sub, { agent_id, ai_enabled })
      if (result.error) return res.status(result.status).json({ error: result.error })
    } else {
      const owned = await ensureSessionOwnership(req.params.id, req.user.sub)
      if (!owned) return res.status(404).json({ error: 'Session not found or not owned by user' })
    }

    // Optional: update the bound agent's AI config in the same call
    const session = await ensureSessionOwnership(req.params.id, req.user.sub)
    const targetAgentId = agent_id !== undefined ? (agent_id || null) : session.agent_id

    const agentFields = { system_prompt, provider, model, api_key, base_url, excluded_numbers, human_handoff_phone, name }
    const wantsAgentUpdate = Object.values(agentFields).some((v) => v !== undefined)

    if (wantsAgentUpdate) {
      if (!targetAgentId) {
        return res.status(400).json({ error: 'No agent bound to this session. Pass agent_id or bind an agent first.' })
      }
      const agent = await ensureAgentOwnership(targetAgentId, req.user.sub)
      if (!agent) return res.status(404).json({ error: 'Agent not found or not owned by user' })

      if (name !== undefined) await db.pool.query('UPDATE agents SET name=$1 WHERE id=$2', [name, targetAgentId])

      if (system_prompt !== undefined || provider !== undefined || model !== undefined || api_key !== undefined || base_url !== undefined || excluded_numbers !== undefined || human_handoff_phone !== undefined) {
        const meta = await db.pool.query('SELECT agent_id FROM agents_meta WHERE agent_id=$1', [targetAgentId])
        if (meta.rows && meta.rows.length) {
          if (system_prompt !== undefined) await db.pool.query('UPDATE agents_meta SET system_prompt=$1 WHERE agent_id=$2', [system_prompt, targetAgentId])
          if (provider !== undefined) await db.pool.query('UPDATE agents_meta SET provider=$1 WHERE agent_id=$2', [provider, targetAgentId])
          if (model !== undefined) await db.pool.query('UPDATE agents_meta SET model=$1 WHERE agent_id=$2', [model, targetAgentId])
          if (api_key !== undefined) await db.pool.query('UPDATE agents_meta SET api_key=$1 WHERE agent_id=$2', [api_key || null, targetAgentId])
          if (base_url !== undefined) await db.pool.query('UPDATE agents_meta SET base_url=$1 WHERE agent_id=$2', [base_url || null, targetAgentId])
          if (excluded_numbers !== undefined) await db.pool.query('UPDATE agents_meta SET excluded_numbers=$1 WHERE agent_id=$2', [excluded_numbers, targetAgentId])
          if (human_handoff_phone !== undefined) await db.pool.query('UPDATE agents_meta SET human_handoff_phone=$1 WHERE agent_id=$2', [human_handoff_phone || null, targetAgentId])
        } else {
          await db.pool.query(
            'INSERT INTO agents_meta(agent_id,system_prompt,provider,model,api_key,base_url,excluded_numbers,human_handoff_phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
            [targetAgentId, system_prompt || null, provider || 'openai', model || 'openai', api_key || null, base_url || null, excluded_numbers || null, human_handoff_phone || null]
          )
        }
      }
    }

    const liveStatus = ConnectionManagerInstance.getSessionStatus(req.params.id)
    const finalSession = await db.pool.query(`
      SELECT s.id, s.status, s.qr, s.phone_number, s.contact_name, s.agent_id, s.ai_enabled,
             s.last_active, s.created_at, a.name as agent_name
      FROM sessions s
      LEFT JOIN agents a ON a.id = s.agent_id
      WHERE s.id=$1 AND s.user_id=$2
    `, [req.params.id, req.user.sub])

    res.json({ ok: true, session: formatSession(finalSession.rows[0], liveStatus) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Logout WhatsApp (keep session record, re-issue QR)
router.post('/sessions/:id/logout', async (req, res) => {
  try {
    const session = await ensureSessionOwnership(req.params.id, req.user.sub)
    if (!session) return res.status(404).json({ error: 'Session not found or not owned by user' })
    await ConnectionManagerInstance.logoutSession(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Delete session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await ensureSessionOwnership(req.params.id, req.user.sub)
    if (!session) return res.status(404).json({ error: 'Session not found or not owned by user' })
    await ConnectionManagerInstance.deleteSession(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ---------------------------------------------------------------------------
// Agents — configure AI personas via API
// ---------------------------------------------------------------------------

router.get('/agents', async (req, res) => {
  try {
    const r = await db.pool.query(
      'SELECT id, name, webhook_url, created_at FROM agents WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.sub]
    )
    res.json({ agents: r.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/agents', async (req, res) => {
  try {
    const userId = req.user.sub
    const { name, webhook_url, system_prompt, provider, model, api_key, base_url, excluded_numbers, human_handoff_phone } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name is required' })

    try {
      const sub = await db.pool.query('SELECT s.id,s.plan_id,p.max_agents FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1', [userId])
      if (sub.rows && sub.rows.length) {
        const p = sub.rows[0]
        if (p.max_agents && p.max_agents !== -1) {
          const used = await db.pool.query('SELECT COUNT(*) as cnt FROM agents WHERE user_id=$1', [userId])
          const cnt = used.rows && used.rows[0] ? Number(used.rows[0].cnt) : 0
          if (cnt >= p.max_agents) return res.status(403).json({ error: 'agent limit reached for your plan' })
        }
      }
    } catch (e) { console.error('plan check failed', e && e.message) }

    const id = uuidv4()
    await db.pool.query(
      'INSERT INTO agents(id,user_id,name,webhook_url,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',
      [id, userId, name, webhook_url || null]
    )
    await db.pool.query(
      'REPLACE INTO agents_meta(agent_id,system_prompt,provider,model,api_key,base_url,excluded_numbers,human_handoff_phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, system_prompt || null, provider || 'openai', model || 'openai', api_key || null, base_url || null, excluded_numbers || null, human_handoff_phone || null]
    )
    res.status(201).json({ id, name, webhook_url: webhook_url || null })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/agents/:id', async (req, res) => {
  try {
    const agent = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (!agent) return res.status(404).json({ error: 'Agent not found or not owned by user' })

    const meta = await db.pool.query(
      'SELECT system_prompt,provider,model,api_key,base_url,excluded_numbers,human_handoff_phone FROM agents_meta WHERE agent_id=$1',
      [req.params.id]
    )
    const m = meta.rows && meta.rows[0] ? meta.rows[0] : {}
    res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        webhook_url: agent.webhook_url,
        created_at: agent.created_at,
        system_prompt: m.system_prompt || null,
        provider: m.provider || 'openai',
        model: m.model || 'openai',
        has_api_key: !!m.api_key,
        base_url: m.base_url || null,
        excluded_numbers: m.excluded_numbers || null,
        human_handoff_phone: m.human_handoff_phone || null,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/agents/:id', async (req, res) => {
  try {
    const agent = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (!agent) return res.status(404).json({ error: 'Agent not found or not owned by user' })

    const { name, webhook_url, system_prompt, provider, model, api_key, base_url, excluded_numbers, human_handoff_phone } = req.body || {}
    const id = req.params.id

    if (name !== undefined) await db.pool.query('UPDATE agents SET name=$1 WHERE id=$2', [name, id])
    if (webhook_url !== undefined) await db.pool.query('UPDATE agents SET webhook_url=$1 WHERE id=$2', [webhook_url || null, id])

    if (system_prompt !== undefined || provider !== undefined || model !== undefined || api_key !== undefined || base_url !== undefined || excluded_numbers !== undefined || human_handoff_phone !== undefined) {
      const meta = await db.pool.query('SELECT agent_id FROM agents_meta WHERE agent_id=$1', [id])
      if (meta.rows && meta.rows.length) {
        if (system_prompt !== undefined) await db.pool.query('UPDATE agents_meta SET system_prompt=$1 WHERE agent_id=$2', [system_prompt, id])
        if (provider !== undefined) await db.pool.query('UPDATE agents_meta SET provider=$1 WHERE agent_id=$2', [provider, id])
        if (model !== undefined) await db.pool.query('UPDATE agents_meta SET model=$1 WHERE agent_id=$2', [model, id])
        if (api_key !== undefined) await db.pool.query('UPDATE agents_meta SET api_key=$1 WHERE agent_id=$2', [api_key || null, id])
        if (base_url !== undefined) await db.pool.query('UPDATE agents_meta SET base_url=$1 WHERE agent_id=$2', [base_url || null, id])
        if (excluded_numbers !== undefined) await db.pool.query('UPDATE agents_meta SET excluded_numbers=$1 WHERE agent_id=$2', [excluded_numbers, id])
        if (human_handoff_phone !== undefined) await db.pool.query('UPDATE agents_meta SET human_handoff_phone=$1 WHERE agent_id=$2', [human_handoff_phone || null, id])
      } else {
        await db.pool.query(
          'INSERT INTO agents_meta(agent_id,system_prompt,provider,model,api_key,base_url,excluded_numbers,human_handoff_phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
          [id, system_prompt || null, provider || 'openai', model || 'openai', api_key || null, base_url || null, excluded_numbers || null, human_handoff_phone || null]
        )
      }
    }

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/agents/:id/bind-session', async (req, res) => {
  try {
    const agent = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (!agent) return res.status(404).json({ error: 'Agent not found or not owned by user' })

    const { session_id, ai_enabled = true } = req.body || {}
    if (!session_id) return res.status(400).json({ error: 'session_id is required' })

    const result = await applySessionAiSettings(session_id, req.user.sub, {
      agent_id: req.params.id,
      ai_enabled,
    })
    if (result.error) return res.status(result.status).json({ error: result.error })
    res.json({ ok: true, session: result.session })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ---------------------------------------------------------------------------
// Webhooks — realtime inbound WhatsApp events
// ---------------------------------------------------------------------------

router.get('/webhooks', async (req, res) => {
  try {
    const list = await webhooks.listWebhooks(req.user.sub)
    res.json({ webhooks: list, supported_events: webhooks.SUPPORTED_EVENTS })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/webhooks', async (req, res) => {
  try {
    const { url, secret, events, is_active } = req.body || {}
    if (!url) return res.status(400).json({ error: 'url is required' })
    const hook = await webhooks.createWebhook(req.user.sub, { url, secret, events, is_active })
    res.status(201).json({ webhook: hook })
  } catch (e) {
    console.error(e)
    const status = /Maximum|valid http/i.test(e.message) ? 400 : 500
    res.status(status).json({ error: e.message })
  }
})

router.patch('/webhooks/:id', async (req, res) => {
  try {
    const hook = await webhooks.updateWebhook(req.user.sub, req.params.id, req.body || {})
    if (!hook) return res.status(404).json({ error: 'Webhook not found' })
    res.json({ ok: true, webhook: hook })
  } catch (e) {
    console.error(e)
    const status = /valid http/i.test(e.message) ? 400 : 500
    res.status(status).json({ error: e.message })
  }
})

router.delete('/webhooks/:id', async (req, res) => {
  try {
    const ok = await webhooks.deleteWebhook(req.user.sub, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Webhook not found' })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Test delivery to verify URL reachability
router.post('/webhooks/:id/test', async (req, res) => {
  try {
    const list = await webhooks.listWebhooks(req.user.sub)
    const hook = list.find((h) => h.id === req.params.id)
    if (!hook) return res.status(404).json({ error: 'Webhook not found' })

    const raw = await db.pool.query('SELECT url, secret FROM webhooks WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub])
    if (!raw.rows || !raw.rows.length) return res.status(404).json({ error: 'Webhook not found' })

    await webhooks.dispatch(req.user.sub, 'message.incoming', {
      message_id: 'test_' + Date.now(),
      session_id: 'test-session',
      from: '0000000000@s.whatsapp.net',
      from_phone: '0000000000',
      text: 'WaaS webhook test payload',
      direction: 'in',
      test: true,
    })
    res.json({ ok: true, message: 'Test event dispatched (async delivery)' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Get Plan and Usage Info
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.sub
    const plan = await userService.getUserPlan(userId)

    if (!plan) {
        return res.json({
            plan: null,
            usage: null,
            remaining: null
        })
    }

    const usage = await userService.getUserUsage(userId, plan.period_start)
    const allTime = await userService.getUserAllTimeUsage(userId)

    // Calculate remaining
    // -1 means unlimited
    const remaining = {
        messages: plan.max_messages === -1 ? 'Unlimited' : Math.max(0, plan.max_messages - usage.messages_count),
        chats: plan.max_chats === -1 ? 'Unlimited' : Math.max(0, plan.max_chats - usage.chats_count),
        sessions: plan.max_sessions === -1 ? 'Unlimited' : Math.max(0, plan.max_sessions - usage.sessions_count),
        agents: plan.max_agents === -1 ? 'Unlimited' : 'N/A' // Agents are usually hard limits, not consumptive
    }

    res.json({
        plan: {
            name: plan.plan_name,
            status: plan.status,
            period_start: plan.period_start,
            period_end: plan.period_end,
            limits: {
                messages: plan.max_messages === -1 ? 'Unlimited' : plan.max_messages,
                chats: plan.max_chats === -1 ? 'Unlimited' : plan.max_chats,
                sessions: plan.max_sessions === -1 ? 'Unlimited' : plan.max_sessions,
                agents: plan.max_agents === -1 ? 'Unlimited' : plan.max_agents
            }
        },
        usage: {
            messages: usage.messages_count,
            chats: usage.chats_count,
            sessions: usage.sessions_count
        },
        all_time: {
            messages: allTime.messages_count,
            chats: allTime.chats_count,
            sessions: allTime.sessions_count
        },
        remaining
    })

  } catch (e) {
    console.error('GET /usage failed:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// Campaigns for developer API
router.get('/campaigns', async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT c.*, COUNT(cc.id) AS contacts_count
      FROM campaigns c
      LEFT JOIN campaign_contacts cc ON cc.campaign_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.user.sub])
    res.json({ campaigns: result.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/campaigns', async (req, res) => {
  try {
    const { name, session_id, message_template, contacts = [] } = req.body
    const userId = req.user.sub

    if (!name) return res.status(400).json({ error: 'Campaign name is required' })
    if (!session_id) return res.status(400).json({ error: 'session_id is required' })
    if (!Array.isArray(contacts) || !contacts.length) return res.status(400).json({ error: 'contacts array is required' })

    const sessionRes = await db.pool.query('SELECT id FROM sessions WHERE id=$1 AND user_id=$2', [session_id, userId])
    if (!sessionRes.rows.length) return res.status(404).json({ error: 'Session not found or not owned by user' })

    const id = require('uuid').v4()
    await db.pool.query(
      'INSERT INTO campaigns(id,user_id,session_id,name,message_template,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      [id, userId, session_id, name, message_template || null, 'draft']
    )

    let imported = 0
    for (const raw of contacts) {
      const contact = normalizeCampaignContact(raw)
      if (!contact) continue
      await db.pool.query(
        'INSERT INTO campaign_contacts(id,campaign_id,name,phone,email,payload,send_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)',
        [require('uuid').v4(), id, contact.name, contact.phone, contact.email, contact.payload, 'pending']
      )
      imported += 1
    }

    if (!imported) {
      await db.pool.query('DELETE FROM campaigns WHERE id=$1', [id])
      return res.status(400).json({ error: 'No valid contacts found in contacts array' })
    }

    res.json({ id, status: 'draft', imported })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const contacts = await db.pool.query(
      'SELECT id,name,phone,email,send_status,created_at FROM campaign_contacts WHERE campaign_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    )

    res.json({ campaign, contacts: contacts.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const { name, message_template, status } = req.body
    if (name !== undefined) await db.pool.query('UPDATE campaigns SET name=$1 WHERE id=$2', [name, req.params.id])
    if (message_template !== undefined) await db.pool.query('UPDATE campaigns SET message_template=$1 WHERE id=$2', [message_template || null, req.params.id])
    if (status !== undefined) await db.pool.query('UPDATE campaigns SET status=$1 WHERE id=$2', [status, req.params.id])
    await db.pool.query('UPDATE campaigns SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [req.params.id])

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/campaigns/:id/contacts', async (req, res) => {
  try {
    const campaign = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const { contacts = [] } = req.body
    if (!Array.isArray(contacts) || !contacts.length) return res.status(400).json({ error: 'contacts array is required' })

    const existing = await db.pool.query('SELECT phone FROM campaign_contacts WHERE campaign_id=$1', [req.params.id])
    const existingPhones = new Set((existing.rows || []).map((row) => normalizePhone(row.phone)))
    let imported = 0

    for (const raw of contacts) {
      const contact = normalizeCampaignContact(raw)
      if (!contact || existingPhones.has(contact.phone)) continue
      await db.pool.query(
        'INSERT INTO campaign_contacts(id,campaign_id,name,phone,email,payload,send_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)',
        [require('uuid').v4(), req.params.id, contact.name, contact.phone, contact.email, contact.payload, 'pending']
      )
      imported += 1
      existingPhones.add(contact.phone)
    }

    await db.pool.query('UPDATE campaigns SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [req.params.id])
    res.json({ ok: true, imported })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
