const express = require('express')
const router = express.Router()
const db = require('./db')

// Helper to format dates for MySQL (YYYY-MM-DD HH:MM:SS)
const formatDate = (d) => {
  if (!d) return null
  try {
    return new Date(d).toISOString().slice(0, 19).replace('T', ' ')
  } catch (e) {
    return d
  }
}

// get dashboard stats
router.get('/stats', async (req,res)=>{
  try{
    const usersCount = await db.pool.query('SELECT COUNT(*) as count FROM users')
    const activeSubs = await db.pool.query("SELECT COUNT(*) as count FROM subscriptions WHERE period_end > datetime('now')")
    // Simple revenue calc: sum of plan prices for active subscriptions
    // In a real app this would be more complex (invoices table)
    const revenue = await db.pool.query(`
      SELECT SUM(p.price_monthly) as total 
      FROM subscriptions s 
      JOIN plans p ON s.plan_id = p.id 
      WHERE s.period_end > datetime('now')
    `)
    
    res.json({
      total_users: usersCount.rows[0].count,
      active_subscriptions: activeSubs.rows[0].count,
      monthly_revenue: revenue.rows[0].total || 0,
      server_status: "Stable" // Mock status
    })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// list all subscriptions with details
router.get('/subscriptions', async (req,res)=>{
  try{
    const r = await db.pool.query(`
      SELECT s.id, s.user_id, s.plan_id, s.status, s.period_start, s.period_end, 
             u.name as user_name, u.email as user_email, 
             p.name as plan_name, p.price_monthly as amount 
      FROM subscriptions s 
      LEFT JOIN users u ON s.user_id = u.id 
      LEFT JOIN plans p ON s.plan_id = p.id
      ORDER BY s.created_at DESC
    `)
    res.json({ subscriptions: r.rows })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// list users
router.get('/users', async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT id,email,name,role,created_at FROM users ORDER BY created_at DESC')
    res.json({ users: r.rows })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// get user by id
router.get('/users/:id', async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT id,email,name,role,created_at FROM users WHERE id=$1',[req.params.id])
    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json({ user: r.rows[0] })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// create user (admin)
router.post('/users', async (req,res)=>{
  try{
    const { email,name,role,password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })
    const auth = require('./auth')
    const u = await auth.createUser({ email,password,name,role })
    res.json({ user: u })
  }catch(e){ console.error(e); res.status(400).json({ error: e.message }) }
})

// update user (admin) - profile & role & optional password
router.put('/users/:id', async (req,res)=>{
  try{
    const { name, role, email, password } = req.body
    
    // Build query dynamically based on provided fields
    const updates = []
    const values = []
    let idx = 1
    
    if (name) {
      updates.push(`name=$${idx++}`)
      values.push(name)
    }
    if (role) {
      updates.push(`role=$${idx++}`)
      values.push(role)
    }
    if (email) {
      updates.push(`email=$${idx++}`)
      values.push(email)
    }
    if (password) {
      const bcrypt = require('bcrypt')
      const hash = await bcrypt.hash(password, 10)
      updates.push(`password_hash=$${idx++}`)
      values.push(hash)
    }
    
    if (updates.length === 0) return res.json({ ok: true }) // nothing to update
    
    values.push(req.params.id)
    await db.pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id=$${idx}`, values)
    
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// admin: update user's subscription (modify current period or change plan)
router.put('/users/:id/subscription/:subId', async (req,res)=>{
  try{
    const { planId, period_start, period_end } = req.body
    await db.pool.query('UPDATE subscriptions SET plan_id=$1, period_start=$2, period_end=$3 WHERE id=$4 AND user_id=$5',[planId, formatDate(period_start), formatDate(period_end), req.params.subId, req.params.id])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// admin: delete user (and cascade)
router.delete('/users/:id', async (req,res)=>{
  try{
    await db.pool.query('DELETE FROM users WHERE id=$1',[req.params.id])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// assign/modify subscription for a user (admin)
router.post('/users/:id/subscription', async (req,res)=>{
  try{
    const { planId, period_start, period_end } = req.body
    if (!planId) return res.status(400).json({ error: 'planId required' })
    const pid = require('uuid').v4()
    const start = period_start ? new Date(period_start) : new Date()
    const end = period_end ? new Date(period_end) : (()=>{ const d=new Date(start); d.setMonth(d.getMonth()+1); return d })()
    
    const startStr = formatDate(start)
    const endStr = formatDate(end)
    
    await db.pool.query('INSERT INTO subscriptions(id,user_id,plan_id,period_start,period_end,created_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',[pid,req.params.id,planId,startStr,endStr])
    const usageId = require('uuid').v4()
    await db.pool.query('INSERT INTO usage(id,user_id,period_start,period_end,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,0,0,CURRENT_TIMESTAMP)',[usageId,req.params.id,startStr,endStr])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})


// invoices management (admin)
router.get('/invoices', async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT id,user_id,subscription_id,plan_id,period_start,period_end,amount,messages_count,chats_count,created_at FROM invoices ORDER BY created_at DESC')
    res.json({ invoices: r.rows })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.get('/invoices/:id', async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT id,user_id,subscription_id,plan_id,period_start,period_end,amount,messages_count,chats_count,created_at FROM invoices WHERE id=$1',[req.params.id])
    if (!r.rows || !r.rows.length) return res.status(404).json({ error: 'not found' })
    res.json({ invoice: r.rows[0] })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.post('/invoices', async (req,res)=>{
  try{
    const { user_id, subscription_id, plan_id, period_start, period_end, amount, messages_count, chats_count } = req.body
    if (!user_id || !plan_id || !period_start || !period_end) return res.status(400).json({ error: 'missing fields' })
    const id = require('uuid').v4()
    await db.pool.query('INSERT INTO invoices(id,user_id,subscription_id,plan_id,period_start,period_end,amount,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)',[id,user_id,subscription_id,plan_id,formatDate(period_start),formatDate(period_end),amount||0,messages_count||0,chats_count||0])
    res.json({ ok:true, id })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.put('/invoices/:id', async (req,res)=>{
  try{
    const { amount } = req.body
    await db.pool.query('UPDATE invoices SET amount=$1 WHERE id=$2',[amount, req.params.id])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.delete('/invoices/:id', async (req,res)=>{
  try{
    await db.pool.query('DELETE FROM invoices WHERE id=$1',[req.params.id])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// plans CRUD
router.get('/plans', async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT * FROM plans ORDER BY created_at DESC')
    res.json({ plans: r.rows })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.post('/plans', async (req,res)=>{
  try{
    const { name, price_monthly, max_sessions, max_agents, max_messages, max_chats, description, features } = req.body
    const id = require('uuid').v4()
    await db.pool.query(
      'INSERT INTO plans(id,name,price_monthly,max_sessions,max_agents,max_messages,max_chats,description,features,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)',
      [id, name, price_monthly||0, max_sessions||0, max_agents||0, max_messages||0, max_chats||0, description||'', features||'']
    )
    res.json({ ok:true, id })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.put('/plans/:id', async (req,res)=>{
  try{
    const { name, price_monthly, max_sessions, max_agents, max_messages, max_chats, description, features } = req.body
    await db.pool.query(
      'UPDATE plans SET name=$1, price_monthly=$2, max_sessions=$3, max_agents=$4, max_messages=$5, max_chats=$6, description=$7, features=$8 WHERE id=$9',
      [name, price_monthly, max_sessions, max_agents, max_messages, max_chats, description, features, req.params.id]
    )
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.delete('/plans/:id', async (req,res)=>{
  try{
    await db.pool.query('DELETE FROM plans WHERE id=$1',[req.params.id])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// subscription management
router.put('/subscriptions/:id', async (req,res)=>{
  try{
    const { status, plan_id, period_start, period_end } = req.body
    await db.pool.query(
      'UPDATE subscriptions SET status=$1, plan_id=$2, period_start=$3, period_end=$4 WHERE id=$5',
      [status, plan_id, formatDate(period_start), formatDate(period_end), req.params.id]
    )
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

router.delete('/subscriptions/:id', async (req,res)=>{
  try{
    await db.pool.query('DELETE FROM subscriptions WHERE id=$1',[req.params.id])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

module.exports = router
