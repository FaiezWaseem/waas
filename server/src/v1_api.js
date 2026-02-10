const express = require('express')
const router = express.Router()
const db = require('./db')
const { ConnectionManagerInstance } = require('./connectionManager')
const { checkMessageLimit } = require('./middleware/api_auth')

// Send Message
router.post('/messages', checkMessageLimit, async (req, res) => {
  try {
    const { session_id, to, text } = req.body
    const userId = req.user.sub

    if (!session_id || !to || !text) {
      return res.status(400).json({ error: 'Missing session_id, to, or text' })
    }

    // 1. Verify Session Ownership
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
    const result = await ConnectionManagerInstance.sendMessage(session_id, jid, text)

    // 4. Increment Usage
    if (req.usageId) {
      await db.pool.query('UPDATE usage SET messages_count = messages_count + 1 WHERE id=$1', [req.usageId])
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

module.exports = router
