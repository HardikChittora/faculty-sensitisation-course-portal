import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';
import { seedAdmin } from '../server/auth/adminSeed.js';
import { verifyPassword } from '../server/auth/passwords.js';

test('first admin seed is transactional, concurrent-safe, and never overwrites DB credentials', {
  skip: !process.env.TEST_DATABASE_URL && 'Set TEST_DATABASE_URL to a disposable PostgreSQL database.'
}, async () => {
  const schema = `admin_seed_test_${randomBytes(8).toString('hex')}`;
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let pool;
  try {
    await control.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
    const sql = await fs.readFile(new URL('../server/db/init.sql', import.meta.url), 'utf8');
    await pool.query(sql);
    await assert.rejects(seedAdmin(pool, {}), /First-time seeding requires/);
    assert.equal((await pool.query('SELECT count(*) FROM users')).rows[0].count, '0');

    const env = { ADMIN_EMAIL: ' First.Admin@example.test ', ADMIN_PASSWORD: 'first-bootstrap-password' };
    const outcomes = await Promise.all([seedAdmin(pool, env), seedAdmin(pool, env)]);
    assert.equal(outcomes.filter(result => result.created).length, 1);
    const original = (await pool.query(
      'SELECT u.email, u.role, c.password_hash FROM users u JOIN admin_credentials c ON c.user_id = u.id'
    )).rows[0];
    assert.equal(original.email, 'first.admin@example.test');
    assert.equal(original.role, 'admin');
    assert.equal(await verifyPassword(env.ADMIN_PASSWORD, original.password_hash), true);
    assert.equal(await verifyPassword('different-password', original.password_hash), false);
    assert.equal((await seedAdmin(pool, { ADMIN_EMAIL: 'changed@example.test', ADMIN_PASSWORD: 'changed' })).created, false);
    assert.equal((await seedAdmin(pool, {})).created, false);
    assert.equal((await pool.query('SELECT password_hash FROM admin_credentials')).rows[0].password_hash, original.password_hash);
    assert.equal((await pool.query('SELECT email FROM users')).rows[0].email, original.email);
    // Hashes never become part of the profile records returned by user APIs.
    assert.equal('password_hash' in (await pool.query('SELECT * FROM users')).rows[0], false);
  } finally {
    await pool?.end();
    await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await control.end();
  }
});

test('first seeding does not replace a faculty account occupying the admin ID', {
  skip: !process.env.TEST_DATABASE_URL && 'Set TEST_DATABASE_URL to a disposable PostgreSQL database.'
}, async () => {
  const schema = `admin_seed_conflict_${randomBytes(8).toString('hex')}`;
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let pool;
  try {
    await control.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
    await pool.query(await fs.readFile(new URL('../server/db/init.sql', import.meta.url), 'utf8'));
    await pool.query("INSERT INTO users(id,email,name,department,role) VALUES ('admin','faculty@example.test','Faculty','Science','faculty')");
    await assert.rejects(seedAdmin(pool, { ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'first-password' }), /belongs to a faculty account/);
    assert.equal((await pool.query('SELECT role,email FROM users')).rows[0].email, 'faculty@example.test');
    assert.equal((await pool.query('SELECT count(*) FROM admin_credentials')).rows[0].count, '0');
  } finally {
    await pool?.end();
    await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await control.end();
  }
});
