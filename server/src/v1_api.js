const express = require('express')
const router = express.Router()
const db = require('./db')
const { ConnectionManagerInstance } = require('./connectionManager')
const { checkMessageLimit } = require('./middleware/api_auth')
const userService = require('./userService')

// Send Message
router.post('/messages', checkMessageLimit, async (req, res) => {
  try {
    const { session_id, to, type = 'text', text, url, caption } = req.body
    const userId = req.user.sub

    if (!session_id || !to) {
      return res.status(400).json({ error: 'Missing session_id or to' })
    }

    // Build Content
    let content
    if (type === 'text') {
        if (!text) return res.status(400).json({ error: 'Missing text' })
        content = { text }
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

module.exports = router
