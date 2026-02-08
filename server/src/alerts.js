const fetch = require('node-fetch')
const db = require('./db')

async function notifyUser(userId, payload){
  try{
    const r = await db.pool.query('SELECT url FROM notification_hooks WHERE user_id=$1',[userId])
    if (!r.rows || !r.rows.length) return
    for (const row of r.rows){
      try{
        await fetch(row.url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      }catch(e){ console.error('webhook notify failed', e && e.message) }
    }
  }catch(e){ console.error('notifyUser failed', e && e.message) }
}

module.exports = { notifyUser }
