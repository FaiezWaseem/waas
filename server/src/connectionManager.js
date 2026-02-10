const { Boom } = require('@hapi/boom')
const { v4: uuidv4 } = require('uuid')
const userService = require('./userService')

// helper: reserve session slot (increment usage)
async function reserveSessionSlot(userId){
  try{
    const sub = await userService.getUserPlan(userId)
    if (!sub) {
        console.log(`[LimitCheck] User ${userId} No Subscription found`)
        return true 
    }

    if (sub.max_sessions === -1) return true // Unlimited

    // Ensure usage row exists
    const usage = await userService.ensureUsageRecord(userId, sub.period_start, sub.period_end)
    const usageId = usage.id

    // 1. Check concurrent sessions limit from sessions table (Active Sessions)
    const db = require('./db')
    const sessionsCountRes = await db.pool.query('SELECT count(*) as count FROM sessions WHERE user_id=$1', [userId])
    // Handle different return types (SQLite/MySQL might return string or number)
    const activeSessions = parseInt(sessionsCountRes.rows[0].count)

    if (activeSessions >= sub.max_sessions) {
         console.log(`[LimitCheck] User ${userId} concurrent session limit reached (${activeSessions}/${sub.max_sessions}).`)
         return false
    }

    // 2. Increment usage counter (Total Sessions Created) - purely for analytics/tracking
    await userService.incrementUsage(userId, 'sessions')
    
    console.log(`[LimitCheck] Reserved slot for user ${userId}.`)
    return true

  }catch(e){ 
      console.error('session reservation failed', e && e.message) 
      return false 
  }
}

