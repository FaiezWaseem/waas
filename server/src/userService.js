const db = require('./db')

class UserService {
  
  /**
   * Get user profile details
   * @param {string} userId 
   * @returns {Promise<object|null>} User profile object or null
   */
  async getUserProfile(userId) {
    try {
      const res = await db.pool.query('SELECT id, email, role, created_at FROM users WHERE id=$1', [userId])
      return res.rows[0] || null
    } catch (e) {
      console.error('UserService.getUserProfile failed:', e)
      throw e
    }
  }

  /**
   * Get user's current active plan and subscription details
   * @param {string} userId 
   * @returns {Promise<object|null>} Plan details or null if no subscription
   */
  async getUserPlan(userId) {
    try {
      // Fetch latest subscription (regardless of status, though usually we care about active/trialing)
      // Logic from connectionManager/api_auth: verify plan limits
      const sql = `
        SELECT s.id as subscription_id, s.status, s.period_start, s.period_end, 
               p.id as plan_id, p.name as plan_name, p.max_messages, p.max_chats, p.max_agents, p.max_sessions
        FROM subscriptions s 
        LEFT JOIN plans p ON p.id = s.plan_id 
        WHERE s.user_id = $1 
        ORDER BY s.period_start DESC 
        LIMIT 1
      `
      const res = await db.pool.query(sql, [userId])
      if (!res.rows.length) return null

      const sub = res.rows[0]
      
      // Normalize limits (null means unlimited -> -1)
      return {
        ...sub,
        max_messages: sub.max_messages === null ? -1 : Number(sub.max_messages),
        max_chats: sub.max_chats === null ? -1 : Number(sub.max_chats),
        max_agents: sub.max_agents === null ? -1 : Number(sub.max_agents),
        max_sessions: sub.max_sessions === null ? -1 : Number(sub.max_sessions)
      }
    } catch (e) {
      console.error('UserService.getUserPlan failed:', e)
      throw e
    }
  }

  /**
   * Get usage metrics for the current subscription period
   * @param {string} userId 
   * @param {string} periodStart (Optional) If provided, fetches for specific period. Else fetches for latest plan period.
   * @returns {Promise<object>} Usage object { messages_count, chats_count, sessions_count, id, ... }
   */
  async getUserUsage(userId, periodStart = null) {
    try {
      let pStart = periodStart
      let pEnd = null

      if (!pStart) {
        const plan = await this.getUserPlan(userId)
        if (!plan) return { messages_count: 0, chats_count: 0, sessions_count: 0 }
        pStart = plan.period_start
        pEnd = plan.period_end
      }

      // Find usage row
      let res = await db.pool.query('SELECT * FROM usage WHERE user_id=$1 AND period_start=$2', [userId, pStart])
      
      if (res.rows.length) {
        return {
          ...res.rows[0],
          messages_count: Number(res.rows[0].messages_count),
          chats_count: Number(res.rows[0].chats_count),
          sessions_count: Number(res.rows[0].sessions_count || 0)
        }
      }

      // If not found, and we have pEnd (meaning we found a plan), create it?
      // Or just return 0s? 
      // Existing logic creates it on the fly. Let's return 0s but NOT create here to avoid side effects in a "get" method.
      // Calling code should call `ensureUsageRecord` if they intend to write.
      return { messages_count: 0, chats_count: 0, sessions_count: 0, id: null }

    } catch (e) {
      console.error('UserService.getUserUsage failed:', e)
      throw e
    }
  }

  /**
   * Ensure a usage record exists for the given period
   * @param {string} userId 
   * @param {string} periodStart 
   * @param {string} periodEnd 
   * @returns {Promise<object>} The usage row
   */
  async ensureUsageRecord(userId, periodStart, periodEnd) {
    try {
      const existing = await this.getUserUsage(userId, periodStart)
      if (existing && existing.id) return existing

      const id = require('uuid').v4()
      await db.pool.query(
        'INSERT INTO usage(id, user_id, period_start, period_end, messages_count, chats_count, sessions_count, created_at) VALUES($1,$2,$3,$4,0,0,0,CURRENT_TIMESTAMP)',
        [id, userId, periodStart, periodEnd]
      )
      return { id, user_id: userId, period_start: periodStart, period_end: periodEnd, messages_count: 0, chats_count: 0, sessions_count: 0 }
    } catch (e) {
      // Handle race condition if created in parallel
      console.error('UserService.ensureUsageRecord failed (might exist):', e.message)
      return await this.getUserUsage(userId, periodStart)
    }
  }

  /**
   * Increment usage counter
   * @param {string} userId 
   * @param {'messages'|'chats'|'sessions'} type 
   * @param {number} amount (default 1)
   */
  async incrementUsage(userId, type, amount = 1) {
    try {
      const plan = await this.getUserPlan(userId)
      if (!plan) throw new Error('No plan found for user')

      // Ensure record exists
      const usage = await this.ensureUsageRecord(userId, plan.period_start, plan.period_end)
      
      const column = type === 'messages' ? 'messages_count' : type === 'chats' ? 'chats_count' : 'sessions_count'
      
      await db.pool.query(`UPDATE usage SET ${column} = ${column} + $1 WHERE id=$2`, [amount, usage.id])
      
      console.log(`[UserService] Incremented ${type} by ${amount} for user ${userId}`)
      return true
    } catch (e) {
      console.error('UserService.incrementUsage failed:', e)
      throw e
    }
  }

  /**
   * Update last_alerted_at timestamp for usage record
   * @param {string} usageId 
   */
  async updateLastAlerted(usageId) {
    try {
      await db.pool.query('UPDATE usage SET last_alerted_at=CURRENT_TIMESTAMP WHERE id=$1', [usageId])
    } catch (e) {
      console.error('UserService.updateLastAlerted failed:', e)
    }
  }
}

module.exports = new UserService()
