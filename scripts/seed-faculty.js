// Import reviewed faculty JSON without deleting records or resetting progress.
// Run: npm run faculty:seed -- [input.json]
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const input = process.argv[2] || fileURLToPath(new URL('../data/faculty.json', import.meta.url));
const faculty = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(faculty) || faculty.length === 0 || faculty.some(person =>
  !person || ['id', 'email', 'name', 'department'].some(key => typeof person[key] !== 'string' || !person[key].trim())
)) {
  throw new Error('Expected a non-empty JSON array with id, email, name and department for every entry.');
}

const emails = new Set();
const idCounts = new Map();
for (const person of faculty) {
  const email = person.email.trim().toLowerCase();
  if (emails.has(email)) throw new Error('Duplicate email in input; review the directory before importing.');
  emails.add(email);
  const id = person.id.trim();
  idCounts.set(id, (idCounts.get(id) || 0) + 1);
}

const { dbManager } = await import('../server/db/db.js');
let client;
try {
  await dbManager.ready();
  if (!dbManager.usePostgres) throw new Error('PostgreSQL is unavailable; no faculty records imported.');
  client = await dbManager.pool.connect();
  await client.query('BEGIN');
  let imported = 0;
  for (const person of faculty) {
    const email = person.email.trim().toLowerCase();
    let id = person.id.trim();
    // Directory usernames can occur in several departments. Keep those
    // separate using stable email-derived IDs, within the schema's 50 chars.
    if (idCounts.get(id) > 1) {
      id = `${id.slice(0, 37)}_${createHash('sha256').update(email).digest('hex').slice(0, 12)}`;
    }
    const result = await client.query(
      `INSERT INTO users (id, email, name, department, role)
       VALUES ($1, $2, $3, $4, 'faculty')
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name, department = EXCLUDED.department
       WHERE users.role = 'faculty'
       RETURNING id`,
      [id, email, person.name.trim(), person.department.trim()]
    );
    if (result.rowCount === 0) throw new Error(`Refusing to overwrite non-faculty account: ${person.id}`);
    await client.query(
      `INSERT INTO user_progress (user_id, module_id, unlocked)
       SELECT $1, id, module_num = 1 FROM modules WHERE course_id = 'c1'
       ON CONFLICT (user_id, module_id) DO NOTHING`,
      [result.rows[0].id]
    );
    imported++;
  }
  await client.query('COMMIT');
  console.log(`Imported ${imported} faculty records. Existing progress and attempts were preserved.`);
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error(`Import failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  client?.release();
  await dbManager.pool?.end();
}
