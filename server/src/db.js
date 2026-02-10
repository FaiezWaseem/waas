const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
require('dotenv').config()

const DB_TYPE = process.env.DB_TYPE || 'sqlite'

let pool, init, db

// Helper to convert $n to ? and reorder params for MySQL
function convertSqlParams(sql, params) {
  if (!params || params.length === 0) return { sql, params: [] }
  
  // Find all $n
  const matches = sql.match(/\$\d+/g)
  if (!matches) return { sql, params }
  
  let newParams = []
  
  const newSql = sql.replace(/\$(\d+)/g, (match, number) => {
    const idx = parseInt(number) - 1
    if (idx >= 0 && idx < params.length) {
        newParams.push(params[idx])
    } else {
        newParams.push(null) // Should not happen if params are correct
    }
    return '?'
  })
  
  return { sql: newSql, params: newParams }
}

if (DB_TYPE === 'mysql') {
  const mysql = require('mysql2/promise')
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'waas',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    dateStrings: true
  }

  const mysqlPool = mysql.createPool(dbConfig)
  db = mysqlPool // export the pool as db for direct access if needed (though API differs from sqlite)

  pool = {
    query: async (sql, params = []) => {
      // 1. Handle usage table quoting for MySQL and SQLite syntax differences
      // usage is a reserved word in MySQL. 
      let mysqlSql = sql.replace(/ FROM usage /gi, ' FROM `usage` ')
                        .replace(/ INTO usage\(/gi, ' INTO `usage`(')
                        .replace(/ INTO usage /gi, ' INTO `usage` ')
                        .replace(/ UPDATE usage /gi, ' UPDATE `usage` ')
                        .replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE')
                         .replace(/datetime\('now'\)/gi, 'NOW()')
                         .trim()

      // 2. Convert params
      let arrParams = []
      if (!Array.isArray(params) && typeof params === 'object') {
         // convert {'1': 'val'} to ['val']
         const keys = Object.keys(params).map(k=>parseInt(k)).sort((a,b)=>a-b)
         arrParams = keys.map(k => params[String(k)])
      } else {
         arrParams = params
      }
      
      const { sql: finalSql, params: finalParams } = convertSqlParams(mysqlSql, arrParams)

      try {
        const [rows, fields] = await mysqlPool.query(finalSql, finalParams)
        
        if (Array.isArray(rows)) {
            return { rows, rowCount: rows.length }
        } else {
            return { 
                rows: [], 
                rowCount: rows.affectedRows, 
                changes: rows.affectedRows, 
                lastInsertRowid: rows.insertId 
            }
        }
      } catch (e) {
        console.error('MySQL Query Error:', e.message)
        throw e
      }
    }
  }

  init = async () => {
    try {
        const c = await mysqlPool.getConnection()
        c.release()
        console.log('MySQL connected')
    } catch(e) {
        console.error('MySQL connection failed:', e.message)
        // Don't throw fatal, let it retry or fail later
    }

    const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      phone VARCHAR(50),
      avatar_url VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      name VARCHAR(255),
      webhook_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agents_meta (
      agent_id VARCHAR(36) PRIMARY KEY,
      system_prompt TEXT,
      model VARCHAR(50),
      excluded_numbers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      agent_id VARCHAR(36),
      status VARCHAR(50),
      qr TEXT,
      auth_path VARCHAR(255),
      ai_enabled TINYINT(1) DEFAULT 1,
      phone_number VARCHAR(50),
      contact_name VARCHAR(255),
      platform VARCHAR(50) DEFAULT 'WhatsApp',
      device VARCHAR(255),
      battery_level INTEGER DEFAULT 0,
      last_active DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(36),
      direction VARCHAR(20),
      to_jid VARCHAR(255),
      body TEXT,
      raw TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255),
      max_sessions INTEGER,
      max_agents INTEGER,
      max_messages INTEGER,
      max_chats INTEGER,
      price_monthly INTEGER DEFAULT 0,
      description TEXT,
      features TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      plan_id VARCHAR(36),
      period_start DATETIME,
      period_end DATETIME,
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS \`usage\` (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      period_start DATETIME,
      period_end DATETIME,
      messages_count INTEGER DEFAULT 0,
      chats_count INTEGER DEFAULT 0,
      sessions_count INTEGER DEFAULT 0,
      last_alerted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_hooks (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      subscription_id VARCHAR(36),
      plan_id VARCHAR(36),
      period_start DATETIME,
      period_end DATETIME,
      amount INTEGER DEFAULT 0,
      messages_count INTEGER DEFAULT 0,
      chats_count INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cron_runs (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) UNIQUE,
      last_run VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255),
      slug VARCHAR(255) UNIQUE,
      excerpt TEXT,
      content TEXT,
      category VARCHAR(255),
      read_time VARCHAR(50),
      author_name VARCHAR(255),
      author_role VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Draft',
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      details TEXT,
      instructions TEXT,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `
    
    await mysqlPool.query(ddl)
    
    // Seed plans
    const plans = [
      ['plan_basic','Basic',1,1,1000,1000,0],
      ['plan_silver','Silver',3,3,10000,2000,0],
      ['plan_premium','Premium',5,5,30000,5000,0]
    ]
    for (const p of plans) {
        await mysqlPool.query('INSERT IGNORE INTO plans(id,name,max_sessions,max_agents,max_messages,max_chats,price_monthly) VALUES(?,?,?,?,?,?,?)', p)
    }
  }

} else {
  // SQLite Implementation
  const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, '..', 'data', 'waas.sqlite')
  
  // ensure data dir
  if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
  }
  
  db = new Database(DB_FILE)
  // enable foreign keys
  db.pragma('foreign_keys = ON')
  
  pool = {
    query: async (sql, params = []) => {
      sql = sql.trim()
      // handle $n postgres-style parameters by converting array to object with numeric keys
      if (Array.isArray(params) && /\$\d/.test(sql)) {
        const obj = {}
        params.forEach((v, i) => { obj[String(i + 1)] = v })
        params = obj
      }
  
      try {
        if (/^SELECT|PRAGMA/i.test(sql)) {
          const stmt = db.prepare(sql)
          const rows = stmt.all(params)
          return { rows, rowCount: rows.length }
        } else {
          const stmt = db.prepare(sql)
          const info = stmt.run(params)
          return { rows: info, rowCount: info.changes, changes: info.changes, lastInsertRowid: info.lastInsertRowid }
        }
      } catch (e) {
        // sqlite3 errors include 'near "..."' for syntax; rethrow
        throw e
      }
    }
  }
  
  init = async () => {
    // create core tables if not exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        phone TEXT,
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
  
      -- agents meta
      CREATE TABLE IF NOT EXISTS agents_meta (
        agent_id TEXT PRIMARY KEY,
        system_prompt TEXT,
        model TEXT,
        excluded_numbers TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );
  
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        agent_id TEXT,
        status TEXT,
        qr TEXT,
        auth_path TEXT,
        ai_enabled BOOLEAN DEFAULT 1,
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
  
      -- blog posts table
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        slug TEXT UNIQUE,
        excerpt TEXT,
        content TEXT,
        category TEXT,
        read_time TEXT,
        author_name TEXT,
        author_role TEXT,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  
      -- payment methods table
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL, -- 'bank', 'wallet', 'other'
        details TEXT, -- JSON or text details (account number, etc)
        instructions TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  
      -- api keys table
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        name TEXT,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)
  
    // migration: add agent_id to sessions if missing
    try {
      const info = db.prepare("PRAGMA table_info(sessions)").all()
      const hasAgentId = info.some(c => c.name === 'agent_id')
      if (!hasAgentId) {
        db.exec("ALTER TABLE sessions ADD COLUMN agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL")
      }
    } catch (e) { console.error('sessions agent_id migration failed', e && e.message) }
  
    // migration: add status to posts if missing
    try{
      const info = db.prepare("PRAGMA table_info(posts)").all()
      const hasStatus = info.some(c=>c.name==='status')
      if (!hasStatus){
        db.exec("ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'Draft'")
      }
    }catch(e){ console.error('posts status migration failed', e && e.message) }
  
    // migration: add phone to users if missing
    try{
      const info = db.prepare("PRAGMA table_info(users)").all()
      const hasPhone = info.some(c=>c.name==='phone')
      if (!hasPhone){
        db.exec("ALTER TABLE users ADD COLUMN phone TEXT")
      }
    }catch(e){ console.error('users phone migration failed', e && e.message) }
  
    // migration: add ai_enabled to sessions if missing
    try{
      const info = db.prepare("PRAGMA table_info(sessions)").all()
      const hasAi = info.some(c=>c.name==='ai_enabled')
      if (!hasAi){
        db.exec("ALTER TABLE sessions ADD COLUMN ai_enabled BOOLEAN DEFAULT 1")
      }
    }catch(e){ console.error('sessions ai_enabled migration failed', e && e.message) }
  
    // migration: add sessions_count to usage if missing
    try{
      const info = db.prepare("PRAGMA table_info(usage)").all()
      const hasSessionsCount = info.some(c=>c.name==='sessions_count')
      if (!hasSessionsCount){
        db.exec("ALTER TABLE usage ADD COLUMN sessions_count INTEGER DEFAULT 0")
        
        // backfill based on current active sessions for the user
        const users = db.prepare("SELECT id FROM users").all()
        for(const u of users){
            const active = db.prepare("SELECT COUNT(*) as cnt FROM sessions WHERE user_id=?").get(u.id)
            const cnt = active ? active.cnt : 0
            if (cnt > 0) {
               const latest = db.prepare("SELECT id FROM usage WHERE user_id=? ORDER BY period_start DESC LIMIT 1").get(u.id)
               if (latest) {
                   db.prepare("UPDATE usage SET sessions_count=? WHERE id=?").run(cnt, latest.id)
               }
            }
        }
      }
    }catch(e){ console.error('usage sessions_count migration failed', e && e.message) }

    // migration: add avatar_url to users if missing
    try{
      const info = db.prepare("PRAGMA table_info(users)").all()
      const hasAvatar = info.some(c=>c.name==='avatar_url')
      if (!hasAvatar){
        db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT")
      }
    }catch(e){ console.error('users avatar migration failed', e && e.message) }
  
    // migration: add price_monthly to plans if missing
    try{
      const info = db.prepare("PRAGMA table_info(plans)").all()
      const hasPrice = info.some(c=>c.name==='price_monthly')
      if (!hasPrice){
        db.exec("ALTER TABLE plans ADD COLUMN price_monthly INTEGER DEFAULT 0")
      }
    }catch(e){ console.error('migration failed', e && e.message) }
  
    // migration: add status to subscriptions if missing
    try{
      const info = db.prepare("PRAGMA table_info(subscriptions)").all()
      const hasStatus = info.some(c=>c.name==='status')
      if (!hasStatus){
        db.exec("ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT 'active'")
      }
    }catch(e){ console.error('sub migration failed', e && e.message) }
  
    // migration: add description and features to plans if missing
    try{
      const info = db.prepare("PRAGMA table_info(plans)").all()
      const hasDesc = info.some(c=>c.name==='description')
      if (!hasDesc){
        db.exec("ALTER TABLE plans ADD COLUMN description TEXT")
        db.exec("ALTER TABLE plans ADD COLUMN features TEXT")
      }
    }catch(e){ console.error('plans desc migration failed', e && e.message) }
  
    // migration: add extra columns to sessions for dashboard details
    try{
      const info = db.prepare("PRAGMA table_info(sessions)").all()
      const cols = info.map(c=>c.name)
      if (!cols.includes('phone_number')) db.exec("ALTER TABLE sessions ADD COLUMN phone_number TEXT")
      if (!cols.includes('contact_name')) db.exec("ALTER TABLE sessions ADD COLUMN contact_name TEXT")
      if (!cols.includes('platform')) db.exec("ALTER TABLE sessions ADD COLUMN platform TEXT DEFAULT 'WhatsApp'")
      if (!cols.includes('device')) db.exec("ALTER TABLE sessions ADD COLUMN device TEXT")
      if (!cols.includes('battery_level')) db.exec("ALTER TABLE sessions ADD COLUMN battery_level INTEGER DEFAULT 0")
      if (!cols.includes('last_active')) db.exec("ALTER TABLE sessions ADD COLUMN last_active DATETIME")
    }catch(e){ console.error('sessions extra cols migration failed', e && e.message) }
  
    // migration: add excluded_numbers to agents_meta if missing
    try{
      const info = db.prepare("PRAGMA table_info(agents_meta)").all()
      const hasCol = info.some(c=>c.name==='excluded_numbers')
      if (!hasCol){
        db.exec("ALTER TABLE agents_meta ADD COLUMN excluded_numbers TEXT")
      }
    }catch(e){ console.error('agents_meta excluded_numbers migration failed', e && e.message) }
  
    // migration: add status to invoices if missing
    try{
      const info = db.prepare("PRAGMA table_info(invoices)").all()
      const hasStatus = info.some(c=>c.name==='status')
      if (!hasStatus){
        db.exec("ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'Unpaid'")
      }
    }catch(e){ console.error('invoices status migration failed', e && e.message) }
  
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
}

module.exports = { pool, init, db }
