const db = require('../db')
const crypto = require('crypto')

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
    // Get current plan and usage
    const subRes = await db.pool.query(
      `SELECT p.max_messages 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.period_start DESC LIMIT 1`,
      [userId]
    )
    
    // If no subscription, maybe allow a small free tier or block? 
    // Assuming 'Basic' is free and default, but if no sub record exists, we might block.
    // However, existing logic might handle free users without explicit subscription rows? 
    // Let's assume user must have a plan. If not, default to 0 limit.
    let maxMessages = 0
    if (subRes.rows.length) {
      const val = subRes.rows[0].max_messages
      maxMessages = val === null ? -1 : val
    } else {
      // Fallback to checking if they are on a free plan that isn't in subscriptions?
      // For now, strict check.
    }

    // Get usage
    // We need to find the CURRENT usage period. 
    // Assuming usage table has rows for periods.
    const usageRes = await db.pool.query(
      `SELECT id, messages_count 
       FROM usage 
       WHERE user_id = $1 
       ORDER BY period_start DESC LIMIT 1`,
      [userId]
    )

    let currentUsage = 0
    let usageId = null
    
    if (usageRes.rows.length) {
      currentUsage = usageRes.rows[0].messages_count
      usageId = usageRes.rows[0].id
    }

    // Check limit (if not unlimited, i.e., -1)
    // We don't enforce here, but we attach info for specific endpoints to check
    
    // Update last_used_at for the key (async, don't await)
    db.pool.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiKey.id]).catch(console.error)

    // Attach to request
    req.user = { sub: userId, role: apiKey.role } // Compatible with existing auth structure
    req.apiKey = apiKey
    req.usageId = usageId // To increment later
    req.planLimit = Number(maxMessages)
    req.currentUsage = Number(currentUsage)

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
