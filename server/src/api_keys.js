const express = require('express')
const router = express.Router()
const db = require('./db')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')

// List API keys
router.get('/', async (req, res) => {
  try {
    const r = await db.pool.query(
      'SELECT id, name, last_used_at, created_at, substr(key_hash, 1, 10) as prefix FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.sub]
    )
    // We don't return the full hash, just metadata. The prefix is just for debugging if needed, strictly we shouldn't even return that.
    // Let's just return metadata.
    const keys = r.rows.map(k => ({
      id: k.id,
      name: k.name,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
      display: 'sk_live_...' 
    }))
    res.json({ keys })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Create API key
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    const userId = req.user.sub
    
    // Check plan limits (optional, maybe limit 5 keys per user)
    const count = await db.pool.query('SELECT COUNT(*) as cnt FROM api_keys WHERE user_id=$1', [userId])
    if (count.rows[0].cnt >= 10) {
      return res.status(403).json({ error: 'Maximum of 10 API keys allowed' })
    }

    const key = 'sk_live_' + crypto.randomBytes(24).toString('hex')
    const hash = crypto.createHash('sha256').update(key).digest('hex')
    const id = uuidv4()

    await db.pool.query(
      'INSERT INTO api_keys (id, user_id, key_hash, name) VALUES ($1, $2, $3, $4)',
      [id, userId, hash, name || 'Default Key']
    )

    // Return the key ONLY ONCE
    res.json({ id, name, key })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Revoke API key
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await db.pool.query('DELETE FROM api_keys WHERE id=$1 AND user_id=$2', [id, req.user.sub])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
