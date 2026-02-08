const express = require('express')
const router = express.Router()
const db = require('./db')

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

// update user (admin) - profile & role
router.put('/users/:id', async (req,res)=>{
  try{
    const { name,role } = req.body
    await db.pool.query('UPDATE users SET name=$1, role=$2 WHERE id=$3',[name,role,req.params.id])
    res.json({ ok:true })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// admin: update user's subscription (modify current period or change plan)
router.put('/users/:id/subscription/:subId', async (req,res)=>{
  try{
    const { planId, period_start, period_end } = req.body
    await db.pool.query('UPDATE subscriptions SET plan_id=$1, period_start=$2, period_end=$3 WHERE id=$4 AND user_id=$5',[planId, period_start, period_end, req.params.subId, req.params.id])
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
    const start = period_start || new Date().toISOString()
    const end = period_end || (()=>{ const d=new Date(start); d.setMonth(d.getMonth()+1); return d.toISOString() })()
    await db.pool.query('INSERT INTO subscriptions(id,user_id,plan_id,period_start,period_end,created_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',[pid,req.params.id,planId,start,end])
    const usageId = require('uuid').v4()
    await db.pool.query('INSERT INTO usage(id,user_id,period_start,period_end,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,0,0,CURRENT_TIMESTAMP)',[usageId,req.params.id,start,end])
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
    await db.pool.query('INSERT INTO invoices(id,user_id,subscription_id,plan_id,period_start,period_end,amount,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)',[id,user_id,subscription_id,plan_id,period_start,period_end,amount||0,messages_count||0,chats_count||0])
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

module.exports = router
