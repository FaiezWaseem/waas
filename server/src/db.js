const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, '..', 'data', 'waas.sqlite')

// ensure data dir
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })

const db = new Database(DB_FILE)
// enable foreign keys
db.pragma('foreign_keys = ON')

// simple pg-like pool.query wrapper to keep compatibility with existing code
const pool = {
  query: async (sql, params = []) => {
    sql = sql.trim()
    try {
      if (/^SELECT|PRAGMA/i.test(sql)) {
        const stmt = db.prepare(sql)
        const rows = stmt.all(params)
        return { rows }
      } else {
        const stmt = db.prepare(sql)
        const info = stmt.run(params)
        return { rows: info }
      }
    } catch (e) {
      // sqlite3 errors include 'near "..."' for syntax; rethrow
      throw e
    }
  }
}

async function init() {
  // create core tables if not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      webhook_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      agent_id TEXT,
      status TEXT,
      qr TEXT,
      auth_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      direction TEXT,
      to_jid TEXT,
      body TEXT,
      raw TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- plans & subscriptions
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT,
      max_sessions INTEGER,
      max_agents INTEGER,
      max_messages INTEGER,
      max_chats INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      plan_id TEXT,
      period_start DATETIME,
      period_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS usage (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      period_start DATETIME,
      period_end DATETIME,
      messages_count INTEGER DEFAULT 0,
      chats_count INTEGER DEFAULT 0,
      last_alerted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- notification hooks
    CREATE TABLE IF NOT EXISTS notification_hooks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- invoices table
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      subscription_id TEXT,
      plan_id TEXT,
      period_start DATETIME,
      period_end DATETIME,
      amount INTEGER DEFAULT 0,
      messages_count INTEGER DEFAULT 0,
      chats_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- cron runs table
    CREATE TABLE IF NOT EXISTS cron_runs (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      last_run TEXT
    );
  `)

  // migration: add price_monthly to plans if missing
  try{
    const info = db.prepare("PRAGMA table_info(plans)").all()
    const hasPrice = info.some(c=>c.name==='price_monthly')
    if (!hasPrice){
      db.exec("ALTER TABLE plans ADD COLUMN price_monthly INTEGER DEFAULT 0")
    }
  }catch(e){ console.error('migration failed', e && e.message) }

  // seed plans (idempotent)
  try{
    const stmt = db.prepare("INSERT OR IGNORE INTO plans(id,name,max_sessions,max_agents,max_messages,max_chats,price_monthly) VALUES(?,?,?,?,?,?,?)")
    const plans = [
      ['plan_basic','Basic',1,1,1000,1000,0],
      ['plan_silver','Silver',3,3,10000,2000,0],
      ['plan_premium','Premium',5,5,30000,5000,0]
    ]
    const insert = db.transaction((rows)=>{
      for(const r of rows) stmt.run(r)
    })
    insert(plans)
  }catch(e){ console.error('seed plans failed', e && e.message) }
}


module.exports = { pool, init, db }
