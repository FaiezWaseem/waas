const express = require('express')
const router = express.Router()
const db = require('./db')

// Get client dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.sub
    
    // 1. Get total messages count (for current period)
    const usageRes = await db.pool.query(
      `SELECT messages_count 
       FROM usage 
       WHERE user_id = $1 
       ORDER BY period_start DESC LIMIT 1`,
      [userId]
    )
    
    // Default to 0 if no usage record found
    const messagesCount = usageRes.rows.length > 0 ? parseInt(usageRes.rows[0].messages_count) : 0

    // 2. Get active agents count
    const agents = await db.pool.query(
      'SELECT COUNT(*) as count FROM agents WHERE user_id = $1',
      [userId]
    )
    const agentsCount = parseInt(agents.rows[0].count)

    // 3. Get active sessions count
    const sessions = await db.pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1',
      [userId]
    )
    console.log('[DEBUG] sessions count query result:', sessions.rows)
    const activeSessionsCount = sessions.rows && sessions.rows[0] ? parseInt(sessions.rows[0].count || 0) : 0

    // 4. Get subscription/plan info for credits
    // Find active subscription
    const sub = await db.pool.query(
      `SELECT p.max_messages, p.max_sessions 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.user_id = $1 AND s.status = 'active' 
       ORDER BY s.period_start DESC LIMIT 1`,
      [userId]
    )
    
    let creditsRemaining = 0
    let maxSessions = 0
    if (sub.rows.length > 0) {
      const maxMessages = sub.rows[0].max_messages
      maxSessions = sub.rows[0].max_sessions
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
      activeAgents: agentsCount,
      sessions: {
        active: activeSessionsCount,
        max: maxSessions
      }
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

// Get all chats across all sessions
router.get('/chats', async (req, res) => {
  try {
    const userId = req.user.sub
    
    // Get last message per chat (session_id + to_jid)
    const sql = `
      SELECT 
        m.to_jid, 
        m.session_id, 
        m.body, 
        m.created_at, 
        m.direction, 
        s.phone_number as session_phone,
        s.contact_name as session_name,
        s.platform
      FROM messages m
      JOIN sessions s ON m.session_id = s.id
      INNER JOIN (
          SELECT session_id, to_jid, MAX(created_at) as max_created
          FROM messages
          GROUP BY session_id, to_jid
      ) grouped_m ON m.session_id = grouped_m.session_id AND m.to_jid = grouped_m.to_jid AND m.created_at = grouped_m.max_created
      WHERE s.user_id = $1
      ORDER BY m.created_at DESC
    `
    
    const r = await db.pool.query(sql, [userId])
    
    const chats = r.rows.map(row => ({
      id: `${row.session_id}_${row.to_jid}`,
      customer: row.to_jid.split('@')[0], // simplistic name extraction
      phone: row.to_jid.split('@')[0],
      lastMessage: row.body,
      timestamp: row.created_at,
      status: 'active', // TODO: infer from logic?
      platform: row.platform || 'WhatsApp',
      sessionId: row.session_id,
      sessionName: row.session_name || row.session_phone
    }))

    res.json({ chats })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
