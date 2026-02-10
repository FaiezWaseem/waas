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
          // MySQL requires 'YYYY-MM-DD HH:MM:SS' format
          const start = new Date().toISOString().slice(0, 19).replace('T', ' ')
          const end = new Date()
          end.setMonth(end.getMonth() + 1)
          const endStr = end.toISOString().slice(0, 19).replace('T', ' ')
          
          await db.pool.query(
              'INSERT INTO subscriptions(id, user_id, plan_id, period_start, period_end, created_at) VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
              [subId, id, planId, start, endStr]
          )
          
          // Create usage record
          const usageId = uuidv4()
          await db.pool.query(
              'INSERT INTO usage(id, user_id, period_start, period_end, messages_count, chats_count, created_at) VALUES($1, $2, $3, $4, 0, 0, CURRENT_TIMESTAMP)',
              [usageId, id, start, endStr]
          )
          console.log('Default user subscribed to Basic plan.')
      }
    }
  } catch (e) {
    console.error('Failed to seed default user:', e)
  }

  // 4. Seed Blog Posts
  try {
    const r = await db.pool.query('SELECT COUNT(*) as count FROM posts')
    const count = parseInt(r.rows[0].count)
    if (count > 0) {
      console.log('Blog posts already exist. Skipping seed.')
    } else {
      console.log('Seeding initial blog posts...')
      const posts = [
        {
          title: "Introducing WaaS v2.0: The Future of WhatsApp Automation",
          slug: "waas-v2-launch",
          excerpt: "We've completely rewritten our core engine to be faster, more reliable, and easier to use. Here's what's new.",
          content: `
            <p>We are thrilled to announce the release of WaaS v2.0, a major update that completely redefines how businesses interact with WhatsApp.</p>
            
            <h2>What's New?</h2>
            <p>Our team has been working tirelessly for the past six months to bring you a more robust, faster, and scalable platform. Here are the key highlights:</p>
            
            <ul>
              <li><strong>New Core Engine:</strong> We rewrote our message processing engine from scratch in Rust, resulting in 10x faster message delivery.</li>
              <li><strong>Enhanced Webhooks:</strong> You can now subscribe to granular events like 'message_read', 'message_failed', and 'contact_blocked'.</li>
              <li><strong>Visual Flow Builder:</strong> Build complex chatbots using our new drag-and-drop interface. No coding required!</li>
            </ul>

            <h2>Why the Change?</h2>
            <p>As our user base grew, we noticed that many of you were pushing the limits of our previous architecture. We wanted to ensure that WaaS could scale with you, whether you're sending 100 messages a day or 100,000.</p>

            <h2>Getting Started</h2>
            <p>To upgrade to v2.0, simply log in to your dashboard and follow the migration guide. It takes less than 5 minutes, and all your existing data will be preserved.</p>
          `,
          category: "Product",
          read_time: "5 min read",
          author_name: "Faiez",
          author_role: "Founder & CEO",
          published_at: "2026-02-08T10:00:00ZZ"
        },
        {
          title: "How to Build a WhatsApp Chatbot in 5 Minutes",
          slug: "build-whatsapp-chatbot-5-minutes",
          excerpt: "Learn how to use our new webhooks and API to build a simple auto-reply bot for your business.",
          content: `
            <p>Chatbots are a great way to automate customer support and engagement. In this tutorial, we'll show you how to build a simple auto-reply bot using WaaS.</p>

            <h2>Prerequisites</h2>
            <p>Before we begin, make sure you have:</p>
            <ul>
              <li>A WaaS account (sign up for free)</li>
              <li>A WhatsApp number linked to your account</li>
              <li>A basic understanding of HTTP webhooks</li>
            </ul>

            <h2>Step 1: Set up a Webhook</h2>
            <p>Go to your WaaS dashboard and navigate to the "Webhooks" section. Create a new webhook pointing to your server's endpoint (e.g., https://api.yoursite.com/webhook).</p>

            <h2>Step 2: Handle Incoming Messages</h2>
            <p>When a user sends a message to your WhatsApp number, WaaS will send a POST request to your webhook. Here's a simple Node.js example to handle it:</p>

            <pre><code>app.post('/webhook', (req, res) => {
  const { from, body } = req.body;
  
  if (body.toLowerCase() === 'hello') {
    sendMessage(from, 'Hi there! How can I help you?');
  }
  
  res.sendStatus(200);
});</code></pre>

            <h2>Step 3: Test It Out</h2>
            <p>Send "hello" to your WhatsApp number. You should receive an instant reply! It's that simple.</p>
          `,
          category: "Tutorial",
          read_time: "8 min read",
          author_name: "Team WaaS",
          author_role: "Developer Relations",
          published_at: "2026-02-01 10:00:00"
        },
        {
          title: "Best Practices for WhatsApp Marketing Campaigns",
          slug: "whatsapp-marketing-best-practices",
          excerpt: "Avoid getting banned and maximize your conversion rates with these proven strategies.",
          content: `
            <p>WhatsApp has an open rate of over 98%, making it one of the most effective marketing channels. However, it also has strict policies to prevent spam.</p>

            <h2>1. Get Opt-in Consent</h2>
            <p>Never send messages to users who haven't explicitly agreed to receive them. This is the fastest way to get your number banned.</p>

            <h2>2. Provide Value, Not Just Noise</h2>
            <p>Don't just blast promotional offers. Send useful updates, order notifications, or personalized content that your users actually care about.</p>

            <h2>3. Respect Opt-out Requests</h2>
            <p>Always provide an easy way for users to unsubscribe. For example, "Reply STOP to unsubscribe". If a user asks to stop, honor it immediately.</p>

            <h2>Conclusion</h2>
            <p>By following these simple rules, you can build a sustainable and high-converting marketing channel on WhatsApp.</p>
          `,
          category: "Guides",
          read_time: "6 min read",
          author_name: "Marketing Team",
          author_role: "Growth",
          published_at: "2026-01-25 10:00:00"
        }
      ]

      for (const p of posts) {
        const id = uuidv4()
        await db.pool.query(
          'INSERT INTO posts(id, title, slug, excerpt, content, category, read_time, author_name, author_role, published_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [id, p.title, p.slug, p.excerpt, p.content, p.category, p.read_time, p.author_name, p.author_role, p.published_at]
        )
      }
      console.log(`Seeded ${posts.length} blog posts.`)
    }
  } catch (e) {
    console.error('Failed to seed blog posts:', e)
  }

  console.log('Seeding completed.')
}

if (require.main === module) {
  seed().catch(console.error)
}

module.exports = seed
