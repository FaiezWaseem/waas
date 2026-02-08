
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

async function resetSessions() {
  console.log('Starting session reset...');

  // 1. Initialize DB connection
  await db.init();

  try {
    // 2. Delete all sessions from database
    console.log('Clearing sessions table...');
    await db.pool.query('DELETE FROM sessions');
    console.log('Sessions table cleared.');

    // 3. Delete physical session files
    const sessionsDir = path.join(__dirname, 'sessions');
    if (fs.existsSync(sessionsDir)) {
      console.log(`Cleaning up sessions directory: ${sessionsDir}`);
      const files = fs.readdirSync(sessionsDir);
      
      for (const file of files) {
        // Skip .gitignore or keep-files if any
        if (file === '.gitignore' || file === '.keep') continue;
        
        const curPath = path.join(sessionsDir, file);
        try {
            fs.rmSync(curPath, { recursive: true, force: true });
            console.log(`Deleted: ${file}`);
        } catch (err) {
            console.error(`Failed to delete ${file}:`, err.message);
        }
      }
    } else {
        console.log('Sessions directory does not exist.');
    }

    console.log('All sessions reset successfully.');
  } catch (error) {
    console.error('Error resetting sessions:', error);
  } finally {
    process.exit(0);
  }
}

resetSessions();
