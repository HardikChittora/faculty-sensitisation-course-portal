import { hashPassword } from './passwords.js';

export async function seedAdmin(pool, env = process.env) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize simultaneous first-run seed commands.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('sahachar-admin-seed'))");
    const existing = await client.query('SELECT user_id FROM admin_credentials LIMIT 1');
    if (existing.rowCount > 0) {
      await client.query('COMMIT');
      return { created: false };
    }

    // Environment credentials are consulted only while no credential exists.
    const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = env.ADMIN_PASSWORD || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100 || !password) {
      throw new Error('First-time seeding requires a full ADMIN_EMAIL and non-empty ADMIN_PASSWORD in .env.');
    }
    const passwordHash = await hashPassword(password);
    const user = await client.query(
      `INSERT INTO users (id, email, name, department, role, status)
       VALUES ('admin', $1, 'DEAN, Student Wellbeing', 'Institute Administration', 'admin', 'enrolled')
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, status = 'enrolled'
       WHERE users.role = 'admin'
       RETURNING id`,
      [email]
    );
    if (user.rowCount !== 1) throw new Error('The admin ID belongs to a faculty account; no changes were made.');
    await client.query(
      'INSERT INTO admin_credentials (user_id, password_hash) VALUES ($1, $2)',
      [user.rows[0].id, passwordHash]
    );
    await client.query('COMMIT');
    return { created: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
