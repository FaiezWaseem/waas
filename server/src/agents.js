const express = require('express')
const router = express.Router()
const db = require('./db')
const { chatCompletion } = require('./ai')

// list agents for user
router.get('/', async (req,res)=>{
  try{
    const userId = req.user.sub
    const r = await db.pool.query('SELECT * FROM agents WHERE user_id=$1 ORDER BY created_at DESC', [userId])
    res.json({ agents: r.rows })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// create an agent with optional system prompt
router.post('/', async (req,res)=>{
  try{
    const { name, webhook_url, system_prompt, model, excluded_numbers } = req.body
    // prefer provided userId only if admin; otherwise use authenticated user
    const userId = req.user && req.user.sub ? req.user.sub : req.body.userId

    // check user's subscription plan limits: max_agents
    try{
      const sub = await db.pool.query('SELECT s.id,s.plan_id,p.max_agents FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
      if (sub.rows && sub.rows.length){
        const p = sub.rows[0]
        if (p.max_agents){
          const used = await db.pool.query('SELECT COUNT(*) as cnt FROM agents WHERE user_id=$1',[userId])
          const cnt = used.rows && used.rows[0] ? Number(used.rows[0].cnt) : 0
          if (cnt >= p.max_agents) return res.status(403).json({ error: 'agent limit reached for your plan' })
        }
      }
    }catch(e){ console.error('plan check failed', e && e.message) }

    const id = require('uuid').v4()

    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',[id,userId,name,webhook_url])
    // store system prompt in a lightweight table (agents_meta)
    try{
      await db.pool.query('CREATE TABLE IF NOT EXISTS agents_meta (agent_id TEXT PRIMARY KEY, system_prompt TEXT, model TEXT, excluded_numbers TEXT)')
    }catch(e){/* ignore */}
    await db.pool.query('INSERT OR REPLACE INTO agents_meta(agent_id,system_prompt,model,excluded_numbers) VALUES($1,$2,$3,$4)',[id,system_prompt||null,model||'gpt-3.5-turbo',excluded_numbers||null])
    res.json({ id, name, webhook_url })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// run agent — given agent id and conversation messages (from user), return AI response
router.post('/:id/run', async (req,res)=>{
  try{
    const agentId = req.params.id
    const { messages } = req.body // [{ role: 'user', content: '...' }]
    const r = await db.pool.query('SELECT system_prompt,model FROM agents_meta WHERE agent_id=$1',[agentId])
    const meta = r.rows && r.rows[0]
    const systemPrompt = meta ? meta.system_prompt : ''
    const model = meta ? meta.model : 'gpt-3.5-turbo'

    const airesp = await chatCompletion({ model, systemPrompt, messages })
    // optionally persist or forward to webhook — for now return
    res.json({ reply: airesp })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// bind session endpoint (attach agent)
router.post('/:id/bind-session', async (req,res)=>{
  try{
    const agentId = req.params.id
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' })
    await db.pool.query('UPDATE sessions SET agent_id=$1 WHERE id=$2',[agentId,sessionId])
    // update in-memory
    const manager = require('./connectionManager').ConnectionManagerInstance
    if (manager && manager.sessions && manager.sessions.has(sessionId)){
      const s = manager.sessions.get(sessionId)
      s.agentId = agentId
      manager.sessions.set(sessionId,s)
    }
    res.json({ ok: true })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// get single agent
router.get('/:id', async (req,res)=>{
  try{
    const id = req.params.id
    // verify ownership
    const check = await db.pool.query('SELECT * FROM agents WHERE id=$1',[id])
    if (!check.rows || !check.rows.length) return res.status(404).json({ error: 'not found' })
    if (check.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })

    const agent = check.rows[0]
    
    // get meta
    const meta = await db.pool.query('SELECT system_prompt,model,excluded_numbers FROM agents_meta WHERE agent_id=$1',[id])
    if (meta.rows && meta.rows.length) {
      agent.system_prompt = meta.rows[0].system_prompt
      agent.model = meta.rows[0].model
      agent.excluded_numbers = meta.rows[0].excluded_numbers
    } else {
      agent.system_prompt = null
      agent.model = 'gpt-3.5-turbo'
      agent.excluded_numbers = null
    }
    
    res.json({ agent })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// update agent
router.patch('/:id', async (req,res)=>{
  try{
    const id = req.params.id
    const { name, webhook_url, system_prompt, model, excluded_numbers } = req.body
    
    // verify ownership
    const check = await db.pool.query('SELECT user_id FROM agents WHERE id=$1',[id])
    if (!check.rows || !check.rows.length) return res.status(404).json({ error: 'not found' })
    if (check.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })

    if (name) await db.pool.query('UPDATE agents SET name=$1 WHERE id=$2', [name, id])
    if (webhook_url !== undefined) await db.pool.query('UPDATE agents SET webhook_url=$1 WHERE id=$2', [webhook_url, id])

    if (system_prompt !== undefined || model !== undefined || excluded_numbers !== undefined) {
       // check if meta exists
       const meta = await db.pool.query('SELECT agent_id FROM agents_meta WHERE agent_id=$1', [id])
       if (meta.rows && meta.rows.length) {
         if (system_prompt !== undefined) await db.pool.query('UPDATE agents_meta SET system_prompt=$1 WHERE agent_id=$2', [system_prompt, id])
         if (model !== undefined) await db.pool.query('UPDATE agents_meta SET model=$1 WHERE agent_id=$2', [model, id])
         if (excluded_numbers !== undefined) await db.pool.query('UPDATE agents_meta SET excluded_numbers=$1 WHERE agent_id=$2', [excluded_numbers, id])
       } else {
         await db.pool.query('INSERT INTO agents_meta(agent_id,system_prompt,model,excluded_numbers) VALUES($1,$2,$3,$4)', [id, system_prompt||null, model||'gpt-3.5-turbo', excluded_numbers||null])
       }
    }
    
    res.json({ ok: true })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
