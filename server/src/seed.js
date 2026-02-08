const db = require('./db')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')

async function seed() {
  console.log('Starting seeder...')

  // 1. Initialize DB (creates tables and default plans)
  console.log('Initializing database schema and default plans...')
  await db.init()
  console.log('Database initialized.')

  // 2. Create Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@waas.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  
  try {
    const r = await db.pool.query('SELECT id FROM users WHERE email=$1', [adminEmail])
    if (r.rows && r.rows.length > 0) {
      console.log(`Admin user (${adminEmail}) already exists. Skipping creation.`)
    } else {
      console.log(`Creating admin user (${adminEmail})...`)
      const hash = await bcrypt.hash(adminPassword, 10)
      const id = uuidv4()
      await db.pool.query(
        'INSERT INTO users(id, email, password_hash, name, role, created_at) VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
        [id, adminEmail, hash, 'Admin', 'admin']
      )
      console.log(`Admin user created successfully. Password: ${adminPassword}`)
    }
  } catch (e) {
    console.error('Failed to seed admin user:', e)
  }

  // 3. Create Default User (Regular User)
  const userEmail = process.env.USER_EMAIL || 'user@waas.local'
  const userPassword = process.env.USER_PASSWORD || 'user123'

  try {
    const r = await db.pool.query('SELECT id FROM users WHERE email=$1', [userEmail])
    if (r.rows && r.rows.length > 0) {
      console.log(`Default user (${userEmail}) already exists. Skipping creation.`)
    } else {
      console.log(`Creating default user (${userEmail})...`)
      const hash = await bcrypt.hash(userPassword, 10)
      const id = uuidv4()
      await db.pool.query(
        'INSERT INTO users(id, email, password_hash, name, role, created_at) VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
        [id, userEmail, hash, 'Default User', 'user']
      )
      console.log(`Default user created successfully. Password: ${userPassword}`)
      
      // Optionally subscribe default user to a plan
      // Check if subscription exists
      const sub = await db.pool.query('SELECT id FROM subscriptions WHERE user_id=$1', [id])
      if (!sub.rows || sub.rows.length === 0) {
          console.log('Subscribing default user to "plan_basic"...')
          const planId = 'plan_basic'
          const subId = uuidv4()
          const start = new Date().toISOString()
          const end = new Date()
          end.setMonth(end.getMonth() + 1)
          
          await db.pool.query(
              'INSERT INTO subscriptions(id, user_id, plan_id, period_start, period_end, created_at) VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
              [subId, id, planId, start, end.toISOString()]
          )
          
          // Create usage record
          const usageId = uuidv4()
          await db.pool.query(
              'INSERT INTO usage(id, user_id, period_start, period_end, messages_count, chats_count, created_at) VALUES($1, $2, $3, $4, 0, 0, CURRENT_TIMESTAMP)',
              [usageId, id, start, end.toISOString()]
          )
          console.log('Default user subscribed to Basic plan.')
      }
    }
  } catch (e) {
    console.error('Failed to seed default user:', e)
  }

  console.log('Seeding completed.')
}

if (require.main === module) {
  seed().catch(console.error)
}

module.exports = seed
