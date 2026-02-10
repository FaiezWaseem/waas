const express = require('express')
const router = express.Router()
const db = require('./db')
const userService = require('./userService')

// Get client dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.sub
    
    // 1. Get Plan Info (Max Limits) using UserService
    const plan = await userService.getUserPlan(userId)

    let maxMessages = 0
    let maxSessions = 0
    let periodStart = null

    if (plan) {
      maxMessages = plan.max_messages === -1 ? Infinity : plan.max_messages
      maxSessions = plan.max_sessions === -1 ? Infinity : plan.max_sessions
      periodStart = plan.period_start
    }

    // 2. Get Usage (Current Period) using UserService
    // If no plan, we assume periodStart is null -> defaults to latest or creates one
    // But better to pass null if no plan
    const usage = await userService.getUserUsage(userId, periodStart)
    const messagesSent = usage.messages_count

    // 3. Get Active Agents Count (still direct query as it's not in usage table yet or usage table tracks total created?)
    // Usage table tracks things that CONSUME quota. 
    // Agents are usually a "max count" limit, not a "consumed over time" limit (unless it's "agents created per month").
    // Let's assume agents are a "current state" limit.
    const agents = await db.pool.query(
      'SELECT COUNT(*) as count FROM agents WHERE user_id = $1',
      [userId]
    )
    const agentsCount = parseInt(agents.rows[0].count)

    // 4. Get Active Sessions Count
    // Similarly, sessions are a concurrent limit usually.
    // UserService getUserUsage returns sessions_count which might be "cumulative sessions created this period" OR "concurrent".
    // Core memory says: "Session limits are enforced using an atomic `sessions_count` in the `usage` table... increments on creation... no refund"
    // So usage.sessions_count is "Total Sessions Created This Period".
    // But the dashboard likely wants "Currently Active Sessions" vs "Max Concurrent Allowed"?
    // OR "Sessions Created This Month" vs "Max Sessions Per Month"?
    // The UI says "Active Sessions".
    // Let's stick to the previous logic for "Active Sessions" (count from sessions table) 
    // BUT use usage for "Credits Remaining" calculations if that was the intention.
    // Wait, previous code queried `sessions` table for active count.
    const sessionsRes = await db.pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1',
      [userId]
    )
    const activeSessionsCount = sessionsRes.rows && sessionsRes.rows[0] ? parseInt(sessionsRes.rows[0].count || 0) : 0

    // 5. Calculate Credits Remaining
    let creditsRemaining = 0
    if (maxMessages === Infinity) {
        creditsRemaining = 999999 // Or some indicator for unlimited
    } else {
        creditsRemaining = Math.max(0, maxMessages - messagesSent)
    }

    res.json({
      messagesSent,
      creditsRemaining,
      activeAgents: agentsCount,
      sessions: {
        active: activeSessionsCount,
        max: maxSessions === Infinity ? 'Unlimited' : maxSessions
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
