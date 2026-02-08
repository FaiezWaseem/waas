require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const { ConnectionManager } = require('./src/connectionManager')
const ai = require('./src/ai')

const app = express()
app.use(bodyParser.json())

const db = require('./src/db')
const auth = require('./src/auth')
// start scheduled jobs
try{ require('./src/cron') }catch(e){ console.error('cron load failed', e && e.message) }

const { ConnectionManagerInstance } = require('./src/connectionManager')
const manager = ConnectionManagerInstance

// init db
db.init().catch(console.error)


app.get('/health', (req, res) => res.json({ ok: true }))

// admin-only listing of all sessions
app.use('/admin', auth.verifyToken, auth.requireRole('admin'), require('./src/admin'))

// create agent (a user-level webhook/agent tied to a user)
app.use('/agents', auth.verifyToken, require('./src/agents'))

// legacy route (create agent) kept for compatibility
app.post('/agents', auth.verifyToken, async (req,res)=>{
  try{
    const { name, webhook_url, system_prompt, model } = req.body
    const userId = req.user.sub

    // check plan limit for agents
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
    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url) VALUES($1,$2,$3,$4)',[id,req.user.sub,name,webhook_url])
    res.json({ id, name, webhook_url })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}) // required: creates agent and enforces plan limits
  try{
    const router = require('./src/agents')
    // delegate to router's POST /
    app.use('/_tmp_agents_delegate', auth.verifyToken, require('./src/agents'))
    // forward request
    req.url = '/'
    return router.handle(req,res)
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})
  try{
    const { name, webhook_url } = req.body
    const id = require('uuid').v4()
    await db.pool.query('INSERT INTO agents(id,user_id,name,webhook_url) VALUES($1,$2,$3,$4)',[id,req.user.sub,name,webhook_url])
    res.json({ id, name, webhook_url })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/agents', auth.verifyToken, async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT id,name,webhook_url,created_at FROM agents WHERE user_id=$1',[req.user.sub])
    res.json({ agents: r.rows })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/admin/sessions', auth.verifyToken, auth.requireRole('admin'), async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT id,user_id,status,created_at FROM sessions ORDER BY created_at DESC')
    res.json({ sessions: r.rows })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})


// auth routes
app.use('/subscriptions', auth.verifyToken, require('./src/subscriptions'))

// admin endpoints for plan management
app.get('/admin/plans', auth.verifyToken, auth.requireRole('admin'), async (req,res)=>{
  try{
    const db = require('./src/db')
    const r = await db.pool.query('SELECT id,name,max_sessions,max_agents,max_messages,max_chats FROM plans')
    res.json({ plans: r.rows })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

app.post('/admin/plans', auth.verifyToken, auth.requireRole('admin'), async (req,res)=>{
  try{
    const { id,name,max_sessions,max_agents,max_messages,max_chats } = req.body
    const db = require('./src/db')
    const pid = id || require('uuid').v4()
    await db.pool.query('INSERT OR REPLACE INTO plans(id,name,max_sessions,max_agents,max_messages,max_chats) VALUES($1,$2,$3,$4,$5,$6)',[pid,name,max_sessions,max_agents,max_messages,max_chats])
    res.json({ ok:true, id:pid })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

app.post('/auth/register', async (req,res)=>{
  try{
    const { email,password,name } = req.body
    const u = await auth.createUser({ email,password,name })
    res.json({ user: u })
  }catch(e){
    console.error(e)
    res.status(400).json({ error: e.message })
  }
})

app.post('/auth/login', async (req,res)=>{
  try{
    const { email,password } = req.body
    const out = await auth.authenticate({ email,password })
    res.json(out)
  }catch(e){
    console.error(e)
    res.status(401).json({ error: e.message })
  }
})


// create a session (returns session id and qr)
app.post('/sessions', auth.verifyToken, async (req, res) => {
  try {
    const { agentId } = req.body
    const session = await manager.createSession(req.user.sub, agentId)
    res.json(session)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// get session status
app.get('/sessions/:id', auth.verifyToken, async (req, res) => {
  const status = manager.getSessionStatus(req.params.id)
  res.json({ status })
})

app.post('/sessions', async (req, res) => {
  try {
    const session = await manager.createSession()
    res.json(session)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// get session status
app.get('/sessions/:id', async (req, res) => {
  const status = manager.getSessionStatus(req.params.id)
  res.json({ status })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log('Waas server listening on', port))
