const { Boom } = require('@hapi/boom')
const { v4: uuidv4 } = require('uuid')

// helper: check session limit before creating
async function checkSessionLimit(userId){
  try{
    const db = require('./db')
    const sub = await db.pool.query('SELECT s.id,s.plan_id,p.max_sessions FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
    if (sub.rows && sub.rows.length){
      const p = sub.rows[0]
      if (p.max_sessions){
        const used = await db.pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id=$1',[userId])
        const cnt = used.rows && used.rows[0] ? used.rows[0].cnt : 0
        return cnt < p.max_sessions
      }
    }
  }catch(e){ console.error('session limit check failed', e && e.message) }
  return true
}

class ConnectionManager {
  constructor() {
    this.sessions = new Map() // id => { sock, status, qr, userId, agentId }
    this.io = null
  }

  initSocketIO(io) {
    this.io = io
    this.io.on('connection', (socket) => {
      console.log('Client connected to socket.io')
      socket.on('join_session', (sessionId) => {
        socket.join(`session:${sessionId}`)
        console.log(`Socket joined session:${sessionId}`)
      })
    })
  }

  async createSession(userId, agentId){
    // enforce session quota if userId provided
    if (userId){
      const ok = await checkSessionLimit(userId)
      if (!ok) throw new Error('session limit reached for your plan')
    }

    // enforce agent/session creation atomically in db to avoid races (best-effort)
    try{
      const db = require('./db')
      if (userId){
        const subRes = await db.pool.query('SELECT s.period_start,p.max_sessions FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
        if (subRes.rows && subRes.rows.length){
          const p = subRes.rows[0]
          if (p.max_sessions){
            const cur = await db.pool.query('SELECT COUNT(*) as cnt FROM sessions WHERE user_id=$1',[userId])
            const cnt = cur.rows && cur.rows[0] ? cur.rows[0].cnt : 0
            if (cnt >= p.max_sessions) throw new Error('session limit reached for your plan')
          }
        }
      }
    }catch(e){ /* if db check fails, fallback to previous logic */ }


    const id = uuidv4()
    
    // persist in db first
    try{
      const db = require('./db')
      await db.pool.query('INSERT INTO sessions(id,user_id,agent_id,status,qr,auth_path) VALUES($1,$2,$3,$4,$5,$6)',[id,userId,agentId||null,'init',null,`./sessions/${id}`])
    }catch(e){ 
      console.error('db save failed',e.message) 
      throw e
    }

    // init socket
    await this._initSocket(id, userId, agentId)

    return { id, status: 'init', qr: null }
  }

  async deleteSession(id) {
    // 1. Close socket if exists
    const s = this.sessions.get(id)
    if (s && s.sock) {
      try {
        s.sock.end(undefined)
      } catch (e) {
        console.error(`Error closing socket for session ${id}`, e)
      }
    }
    this.sessions.delete(id)

    // 2. Delete from DB
    try {
      const db = require('./db')
      await db.pool.query('DELETE FROM sessions WHERE id=$1', [id])
    } catch (e) {
      console.error(`Error deleting session ${id} from DB`, e)
      throw e
    }

    // 3. Delete file system folder
    const fs = require('fs')
    const path = require('path')
    const sessionDir = path.resolve(__dirname, `../sessions/${id}`)
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true })
      } catch (e) {
        console.error(`Error deleting session directory ${sessionDir}`, e)
      }
    }

    return true
  }

  async restoreSessions() {
    try {
        const db = require('./db')
        const res = await db.pool.query("SELECT * FROM sessions")
        for (const session of res.rows) {
            // Only restore if we don't already have it in memory
            if (!this.sessions.has(session.id)) {
                console.log(`Restoring session ${session.id}`)
                // We don't await this so they restore in parallel
                this._initSocket(session.id, session.user_id, session.agent_id).catch(err => {
                    console.error(`Failed to restore session ${session.id}:`, err)
                })
            }
        }
    } catch (e) {
        console.error('Restore sessions failed', e)
    }
  }

  async _initSocket(id, userId, agentId) {
    const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = await import('@whiskeysockets/baileys')
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${id}`)

    const sock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      retryRequestDelayMs: 2000,
    })

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update
      console.log(`Session ${id} update: connection=${connection}, qr=${qr ? 'YES' : 'NO'}`)

      if (connection === 'close') {
          const shouldReconnect = (lastDisconnect.error)?.output?.statusCode === DisconnectReason.restartRequired
          console.log(`Session ${id} closed. Reconnect: ${shouldReconnect}`)
          if (shouldReconnect) {
             this._initSocket(id, userId, agentId)
          }
      }

      if (connection === 'open') {
        console.log(`✅ Session ${id} CONNECTED!`)
      }
      const s = this.sessions.get(id) || { userId, agentId }
      if (qr) s.qr = qr
      if (connection) s.status = connection
      if (lastDisconnect) s.lastDisconnect = lastDisconnect
      // keep existing fields
      s.userId = userId
      s.agentId = agentId
      
      this.sessions.set(id, s)

      // auto save
      saveCreds().catch(console.error)
      
      // update db status
      if (connection) {
         const db = require('./db')
         db.pool.query('UPDATE sessions SET status=$1 WHERE id=$2', [connection, id]).catch(console.error)
         if (this.io) {
           this.io.to(`session:${id}`).emit('status', { sessionId: id, status: connection })
         }
      }
      if (qr) {
         const db = require('./db')
         db.pool.query('UPDATE sessions SET qr=$1 WHERE id=$2', [qr, id]).catch(console.error)
         if (this.io) {
           this.io.to(`session:${id}`).emit('qr', { sessionId: id, qr })
         }
      }
    })

    sock.ev.on('messages.upsert', async (m) => {
      try{
        if (!m || !m.messages || !m.messages.length) return
        const msg = m.messages[0]
        if (!msg.message) return

        // extract text
        let text = null
        if (msg.message.conversation) text = msg.message.conversation
        else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) text = msg.message.extendedTextMessage.text
        else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.quotedMessage) text = JSON.stringify(msg.message.extendedTextMessage)
        if (!text) return

        console.log('incoming text for session', id)

        // persist incoming message
        try{
          const db = require('./db')
          const mid = require('uuid').v4()
          await db.pool.query('INSERT INTO messages(id,session_id,direction,to_jid,body,raw) VALUES($1,$2,$3,$4,$5,$6)',[mid,id,'in',msg.key.remoteJid,text,JSON.stringify(msg)])
        }catch(e){ console.error('persist message failed', e && e.message) }

        // find bound agent for this session
        // use passed agentId or fetch fresh from DB/memory
        const s = this.sessions.get(id) || {}
        const currentAgentId = s.agentId || agentId
        if (!currentAgentId) return

        // enforce plan usage and track usage
        try{
          const db3 = require('./db')
          const subRes = await db3.pool.query('SELECT s.id,s.plan_id,s.period_start,s.period_end,p.max_messages,p.max_chats FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
          if (subRes.rows && subRes.rows.length){
            const subRow = subRes.rows[0]
            // ensure usage row
            const uRes = await db3.pool.query('SELECT id,messages_count,chats_count,period_start FROM usage WHERE user_id=$1 AND period_start=$2',[userId,subRow.period_start])
            let usageRow = uRes.rows && uRes.rows[0]
            if (!usageRow){
              const usageId = require('uuid').v4()
              await db3.pool.query('INSERT INTO usage(id,user_id,period_start,period_end,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,0,0,CURRENT_TIMESTAMP)',[usageId,userId,subRow.period_start,subRow.period_end])
              const newU = await db3.pool.query('SELECT id,messages_count,chats_count,period_start FROM usage WHERE user_id=$1 AND period_start=$2',[userId,subRow.period_start])
              usageRow = newU.rows && newU.rows[0]
            }

            // increment messages
            await db3.pool.query('UPDATE usage SET messages_count = messages_count + 1 WHERE id=$1',[usageRow.id])
            const u2 = await db3.pool.query('SELECT messages_count FROM usage WHERE id=$1',[usageRow.id])
            const used = (u2.rows && u2.rows[0]) ? u2.rows[0].messages_count : 0

            if (subRow.max_messages && used > subRow.max_messages){
              console.error('user over messages quota, not replying')
              await db3.pool.query('UPDATE usage SET last_alerted_at=CURRENT_TIMESTAMP WHERE id=$1',[usageRow.id])
              // notify user via webhooks if registered
              try{ const alerts = require('./alerts'); await alerts.notifyUser(userId,{ type:'quota_exceeded', kind:'messages', used, limit: subRow.max_messages }) }catch(e){ console.error('notify failed', e && e.message) }
              return
            }

            // track chats (unique remoteJid)
            if (subRow.max_chats){
              const chatExists = await db3.pool.query('SELECT 1 FROM messages WHERE session_id=$1 AND to_jid=$2 AND created_at BETWEEN $3 AND $4 LIMIT 1',[id,msg.key.remoteJid,subRow.period_start,subRow.period_end])
              if (!chatExists.rows || !chatExists.rows.length){
                await db3.pool.query('UPDATE usage SET chats_count = chats_count + 1 WHERE id=$1',[usageRow.id])
                const u3 = await db3.pool.query('SELECT chats_count FROM usage WHERE id=$1',[usageRow.id])
                const chatsUsed = (u3.rows && u3.rows[0]) ? u3.rows[0].chats_count : 0
                if (subRow.max_chats && chatsUsed > subRow.max_chats){
                  console.error('user over chats quota, not replying')
                  await db3.pool.query('UPDATE usage SET last_alerted_at=CURRENT_TIMESTAMP WHERE id=$1',[usageRow.id])
                  try{ const alerts = require('./alerts'); await alerts.notifyUser(userId,{ type:'quota_exceeded', kind:'chats', used:chatsUsed, limit: subRow.max_chats }) }catch(e){ console.error('notify failed', e && e.message) }
                  return
                }
              }
            }
          }
        }catch(e){ console.error('usage tracking failed', e && e.message) }

        // load agent meta
        const db2 = require('./db')
        const r = await db2.pool.query('SELECT a.name, a.webhook_url, m.system_prompt, m.model FROM agents a LEFT JOIN agents_meta m ON m.agent_id=a.id WHERE a.id=$1',[currentAgentId])
        if (!r.rows || !r.rows.length) return
        const meta = r.rows[0]
        const systemPrompt = meta.system_prompt || ''
        const model = meta.model || 'gpt-3.5-turbo'

        // call AI
        try{
          const ai = require('./ai')
          const reply = await ai.chatCompletion({ model, systemPrompt, messages:[{ role: 'user', content: text }] })
          if (reply) {
            await sock.sendMessage(msg.key.remoteJid, { text: reply })
            try{
              const db3 = require('./db')
              const mid2 = require('uuid').v4()
              await db3.pool.query('INSERT INTO messages(id,session_id,direction,to_jid,body,raw) VALUES($1,$2,$3,$4,$5,$6)',[mid2,id,'out',msg.key.remoteJid,reply,JSON.stringify({ reply })])
            }catch(e){ console.error('persist outgoing failed', e && e.message) }
          }
        }catch(e){ console.error('ai call failed', e && e.message) }

      }catch(e){ console.error('messages.upsert handler error', e && e.message) }
    })

    this.sessions.set(id, { sock, status: 'init', qr: null, userId, agentId: agentId || null })
  }

  getSessionStatus(id) {
    const s = this.sessions.get(id)
    if (!s) return null
    return { status: s.status, qr: s.qr, userId: s.userId, agentId: s.agentId }
  }
}

// export singleton instance for app-wide use
const ConnectionManagerInstance = new ConnectionManager()
module.exports = { ConnectionManager, ConnectionManagerInstance }
