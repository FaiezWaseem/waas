require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require("socket.io")
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }
})
app.use(cors({
  origin: '*', // Allow ALL origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false // Disable credentials to allow wildcard origin
}))
// Enable pre-flight for all routes
app.options('*', cors())

app.use(bodyParser.json())

const db = require('./src/db')
const auth = require('./src/auth')
// start scheduled jobs
try{ require('./src/cron') }catch(e){ console.error('cron load failed', e && e.message) }

const { ConnectionManagerInstance } = require('./src/connectionManager')
const manager = ConnectionManagerInstance
manager.initSocketIO(io)

// init db
db.init().then(() => {
  console.log('Database initialized')
  // restore sessions
  manager.restoreSessions().catch(console.error)
}).catch(console.error)

app.get('/health', (req, res) => res.json({ ok: true }))

// blog routes
app.use('/blog', require('./src/blog'))

// admin-only listing of all sessions
app.use('/admin', auth.verifyToken, auth.requireRole('admin'), require('./src/admin'))

// mount agents router (standard CRUD for agents)
app.use('/agents', auth.verifyToken, require('./src/agents'))

// client dashboard routes
app.use('/client', auth.verifyToken, require('./src/client'))

// legacy route (create agent) kept for compatibility - POST /agents
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
          const cnt = used.rows && used.rows[0] ? Number(used.rows[0].cnt) : 0
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
    const r = await db.pool.query('SELECT id,name,max_sessions,max_agents,max_messages,max_chats FROM plans')
    res.json({ plans: r.rows })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

app.post('/admin/plans', auth.verifyToken, auth.requireRole('admin'), async (req,res)=>{
  try{
    const { id,name,max_sessions,max_agents,max_messages,max_chats } = req.body
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

// create a session (returns session id and qr) - authenticated
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

// list user sessions - authenticated
app.get('/sessions', auth.verifyToken, async (req, res) => {
  try {
    // Join with agents table to get agent name if needed
    const r = await db.pool.query(`
      SELECT s.id, s.status, s.created_at, s.agent_id, a.name as agent_name 
      FROM sessions s 
      LEFT JOIN agents a ON s.agent_id = a.id 
      WHERE s.user_id=$1 
      ORDER BY s.created_at DESC
    `, [req.user.sub])
    
    // Enrich with live status from manager if available
    const sessions = r.rows.map(row => {
      const liveStatus = manager.getSessionStatus(row.id)
      return { ...row, status: liveStatus || row.status }
    })
    
    res.json({ sessions })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// get session status - authenticated
app.get('/sessions/:id', auth.verifyToken, async (req, res) => {
  try{
    const id = req.params.id
    // get from db to verify ownership
    const r = await db.pool.query('SELECT * FROM sessions WHERE id=$1', [id])
    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'not found' })
    if (r.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })

    const session = r.rows[0]
    const liveStatus = manager.getSessionStatus(id)
    
    // get agent name if attached
    if (session.agent_id) {
      const a = await db.pool.query('SELECT name FROM agents WHERE id=$1', [session.agent_id])
      if (a.rows && a.rows.length) session.agent_name = a.rows[0].name
    }

    if (liveStatus) {
      session.status = liveStatus.status
      session.qr = liveStatus.qr
    }
    
    // add dynamic fields
    // messages count
    const m = await db.pool.query('SELECT COUNT(*) as cnt FROM messages WHERE session_id=$1', [id])
    session.messageCount = m.rows[0].cnt
    
    // ensure new fields are present even if null
    session.device = session.device || 'Unknown'
    session.batteryLevel = session.battery_level || 0
    session.platform = session.platform || 'WhatsApp'

    res.json({ session })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// get chats for a session
app.get('/sessions/:id/chats', auth.verifyToken, async (req, res) => {
  try {
    const id = req.params.id
    // verify ownership
    const r = await db.pool.query('SELECT user_id FROM sessions WHERE id=$1', [id])
    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'not found' })
    if (r.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })

    const chats = await manager.getChats(id)
    res.json({ chats })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// get messages for a chat
app.get('/sessions/:id/chats/:chatId/messages', auth.verifyToken, async (req, res) => {
  try {
    const { id, chatId } = req.params
    // verify ownership
    const r = await db.pool.query('SELECT user_id FROM sessions WHERE id=$1', [id])
    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'not found' })
    if (r.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })

    const messages = await manager.getMessages(id, chatId)
    res.json({ messages })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// delete session - authenticated
app.delete('/sessions/:id', auth.verifyToken, async (req, res) => {
  try {
    const id = req.params.id
    // verify ownership
    const r = await db.pool.query('SELECT user_id FROM sessions WHERE id=$1', [id])
    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'not found' })
    if (r.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })

    await manager.deleteSession(id)
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// get user profile
app.get('/me', auth.verifyToken, async (req, res) => {
  try {
    const r = await db.pool.query('SELECT id, email, name, created_at FROM users WHERE id=$1', [req.user.sub])
    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'User not found' })
    res.json({ user: r.rows[0] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// update user profile
app.patch('/me', auth.verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body
    if (name) await db.pool.query('UPDATE users SET name=$1 WHERE id=$2', [name, req.user.sub])
    if (email) await db.pool.query('UPDATE users SET email=$1 WHERE id=$2', [email, req.user.sub])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

const port = Number(process.env.PORT) || 4000

function startServer(p){
  const srv = server.listen(p, () => console.log('Waas server listening on', p))
  srv.on('error', (e)=>{
    if (e && e.code === 'EADDRINUSE'){
      console.warn(`Port ${p} in use, trying ${p+1}...`)
      setTimeout(()=>startServer(p+1),100)
    }else{
      console.error('Server error', e)
      process.exit(1)
    }
  })
}

startServer(port)
