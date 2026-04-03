const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()
const db = require('./db')
const { chatCompletion } = require('./ai')

const AGENT_DOCS_DIR = path.join(__dirname, '..', 'uploads', 'agent-docs')
if (!fs.existsSync(AGENT_DOCS_DIR)) fs.mkdirSync(AGENT_DOCS_DIR, { recursive: true })

const docStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, AGENT_DOCS_DIR)
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, `agent-doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const upload = multer({
  storage: docStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
})

async function ensureAgentOwnership(agentId, userId) {
  const check = await db.pool.query('SELECT * FROM agents WHERE id=$1', [agentId])
  if (!check.rows || !check.rows.length) return { error: 'not found', status: 404 }
  if (check.rows[0].user_id !== userId) return { error: 'forbidden', status: 403 }
  return { agent: check.rows[0] }
}

async function buildAgentKnowledge(agentId) {
  const memoryRes = await db.pool.query('SELECT question,answer FROM agent_memory WHERE agent_id=$1 ORDER BY created_at ASC', [agentId])
  const docsRes = await db.pool.query('SELECT file_name, extracted_text FROM agent_documents WHERE agent_id=$1 ORDER BY created_at ASC', [agentId])

  const memoryBlock = memoryRes.rows && memoryRes.rows.length
    ? `\n\n## Saved Q&A Memory\n${memoryRes.rows.map((item, index) => `${index + 1}. Q: ${item.question}\nA: ${item.answer}`).join('\n\n')}`
    : ''

  const docsBlock = docsRes.rows && docsRes.rows.length
    ? `\n\n## Uploaded Documents\n${docsRes.rows.map((item, index) => `${index + 1}. ${item.file_name}\n${String(item.extracted_text || '').slice(0, 4000)}`).join('\n\n')}`
    : ''

  return `${memoryBlock}${docsBlock}`.trim()
}

function applyResponseStyle(systemPrompt = '') {
  const styleGuide = `
## Messaging Style Rules
- Reply naturally, like a human chatting on WhatsApp.
- For simple greetings like "hi", "hey", "hello", or "salam", keep the reply short and warm.
- Do not introduce yourself, company details, prices, business hours, or service list unless the user asks for them or the context clearly requires them.
- Do not give promotional information in the first reply to a casual greeting.
- If the user says they saw an ad or shows initial interest, respond conversationally and ask what they are looking for before mentioning pricing.
- Only mention price, packages, monthly plans, or rates when the user explicitly asks about cost, price, charges, package, budget, or plan details.
- Prefer one or two short sentences for casual messages.
- Only provide detailed business information when the user asks a relevant follow-up question.
`.trim()

  return [styleGuide, systemPrompt].filter(Boolean).join('\n\n')
}

