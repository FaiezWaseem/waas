const express = require('express')
const router = express.Router()
const db = require('./db')

// Get client dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.sub
    
    // 1. Get total messages count
    const msgs = await db.pool.query(
      `SELECT COUNT(*) as count 
       FROM messages m 
       JOIN sessions s ON m.session_id = s.id 
       WHERE s.user_id = $1`,
      [userId]
    )
    const messagesCount = parseInt(msgs.rows[0].count)

    // 2. Get active agents count
    const agents = await db.pool.query(
      'SELECT COUNT(*) as count FROM agents WHERE user_id = $1',
      [userId]
    )
    const agentsCount = parseInt(agents.rows[0].count)

    // 3. Get subscription/plan info for credits
    // Find active subscription
    const sub = await db.pool.query(
      `SELECT p.max_messages 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.user_id = $1 AND s.status = 'active' 
       ORDER BY s.period_start DESC LIMIT 1`,
      [userId]
    )
    
    let creditsRemaining = 0
    if (sub.rows.length > 0) {
      const maxMessages = sub.rows[0].max_messages
      // For now, simple calculation: max - total. 
      // In a real system, we'd filter messages by billing period.
      // Assuming 'credits' means 'messages remaining'
      creditsRemaining = Math.max(0, maxMessages - messagesCount)
    } else {
      // If no active subscription, check if they are on a free/default plan or have 0 credits
      // Maybe check for a default plan if none exists?
      // For now, 0.
      creditsRemaining = 0
    }

    res.json({
      messagesSent: messagesCount,
      creditsRemaining,
      activeAgents: agentsCount
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Get recent messages
router.get('/messages', async (req, res) => {
  try {
    const userId = req.user.sub
    const { limit = 5 } = req.query
    
    const r = await db.pool.query(
      `SELECT m.id, m.to_jid, m.direction, m.created_at, m.body, s.agent_id
       FROM messages m 
       JOIN sessions s ON m.session_id = s.id 
       WHERE s.user_id = $1 
       ORDER BY m.created_at DESC 
       LIMIT $2`,
      [userId, limit]
    )
    
    // Enrich with agent names if possible, but basic info is enough
    // to_jid is like "1234567890@s.whatsapp.net"
    
    const messages = r.rows.map(m => ({
      id: m.id,
      to: m.to_jid ? m.to_jid.split('@')[0] : 'Unknown',
      direction: m.direction,
      body: m.body,
      createdAt: m.created_at,
      status: 'Delivered' // We don't track status in messages table yet, assuming delivered
    }))

    res.json({ messages })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
