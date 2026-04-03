const express = require('express')
const router = express.Router()
const db = require('./db')
const { ConnectionManagerInstance } = require('./connectionManager')
const { checkMessageLimit } = require('./middleware/api_auth')
const userService = require('./userService')
const { getBuiltinTemplateById, applyTemplateVariables } = require('./message_templates')

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

// List Sessions (Helper for devs)
router.get('/sessions', async (req, res) => {
  try {
    const r = await db.pool.query(
      'SELECT id, status, phone_number, contact_name, last_active FROM sessions WHERE user_id=$1', 
      [req.user.sub]
    )
    res.json({ sessions: r.rows })
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