router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub
    const r = await db.pool.query('SELECT * FROM agents WHERE user_id=$1 ORDER BY created_at DESC', [userId])
    res.json({ agents: r.rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, webhook_url, system_prompt, provider, model, api_key, base_url, excluded_numbers } = req.body
    const userId = req.user && req.user.sub ? req.user.sub : req.body.userId

    try {
      const sub = await db.pool.query('SELECT s.id,s.plan_id,p.max_agents FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1', [userId])
      if (sub.rows && sub.rows.length) {
        const p = sub.rows[0]
        if (p.max_agents) {
          const used = await db.pool.query('SELECT COUNT(*) as cnt FROM agents WHERE user_id=$1', [userId])
          const cnt = used.rows && used.rows[0] ? Number(used.rows[0].cnt) : 0
          if (cnt >= p.max_agents) return res.status(403).json({ error: 'agent limit reached for your plan' })
        }
      }
    } catch (e) { console.error('plan check failed', e && e.message) }

    const id = uuidv4()
    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [id, userId, name, webhook_url])
    try {
      await db.pool.query('CREATE TABLE IF NOT EXISTS agents_meta (agent_id TEXT PRIMARY KEY, system_prompt TEXT, provider TEXT, model TEXT, api_key TEXT, base_url TEXT, excluded_numbers TEXT)')
    } catch (_e) {}
    await db.pool.query(
      'REPLACE INTO agents_meta(agent_id,system_prompt,provider,model,api_key,base_url,excluded_numbers) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [id, system_prompt || null, provider || 'openai', model || 'openai', api_key || null, base_url || null, excluded_numbers || null]
    )
    res.json({ id, name, webhook_url })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/run', async (req, res) => {
  try {
    const agentId = req.params.id
    const { messages } = req.body
    const r = await db.pool.query('SELECT system_prompt,provider,model,api_key,base_url FROM agents_meta WHERE agent_id=$1', [agentId])
    const meta = r.rows && r.rows[0]
    const knowledge = await buildAgentKnowledge(agentId)
    const systemPrompt = applyResponseStyle(`${meta ? meta.system_prompt || '' : ''}${knowledge ? `\n\n${knowledge}` : ''}`.trim())
    const provider = meta ? meta.provider : 'openai'
    const model = meta ? meta.model : 'openai'
    const apiKey = meta ? meta.api_key : null
    const baseURL = meta ? meta.base_url : null

    const airesp = await chatCompletion({ provider, model, systemPrompt, messages, apiKey, baseURL })
    res.json({ reply: airesp })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/bind-session', async (req, res) => {
  try {
    const agentId = req.params.id
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' })
    await db.pool.query('UPDATE sessions SET agent_id=$1 WHERE id=$2', [agentId, sessionId])
    const manager = require('./connectionManager').ConnectionManagerInstance
    if (manager && manager.sessions && manager.sessions.has(sessionId)) {
      const s = manager.sessions.get(sessionId)
      s.agentId = agentId
      manager.sessions.set(sessionId, s)
    }
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const owned = await ensureAgentOwnership(id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })

    const agent = owned.agent
    const meta = await db.pool.query('SELECT system_prompt,provider,model,api_key,base_url,excluded_numbers FROM agents_meta WHERE agent_id=$1', [id])
    if (meta.rows && meta.rows.length) {
      agent.system_prompt = meta.rows[0].system_prompt
      agent.provider = meta.rows[0].provider
      agent.model = meta.rows[0].model
      agent.api_key = meta.rows[0].api_key
      agent.base_url = meta.rows[0].base_url
      agent.excluded_numbers = meta.rows[0].excluded_numbers
    } else {
      agent.system_prompt = null
      agent.provider = 'openai'
      agent.model = 'openai'
      agent.api_key = null
      agent.base_url = null
      agent.excluded_numbers = null
    }

    const memory = await db.pool.query('SELECT id,question,answer,created_at FROM agent_memory WHERE agent_id=$1 ORDER BY created_at DESC', [id])
    const documents = await db.pool.query('SELECT id,file_name,file_url,file_type,created_at FROM agent_documents WHERE agent_id=$1 ORDER BY created_at DESC', [id])

    res.json({ agent, memory: memory.rows || [], documents: documents.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name, webhook_url, system_prompt, provider, model, api_key, base_url, excluded_numbers } = req.body
    const owned = await ensureAgentOwnership(id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })

    if (name) await db.pool.query('UPDATE agents SET name=$1 WHERE id=$2', [name, id])
    if (webhook_url !== undefined) await db.pool.query('UPDATE agents SET webhook_url=$1 WHERE id=$2', [webhook_url, id])

    if (system_prompt !== undefined || provider !== undefined || model !== undefined || api_key !== undefined || base_url !== undefined || excluded_numbers !== undefined) {
      const meta = await db.pool.query('SELECT agent_id FROM agents_meta WHERE agent_id=$1', [id])
      if (meta.rows && meta.rows.length) {
        if (system_prompt !== undefined) await db.pool.query('UPDATE agents_meta SET system_prompt=$1 WHERE agent_id=$2', [system_prompt, id])
        if (provider !== undefined) await db.pool.query('UPDATE agents_meta SET provider=$1 WHERE agent_id=$2', [provider, id])
        if (model !== undefined) await db.pool.query('UPDATE agents_meta SET model=$1 WHERE agent_id=$2', [model, id])
        if (api_key !== undefined) await db.pool.query('UPDATE agents_meta SET api_key=$1 WHERE agent_id=$2', [api_key || null, id])
        if (base_url !== undefined) await db.pool.query('UPDATE agents_meta SET base_url=$1 WHERE agent_id=$2', [base_url || null, id])
        if (excluded_numbers !== undefined) await db.pool.query('UPDATE agents_meta SET excluded_numbers=$1 WHERE agent_id=$2', [excluded_numbers, id])
      } else {
        await db.pool.query(
          'INSERT INTO agents_meta(agent_id,system_prompt,provider,model,api_key,base_url,excluded_numbers) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [id, system_prompt || null, provider || 'openai', model || 'openai', api_key || null, base_url || null, excluded_numbers || null]
        )
      }
    }

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id/memory', async (req, res) => {
  try {
    const owned = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    const memory = await db.pool.query('SELECT id,question,answer,created_at FROM agent_memory WHERE agent_id=$1 ORDER BY created_at DESC', [req.params.id])
    res.json({ memory: memory.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/memory', async (req, res) => {
  try {
    const owned = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    const { question, answer } = req.body
    if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' })
    const id = uuidv4()
    await db.pool.query('INSERT INTO agent_memory(id,agent_id,question,answer,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)', [id, req.params.id, question, answer])
    res.json({ ok: true, id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id/memory/:memoryId', async (req, res) => {
  try {
    const owned = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    const { question, answer } = req.body
    await db.pool.query('UPDATE agent_memory SET question=$1, answer=$2 WHERE id=$3 AND agent_id=$4', [question, answer, req.params.memoryId, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id/memory/:memoryId', async (req, res) => {
  try {
    const owned = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    await db.pool.query('DELETE FROM agent_memory WHERE id=$1 AND agent_id=$2', [req.params.memoryId, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id/documents', async (req, res) => {
  try {
    const owned = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    const documents = await db.pool.query('SELECT id,file_name,file_url,file_type,created_at FROM agent_documents WHERE agent_id=$1 ORDER BY created_at DESC', [req.params.id])
    res.json({ documents: documents.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const owned = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const fileId = uuidv4()
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/agent-docs/${req.file.filename}`
    const extractedText = `Document: ${req.file.originalname}\nType: ${req.file.mimetype}\nThis uploaded document is available as background reference.`

    await db.pool.query(
      'INSERT INTO agent_documents(id,agent_id,file_name,file_url,file_type,extracted_text,created_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)',
      [fileId, req.params.id, req.file.originalname, fileUrl, req.file.mimetype, extractedText]
    )

    res.json({ ok: true, document: { id: fileId, file_name: req.file.originalname, file_url: fileUrl, file_type: req.file.mimetype } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id/documents/:documentId', async (req, res) => {
  try {
    const owned = await ensureAgentOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    const doc = await db.pool.query('SELECT file_url FROM agent_documents WHERE id=$1 AND agent_id=$2', [req.params.documentId, req.params.id])
    await db.pool.query('DELETE FROM agent_documents WHERE id=$1 AND agent_id=$2', [req.params.documentId, req.params.id])

    if (doc.rows && doc.rows[0] && doc.rows[0].file_url) {
      const filePath = path.join(__dirname, '..', doc.rows[0].file_url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, ''))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
