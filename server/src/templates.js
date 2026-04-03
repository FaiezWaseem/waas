const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('./db')
const { BUILTIN_TEMPLATES } = require('./message_templates')

const router = express.Router()

async function ensureOwnership(id, userId) {
  const result = await db.pool.query('SELECT * FROM message_templates WHERE id=$1 AND user_id=$2', [id, userId])
  return result.rows && result.rows[0] ? result.rows[0] : null
}

router.get('/', async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT id,name,category,body,created_at,updated_at FROM message_templates WHERE user_id=$1 ORDER BY updated_at DESC, created_at DESC',
      [req.user.sub]
    )

    const builtins = BUILTIN_TEMPLATES.map((template) => ({
      ...template,
      created_at: null,
      updated_at: null,
    }))

    res.json({ templates: [...builtins, ...(result.rows || [])] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, category, body } = req.body
    if (!name || !body) return res.status(400).json({ error: 'name and body are required' })

    const id = uuidv4()
    await db.pool.query(
      'INSERT INTO message_templates(id,user_id,name,category,body,created_at,updated_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      [id, req.user.sub, name, category || null, body]
    )
    res.json({ ok: true, id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const existing = await ensureOwnership(req.params.id, req.user.sub)
    if (!existing) return res.status(404).json({ error: 'Template not found' })

    const { name, category, body } = req.body
    if (name !== undefined) await db.pool.query('UPDATE message_templates SET name=$1 WHERE id=$2', [name, req.params.id])
    if (category !== undefined) await db.pool.query('UPDATE message_templates SET category=$1 WHERE id=$2', [category || null, req.params.id])
    if (body !== undefined) await db.pool.query('UPDATE message_templates SET body=$1 WHERE id=$2', [body, req.params.id])
    await db.pool.query('UPDATE message_templates SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const existing = await ensureOwnership(req.params.id, req.user.sub)
    if (!existing) return res.status(404).json({ error: 'Template not found' })
    await db.pool.query('DELETE FROM message_templates WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
