const db = require('./db')
const { v4: uuidv4 } = require('uuid')

async function rollSubscriptions(){
  try{
    // ensure cron_runs exists
    await db.pool.query("INSERT OR IGNORE INTO cron_runs(id,name,last_run) VALUES($1,$2,$3)",[uuidv4(),'monthly_roll',null])

    // find subscriptions where period_end <= now
    const now = new Date().toISOString()
    const r = await db.pool.query('SELECT id,user_id,plan_id,period_start,period_end FROM subscriptions WHERE period_end <= $1',[now])
    if (!r.rows || !r.rows.length) return
    for(const s of r.rows){
      try{
        // create new subscription period with same plan for next month
        const start = new Date(s.period_end)
        const end = new Date(start)
        end.setMonth(end.getMonth()+1)
        const nid = uuidv4()
        await db.pool.query('INSERT INTO subscriptions(id,user_id,plan_id,period_start,period_end,created_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',[nid,s.user_id,s.plan_id,start.toISOString(),end.toISOString()])
        // create usage row
        const uid = uuidv4()
        await db.pool.query('INSERT INTO usage(id,user_id,period_start,period_end,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,0,0,CURRENT_TIMESTAMP)',[uid,s.user_id,start.toISOString(),end.toISOString()])
        // create invoice stub (sum usage from previous period)
        const prevUsage = await db.pool.query('SELECT messages_count,chats_count FROM usage WHERE user_id=$1 AND period_start=$2',[s.user_id,s.period_start])
        const prev = prevUsage.rows && prevUsage.rows[0] ? prevUsage.rows[0] : { messages_count:0, chats_count:0 }
        const invId = uuidv4()
        await db.pool.query('INSERT INTO invoices(id,user_id,subscription_id,plan_id,period_start,period_end,amount,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)',[invId,s.user_id,s.id,s.plan_id,s.period_start,s.period_end,0,prev.messages_count,prev.chats_count])
      }catch(e){ console.error('roll sub failed', e && e.message) }
    }
    // update cron_runs
    await db.pool.query('UPDATE cron_runs SET last_run=$1 WHERE name=$2',[now,'monthly_roll'])
  }catch(e){ console.error('rollSubscriptions failed', e && e.message) }
}

// run on import and schedule hourly
rollSubscriptions().catch(console.error)
setInterval(()=>{ rollSubscriptions().catch(console.error) }, 1000*60*60)

module.exports = { rollSubscriptions }
