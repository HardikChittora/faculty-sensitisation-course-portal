import { dbManager } from '../server/db/db.js';
import { seedAdmin } from '../server/auth/adminSeed.js';

try {
  await dbManager.ready();
  if (!dbManager.usePostgres) throw new Error('PostgreSQL is unavailable; administrator was not seeded.');
  const result = await seedAdmin(dbManager.pool);
  console.log(result.created
    ? 'Administrator seeded with a password hash. Remove ADMIN_EMAIL and ADMIN_PASSWORD from .env; login now uses PostgreSQL.'
    : 'Administrator already seeded. Database credentials were left unchanged.');
} catch (error) {
  console.error(`Admin seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await dbManager.pool?.end();
}
