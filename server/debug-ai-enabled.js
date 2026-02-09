const db = require('./src/db');

async function checkAiEnabled() {
  const sessions = await db.pool.query('SELECT id, user_id, status, agent_id, ai_enabled FROM sessions');
  console.log('Sessions:', sessions.rows);
}

checkAiEnabled();