// helper: rollback session slot (decrement usage)
async function rollbackSessionSlot(userId){
    try {
        await userService.incrementUsage(userId, 'sessions', -1)
        console.log(`[LimitCheck] Rolled back slot for user ${userId}`)
    } catch(e) {
        console.error('session rollback failed', e)
    }
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
      const ok = await reserveSessionSlot(userId)
      if (!ok) return console.warn('session limit reached for your plan')
    }


    const id = uuidv4()
    
    // persist in db first
    try{
      const db = require('./db')
      await db.pool.query('INSERT INTO sessions(id,user_id,agent_id,status,qr,auth_path) VALUES($1,$2,$3,$4,$5,$6)',[id,userId,agentId||null,'init',null,`./sessions/${id}`])
    }catch(e){ 
      console.error('db save failed',e.message) 
      if (userId) await rollbackSessionSlot(userId)
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
      
      // Get agent_id before deleting session
      const sRow = await db.pool.query('SELECT agent_id FROM sessions WHERE id=$1', [id])
      const agentId = sRow.rows && sRow.rows.length ? sRow.rows[0].agent_id : null

      await db.pool.query('DELETE FROM sessions WHERE id=$1', [id])

      // Delete associated agent if exists
      if (agentId) {
         await db.pool.query('DELETE FROM agents WHERE id=$1', [agentId])
         console.log(`Deleted associated agent ${agentId} for session ${id}`)
      }
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

  async logoutSession(id) {
    const s = this.sessions.get(id)
    let logoutSuccess = false

    if (s && s.sock) {
      try {
        await s.sock.logout()
        logoutSuccess = true
      } catch (e) {
        console.error(`Error logging out session ${id}`, e)
      }
    }

    // Force DB update immediately to avoid race condition with UI
    console.log(`Session ${id} manual logout. Forcing init state...`)
    try {
        const db = require('./db')
        await db.pool.query('UPDATE sessions SET status=$1, qr=$2, phone_number=$3, contact_name=$4 WHERE id=$5', 
            ['init', null, null, null, id])
        
        if (s) {
            s.status = 'init'
            s.qr = null
            this.sessions.set(id, s)

            // If logout failed (no event triggered), manually restart
            if (!logoutSuccess && s.userId) {
                console.log(`Logout failed/skipped, manually restarting session ${id}...`)
                const fs = require('fs')
                const path = require('path')
                const sessionDir = path.resolve(__dirname, `../sessions/${id}`)
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true })
                }
                this._initSocket(id, s.userId, s.agentId, s.aiEnabled)
            }
        }
    } catch(e) { 
        console.error('logout reset failed', e) 
    }
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
                this._initSocket(session.id, session.user_id, session.agent_id, session.ai_enabled).catch(err => {
                    console.error(`Failed to restore session ${session.id}:`, err)
                })
            }
        }
    } catch (e) {
        console.error('Restore sessions failed', e)
    }
  }

  async _initSocket(id, userId, agentId, aiEnabled = 1) {
    const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = await import('@whiskeysockets/baileys')
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${id}`)

    const sock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('WAAS AI'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      retryRequestDelayMs: 2000,
    })

    this.sessions.set(id, { sock, status: 'connecting', userId, agentId, aiEnabled: !!aiEnabled })

    sock.ev.on('connection.update', async(update) => {
      const { connection, lastDisconnect, qr } = update
      console.log(`Session ${id} update: connection=${connection}, qr=${qr ? 'YES' : 'NO'}`)

      if (connection === 'close') {
          const statusCode = (lastDisconnect.error)?.output?.statusCode
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut
          console.log(`Session ${id} closed. Reason: ${statusCode}, Reconnect: ${shouldReconnect}`)
          if (shouldReconnect) {
             // add a small delay to avoid tight loops
             setTimeout(() => this._initSocket(id, userId, agentId, this.sessions.get(id)?.aiEnabled), 3000)
          } else {
             // if logged out, don't delete the session, just reset it to init state
             console.log(`Session ${id} logged out. Resetting to init state...`)
             try {
                // 1. clear auth folder
                const fs = require('fs')
                const path = require('path')
                const sessionDir = path.resolve(__dirname, `../sessions/${id}`)
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true })
                }
                
                // 2. update DB
                const db = require('./db')
                await db.pool.query('UPDATE sessions SET status=$1, qr=$2, phone_number=$3, contact_name=$4 WHERE id=$5', 
                    ['init', null, null, null, id])
                
                // 3. clear memory
                const s = this.sessions.get(id)
                if(s) { s.status = 'init'; s.qr = null; this.sessions.set(id, s); }

                // 4. restart socket to get new QR
                this._initSocket(id, userId, agentId, this.sessions.get(id)?.aiEnabled)
             } catch(e) { console.error('logout reset failed', e) }
          }
      }

      if (connection === 'open') {
        console.log(`✅ Session ${id} CONNECTED!`)
        // Update session details (phone number, name)
        try {
           const user = sock.user
           if (user) {
             const phoneNumber = user.id.split(':')[0]
             const name = user.name || user.notify || phoneNumber
             const db = require('./db')
             db.pool.query('UPDATE sessions SET phone_number=$1, contact_name=$2, status=$3, last_active=CURRENT_TIMESTAMP WHERE id=$4', 
               [phoneNumber, name, 'active', id]).catch(console.error)
           }
        } catch (e) {
          console.error(`Error updating session details for ${id}`, e)
        }
      }
      const s = this.sessions.get(id) || { userId, agentId, aiEnabled: !!(this.sessions.get(id)?.aiEnabled) }
      if (qr) s.qr = qr
      if (connection) s.status = connection
      if (lastDisconnect) s.lastDisconnect = lastDisconnect
      // keep existing fields
      s.userId = userId
      s.agentId = agentId
      // Ensure aiEnabled is preserved or defaulted
      if (s.aiEnabled === undefined) s.aiEnabled = true;

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
        if (msg.key.fromMe) return

        // extract text
        let text = null
        if (msg.message.conversation) text = msg.message.conversation
        else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) text = msg.message.extendedTextMessage.text
        else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.quotedMessage) text = JSON.stringify(msg.message.extendedTextMessage)
        if (!text) return

        console.log('incoming text for session', id, 'from', msg.key.remoteJid, ':', text)

        // persist incoming message
        try{
          const db = require('./db')
          const mid = require('uuid').v4()
          await db.pool.query('INSERT INTO messages(id,session_id,direction,to_jid,body,raw) VALUES($1,$2,$3,$4,$5,$6)',[mid,id,'in',msg.key.remoteJid,text,JSON.stringify(msg)])
        }catch(e){ console.error('persist message failed', e && e.message) }

        // find bound agent for this session
        // use passed agentId or fetch fresh from DB/memory
        const s = this.sessions.get(id) || {}
        
        // CHECK AI ENABLED STATUS
        if (s.aiEnabled === false) {
           console.log(`Session ${id} AI disabled. Ignoring message.`)
           return
        }

        // prioritize s.agentId (which tracks live updates) over the closure variable agentId
        // check if s.agentId is explicitly set (even to null)
        let currentAgentId = s.agentId
        if (currentAgentId === undefined) currentAgentId = agentId

        if (!currentAgentId) return

        // enforce plan usage and track usage
        try{
          const sub = await userService.getUserPlan(userId)
          
          if (!sub) {
             console.log(`[LimitCheck] User ${userId} has no active plan. Blocking AI reply.`)
             return
          }

          if (sub){
            // ensure usage row
            const usage = await userService.ensureUsageRecord(userId, sub.period_start, sub.period_end)
            const used = usage.messages_count
            
            // Check limit
            const maxMsg = sub.max_messages
            if (maxMsg !== -1 && used >= maxMsg){
              console.error('user over messages quota, not replying')
              // update last alerted if needed
              await userService.updateLastAlerted(usage.id)
              
              // notify user via webhooks if registered
              try{ const alerts = require('./alerts'); await alerts.notifyUser(userId,{ type:'quota_exceeded', kind:'messages', used, limit: maxMsg }) }catch(e){ console.error('notify failed', e && e.message) }
              return
            }

            // track chats (unique remoteJid)
            if (sub.max_chats !== -1){
              const db3 = require('./db')
              const chatExists = await db3.pool.query('SELECT 1 FROM messages WHERE session_id=$1 AND to_jid=$2 AND created_at BETWEEN $3 AND $4 LIMIT 1',[id,msg.key.remoteJid,sub.period_start,sub.period_end])
              if (!chatExists.rows || !chatExists.rows.length){
                await userService.incrementUsage(userId, 'chats')
                
                // Check chat limit
                const u3 = await userService.getUserUsage(userId, sub.period_start)
                const chatsUsed = u3.chats_count
                if (sub.max_chats !== -1 && chatsUsed > sub.max_chats){
                  console.error('user over chats quota, not replying')
                  await userService.updateLastAlerted(usage.id)
                  try{ const alerts = require('./alerts'); await alerts.notifyUser(userId,{ type:'quota_exceeded', kind:'chats', used:chatsUsed, limit: sub.max_chats }) }catch(e){ console.error('notify failed', e && e.message) }
                  return
                }
              }
            }
          }
        }catch(e){ console.error('usage tracking failed', e && e.message) }

        // load agent meta
        const db2 = require('./db')
        const r = await db2.pool.query('SELECT a.name, a.webhook_url, m.system_prompt, m.model, m.excluded_numbers FROM agents a LEFT JOIN agents_meta m ON m.agent_id=a.id WHERE a.id=$1',[currentAgentId])
        if (!r.rows || !r.rows.length) return
        const meta = r.rows[0]
        const systemPrompt = meta.system_prompt || ''
        const model = meta.model || 'gpt-3.5-turbo'
        const excludedNumbers = meta.excluded_numbers || ''

        // check exclusion
        if (excludedNumbers) {
           const remoteJid = msg.key.remoteJid
           const senderNumber = remoteJid.split('@')[0]
           const excludedList = excludedNumbers.split(',').map(s => s.trim()).filter(Boolean)
           const isExcluded = excludedList.some(ex => {
              // check if exact match or contains
              return senderNumber.includes(ex.replace(/\+/g,''))
           })
           if (isExcluded) {
             console.log('Ignored message from excluded contact:', remoteJid)
             return
           }
        }

        // call AI
        try{
          // indicate typing status
          await sock.sendPresenceUpdate('composing', msg.key.remoteJid)

          const ai = require('./ai')
          const reply = await ai.chatCompletion({ model, systemPrompt, messages:[{ role: 'user', content: text }] })
          
          // stop typing status
          await sock.sendPresenceUpdate('paused', msg.key.remoteJid)

          if (reply) {
            await sock.sendMessage(msg.key.remoteJid, { text: reply })
            try{
              const db3 = require('./db')
              const mid2 = require('uuid').v4()
              await db3.pool.query('INSERT INTO messages(id,session_id,direction,to_jid,body,raw) VALUES($1,$2,$3,$4,$5,$6)',[mid2,id,'out',msg.key.remoteJid,reply,JSON.stringify({ reply })])
              
              // Increment usage here for the outgoing AI reply
              try {
                  await userService.incrementUsage(userId, 'messages')
              } catch (err) {
                  console.error(`[AI Usage] Failed to increment usage for user ${userId}:`, err)
              }

            }catch(e){ console.error('persist outgoing failed', e && e.message) }
          }
        }catch(e){ 
          console.error('ai call failed', e && e.message) 
          // ensure we stop typing on error
          await sock.sendPresenceUpdate('paused', msg.key.remoteJid)
        }

      }catch(e){ console.error('messages.upsert handler error', e && e.message) }
    })

    this.sessions.set(id, { sock, status: 'init', qr: null, userId, agentId: agentId || null })
  }

  async getChats(sessionId) {
    try {
      const db = require('./db')
      // Get last message per chat to build the chat list
      const sql = `
        SELECT m.*, COUNT(m2.id) as unread_count 
        FROM messages m
        INNER JOIN (
            SELECT to_jid, MAX(created_at) as max_created
            FROM messages
            WHERE session_id = $1
            GROUP BY to_jid
        ) grouped_m ON m.to_jid = grouped_m.to_jid AND m.created_at = grouped_m.max_created
        LEFT JOIN messages m2 ON m2.session_id = m.session_id AND m2.to_jid = m.to_jid AND m2.direction = 'in' AND m2.created_at > (
            SELECT COALESCE(MAX(created_at), 0) FROM messages WHERE session_id = m.session_id AND to_jid = m.to_jid AND direction = 'out'
        )
        WHERE m.session_id = $1
        GROUP BY m.id
        ORDER BY m.created_at DESC
      `
      // Note: The unread_count logic above is an approximation. 
      // Simplified: Just get the last message. Unread count requires "read" status which we might not track perfectly yet.
      
      const simplifiedSql = `
        SELECT m.to_jid, m.body, m.created_at, m.direction, m.to_jid as id, m.to_jid as name
        FROM messages m
        INNER JOIN (
            SELECT to_jid, MAX(created_at) as max_created
            FROM messages
            WHERE session_id = $1
            GROUP BY to_jid
        ) grouped_m ON m.to_jid = grouped_m.to_jid AND m.created_at = grouped_m.max_created
        WHERE m.session_id = $1
        ORDER BY m.created_at DESC
      `
      
      const { rows } = await db.pool.query(simplifiedSql, [sessionId])
      return rows.map(r => ({
        id: r.to_jid,
        name: r.to_jid.split('@')[0], // simplistic name
        lastMessage: r.body,
        time: r.created_at,
        unreadCount: 0, // TODO: implement read tracking
        status: 'offline' // TODO: implement presence
      }))
    } catch (e) {
      console.error('getChats failed', e)
      return []
    }
  }

  async getMessages(sessionId, chatId) {
    try {
      const db = require('./db')
      const { rows } = await db.pool.query('SELECT * FROM messages WHERE session_id=$1 AND to_jid=$2 ORDER BY created_at ASC LIMIT 100', [sessionId, chatId])
      return rows.map(r => ({
        id: r.id,
        text: r.body,
        sender: r.direction === 'out' ? 'me' : 'them',
        time: r.created_at,
        status: 'read' // placeholder
      }))
    } catch (e) {
      console.error('getMessages failed', e)
      return []
    }
  }

  async sendMessage(sessionId, toJid, content) {
    const s = this.sessions.get(sessionId)
    if (!s || !s.sock) throw new Error('Session not active')

    // normalize content
    let msgPayload = content
    let bodyText = ''
    
    if (typeof content === 'string') {
        msgPayload = { text: content }
        bodyText = content
    } else {
        // assume valid baileys content object (e.g. { image: { url: ... }, caption: ... })
        msgPayload = content
        // extract text representation for body column
        bodyText = content.caption || content.text || (content.image ? '[Image]' : content.video ? '[Video]' : content.document ? '[Document]' : '[Media]')
    }
    
    console.log('[ConnectionManager] Sending payload:', JSON.stringify(msgPayload, null, 2))

    await s.sock.sendMessage(toJid, msgPayload)

    // persist
    try {
      const db = require('./db')
      const mid = require('uuid').v4()
      await db.pool.query('INSERT INTO messages(id,session_id,direction,to_jid,body,raw) VALUES($1,$2,$3,$4,$5,$6)', [mid, sessionId, 'out', toJid, bodyText, JSON.stringify(msgPayload)])
      return { id: mid, text: bodyText, sender: 'me', time: new Date().toISOString(), status: 'sent' }
    } catch (e) {
      console.error('persist outgoing manual message failed', e)
      throw e
    }
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
