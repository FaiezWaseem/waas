const db = require('../db')
const crypto = require('crypto')
const userService = require('../userService')

const verifyApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const key = authHeader.split(' ')[1]
  const hash = crypto.createHash('sha256').update(key).digest('hex')

  try {
    // 1. Validate Key
    const r = await db.pool.query(
      `SELECT k.id, k.user_id, u.role 
       FROM api_keys k 
       JOIN users u ON k.user_id = u.id 
       WHERE k.key_hash = $1`,
      [hash]
    )

    if (!r.rows.length) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    const apiKey = r.rows[0]
    const userId = apiKey.user_id

    // 2. Check Plan Limits (Messages)
    // Get current plan and usage via UserService
    const sub = await userService.getUserPlan(userId)
    
    let maxMessages = 0
    if (sub) {
      maxMessages = sub.max_messages
    }

    // Get usage
    const usage = await userService.getUserUsage(userId, sub ? sub.period_start : null)
    
    // Update last_used_at for the key (async, don't await)
    db.pool.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiKey.id]).catch(console.error)

    // Attach to request
    req.user = { sub: userId, role: apiKey.role } // Compatible with existing auth structure
    req.apiKey = apiKey
    req.usageId = usage.id // To increment later
    req.planLimit = Number(maxMessages)
    req.currentUsage = Number(usage.messages_count)

    console.log(`[API Limit Check] User: ${userId} | Plan Limit: ${req.planLimit} | Used: ${req.currentUsage} | Remaining: ${req.planLimit === -1 ? 'Unlimited' : req.planLimit - req.currentUsage}`)

    next()
  } catch (e) {
    console.error('API Auth Error:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const checkMessageLimit = (req, res, next) => {
  if (req.planLimit !== -1 && req.currentUsage >= req.planLimit) {
    return res.status(403).json({ error: 'Monthly message limit reached' })
  }
  next()
}

module.exports = { verifyApiKey, checkMessageLimit }
