const express = require('express')
const router = express.Router()
const db = require('./db')

// list available plans (public)
router.get('/plans', async (req,res)=>{
  try{
    const r = await db.pool.query('SELECT id,name,max_sessions,max_agents,max_messages,max_chats FROM plans')
    res.json({ plans: r.rows })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// subscribe current user to a plan (admin can pass userId)
router.post('/subscribe', async (req,res)=>{
  try{
    const userId = req.user && req.user.sub ? req.user.sub : req.body.userId
    const { planId, period_start, period_end } = req.body
    if (!userId || !planId) return res.status(400).json({ error: 'userId and planId required' })
    const pid = require('uuid').v4()
    const start = period_start || new Date().toISOString()
    const end = period_end || (()=>{ const d=new Date(start); d.setMonth(d.getMonth()+1); return d.toISOString() })()

    await db.pool.query('INSERT INTO subscriptions(id,user_id,plan_id,period_start,period_end,created_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',[pid,userId,planId,start,end])
    // create initial usage row
    const usageId = require('uuid').v4()
    await db.pool.query('INSERT INTO usage(id,user_id,period_start,period_end,messages_count,chats_count,created_at) VALUES($1,$2,$3,$4,0,0,CURRENT_TIMESTAMP)',[usageId,userId,start,end])

    res.json({ ok:true, id: pid })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// get current user's subscription
router.get('/me', async (req,res)=>{
  try{
    const userId = req.user && req.user.sub ? req.user.sub : null
    if (!userId) return res.status(401).json({ error: 'unauthenticated' })
    const r = await db.pool.query('SELECT s.id,s.plan_id,p.name,p.max_sessions,p.max_agents,p.max_messages,p.max_chats,s.period_start,s.period_end FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.period_start DESC LIMIT 1',[userId])
    if (!r.rows || !r.rows.length) return res.json({ subscription: null })
    res.json({ subscription: r.rows[0] })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// register a webhook notification URL for alerts
router.post('/hooks', async (req,res)=>{
  try{
    const userId = req.user && req.user.sub ? req.user.sub : null
    const { url } = req.body
    if (!userId || !url) return res.status(400).json({ error: 'userId and url required' })
    const id = require('uuid').v4()
    await db.pool.query('INSERT INTO notification_hooks(id,user_id,url,created_at) VALUES($1,$2,$3,CURRENT_TIMESTAMP)',[id,userId,url])
    res.json({ ok:true, id })
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

module.exports = router
