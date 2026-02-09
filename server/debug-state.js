const db = require('./src/db');

async function debugState() {
  const users = await db.pool.query('SELECT * FROM users');
  console.log('Users:', users.rows);

  for (const u of users.rows) {
    const sessions = await db.pool.query('SELECT * FROM sessions WHERE user_id=$1', [u.id]);
    console.log(`Sessions for ${u.email}:`, sessions.rows);

    const agents = await db.pool.query('SELECT * FROM agents WHERE user_id=$1', [u.id]);
    console.log(`Agents for ${u.email}:`, agents.rows);

    for (const a of agents.rows) {
      const meta = await db.pool.query('SELECT * FROM agents_meta WHERE agent_id=$1', [a.id]);
      console.log(`Meta for agent ${a.id}:`, meta.rows);
    }
  }
}

debugState();
