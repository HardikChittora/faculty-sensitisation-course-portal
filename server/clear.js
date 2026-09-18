import { dbManager } from './db/db.js';

async function clearDB() {
  await dbManager.ready();
  const client = await dbManager.pool.connect();
  try {
    await client.query('DELETE FROM user_progress');
    await client.query("DELETE FROM users WHERE role = 'faculty'");
    console.log('Cleared DB mock data');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
  }
  process.exit(0);
}
clearDB();
