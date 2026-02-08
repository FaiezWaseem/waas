const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { pool } = require('./db')
const { v4: uuidv4 } = require('uuid')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

async function createUser({ email, password, name, role='user' }){
  const id = uuidv4()
  const hash = await bcrypt.hash(password, 10)
  await pool.query('INSERT INTO users(id,email,password_hash,name,role) VALUES($1,$2,$3,$4,$5)',[id,email,hash,name,role])
  return { id, email, name, role }
}

async function authenticate({ email, password }){
  const r = await pool.query('SELECT id,password_hash,role,email,name FROM users WHERE email=$1',[email])
  if (r.rowCount===0) throw new Error('Invalid credentials')
  const user = r.rows[0]
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) throw new Error('Invalid credentials')
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' })
  return { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } }
}

function verifyToken(req,res,next){
  const h = req.headers['authorization']
  if (!h) return res.status(401).json({ error: 'missing auth' })
  const parts = h.split(' ')
  if (parts.length!==2) return res.status(401).json({ error: 'invalid auth' })
  const token = parts[1]
  try{
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  }catch(e){
    return res.status(401).json({ error: 'invalid token' })
  }
}

function requireRole(role){
  return (req,res,next)=>{
    if (!req.user) return res.status(401).json({ error: 'missing auth' })
    if (req.user.role!==role && req.user.role!=='admin') return res.status(403).json({ error: 'forbidden' })
    next()
  }
}

module.exports = { createUser, authenticate, verifyToken, requireRole }
