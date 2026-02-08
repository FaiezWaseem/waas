const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@adiwajshing/baileys')
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
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${id}`)

    const sock = makeWASocket({ auth: state, browser: Browsers.macOS('Waas') })

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update
      const s = this.sessions.get(id) || {}
      if (qr) s.qr = qr
      if (connection) s.status = connection
      if (lastDisconnect) s.lastDisconnect = lastDisconnect
      this.sessions.set(id, s)

      // auto save
      saveCreds().catch(console.error)
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
        const s = this.sessions.get(id) || {}
        const agentId = s.agentId
        if (!agentId) return

        // enforce plan usage and track usage
        try{
          const db3 = require('./db')
          const subRes = await db3.pool.query('SELECT s.id,s.plan_id,s.period_start,s.period_end,p.max_messages,p.max_chats FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[s.userId])
          if (subRes.rows && subRes.rows.length){
            const subRow = subRes.rows[0]
            // ensure usage row
            const uRes = await db3.pool.query('SELECT id,messages_count,chats_count,period_start FROM usage WHERE user_id=$1 AND period_start=$2',[s.userId,subRow.period_start])
            let usageRow = uRes.rows && uRes.rows[0]
            if (!usageRow){
              const usageId = require('uuid').v4()
              await db3.pool.query('INSERT INTO usage(id,user_id,period_start,period_end,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,0,0,CURRENT_TIMESTAMP)',[usageId,s.userId,subRow.period_start,subRow.period_end])
              const newU = await db3.pool.query('SELECT id,messages_count,chats_count,period_start FROM usage WHERE user_id=$1 AND period_start=$2',[s.userId,subRow.period_start])
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
              try{ const alerts = require('./alerts'); await alerts.notifyUser(s.userId,{ type:'quota_exceeded', kind:'messages', used, limit: subRow.max_messages }) }catch(e){ console.error('notify failed', e && e.message) }
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
                  try{ const alerts = require('./alerts'); await alerts.notifyUser(s.userId,{ type:'quota_exceeded', kind:'chats', used:chatsUsed, limit: subRow.max_chats }) }catch(e){ console.error('notify failed', e && e.message) }
                  return
                }
              }
            }
          }
        }catch(e){ console.error('usage tracking failed', e && e.message) }

        // load agent meta
        const db2 = require('./db')
        const r = await db2.pool.query('SELECT a.name, a.webhook_url, m.system_prompt, m.model FROM agents a LEFT JOIN agents_meta m ON m.agent_id=a.id WHERE a.id=$1',[agentId])
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

    // persist in db if available
    try{
      const db = require('./db')
      await db.pool.query('INSERT INTO sessions(id,user_id,agent_id,status,qr,auth_path) VALUES($1,$2,$3,$4,$5,$6)',[id,userId,agentId||null,'init',null,`./sessions/${id}`])
    }catch(e){ console.error('db save failed',e.message) }

    return { id, status: 'init', qr: null }
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
