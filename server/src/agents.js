const express = require('express')
const router = express.Router()
const db = require('./db')
const { chatCompletion } = require('./ai')

// create an agent with optional system prompt
router.post('/', async (req,res)=>{
  try{
    const { name, webhook_url, system_prompt, model } = req.body
    // prefer provided userId only if admin; otherwise use authenticated user
    const userId = req.user && req.user.sub ? req.user.sub : req.body.userId

    // check user's subscription plan limits: max_agents
    try{
      const sub = await db.pool.query('SELECT s.id,s.plan_id,p.max_agents FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
      if (sub.rows && sub.rows.length){
        const p = sub.rows[0]
        if (p.max_agents){
          const used = await db.pool.query('SELECT COUNT(*) as cnt FROM agents WHERE user_id=$1',[userId])
          const cnt = used.rows && used.rows[0] ? used.rows[0].cnt : 0
          if (cnt >= p.max_agents) return res.status(403).json({ error: 'agent limit reached for your plan' })
        }
      }
    }catch(e){ console.error('plan check failed', e && e.message) }

    const id = require('uuid').v4()
    // enforce agent limit from subscription
    try{
      const db2 = require('./db')
      const subRes = await db2.pool.query('SELECT s.period_start,p.max_agents FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
      if (subRes.rows && subRes.rows.length){
        const p = subRes.rows[0]
        if (p.max_agents){
          const cur = await db2.pool.query('SELECT COUNT(*) as cnt FROM agents WHERE user_id=$1',[userId])
          const cnt = cur.rows && cur.rows[0] ? cur.rows[0].cnt : 0
          if (cnt >= p.max_agents) return res.status(403).json({ error: 'agent limit reached for your plan' })
        }
      }
    }catch(e){ console.error('agent limit enforcement failed',e && e.message) }

    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',[id,userId,name,webhook_url])
    // store system prompt in a lightweight table (agents_meta)
    try{
      await db.pool.query('CREATE TABLE IF NOT EXISTS agents_meta (agent_id TEXT PRIMARY KEY, system_prompt TEXT, model TEXT)')
    }catch(e){/* ignore */}
    await db.pool.query('INSERT OR REPLACE INTO agents_meta(agent_id,system_prompt,model) VALUES($1,$2,$3)',[id,system_prompt||null,model||'gpt-3.5-turbo'])
    res.json({ id, name, webhook_url })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})
  try{
    const { name, webhook_url, system_prompt, model } = req.body
    const userId = req.user && req.user.sub ? req.user.sub : req.body.userId

    // enforce agent limit based on subscription
    try{
      const db2 = require('./db')
      const subRes = await db2.pool.query('SELECT p.max_agents FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
      if (subRes.rows && subRes.rows.length){
        const maxAgents = subRes.rows[0].max_agents
        if (maxAgents){
          const cur = await db2.pool.query('SELECT COUNT(*) as cnt FROM agents WHERE user_id=$1',[userId])
          const cnt = cur.rows && cur.rows[0] ? cur.rows[0].cnt : 0
          if (cnt >= maxAgents) return res.status(400).json({ error: 'agent limit reached for your plan' })
        }
      }
    }catch(e){ console.error('agent limit check failed', e && e.message) }

    const id = require('uuid').v4()
    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',[id,userId,name,webhook_url])
    // store system prompt in a lightweight table (agents_meta)
    try{
      await db.pool.query('CREATE TABLE IF NOT EXISTS agents_meta (agent_id TEXT PRIMARY KEY, system_prompt TEXT, model TEXT)')
    }catch(e){/* ignore */}
    await db.pool.query('INSERT OR REPLACE INTO agents_meta(agent_id,system_prompt,model) VALUES($1,$2,$3)',[id,system_prompt||null,model||'gpt-3.5-turbo'])
    res.json({ id, name, webhook_url })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})
  try{
    const { name, webhook_url, system_prompt, model } = req.body
    // prefer provided userId only if admin; otherwise use authenticated user
    const userId = req.user && req.user.sub ? req.user.sub : req.body.userId
    const id = require('uuid').v4()
    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',[id,userId,name,webhook_url])
    // store system prompt in a lightweight table (agents_meta)
    try{
      await db.pool.query('CREATE TABLE IF NOT EXISTS agents_meta (agent_id TEXT PRIMARY KEY, system_prompt TEXT, model TEXT)')
    }catch(e){/* ignore */}
    await db.pool.query('INSERT OR REPLACE INTO agents_meta(agent_id,system_prompt,model) VALUES($1,$2,$3)',[id,system_prompt||null,model||'gpt-3.5-turbo'])
    res.json({ id, name, webhook_url })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})
  try{
    const { userId, name, webhook_url, system_prompt, model } = req.body
    const id = require('uuid').v4()
    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url,created_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',[id,userId,name,webhook_url])
    // store system prompt in a lightweight table (agents_meta)
    try{
      await db.pool.query('CREATE TABLE IF NOT EXISTS agents_meta (agent_id TEXT PRIMARY KEY, system_prompt TEXT, model TEXT)')
    }catch(e){/* ignore */}
    await db.pool.query('INSERT OR REPLACE INTO agents_meta(agent_id,system_prompt,model) VALUES($1,$2,$3)',[id,system_prompt||null,model||'gpt-3.5-turbo'])
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

module.exports = router
