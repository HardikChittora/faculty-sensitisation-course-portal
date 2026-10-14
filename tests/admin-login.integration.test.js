import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import pg from 'pg';
import { seedAdmin } from '../server/auth/adminSeed.js';
import { hashPassword } from '../server/auth/passwords.js';

test('admin login uses current DB credentials, excludes hashes, and cannot fall back to faculty auth', {
  skip: !process.env.TEST_DATABASE_URL && 'Set TEST_DATABASE_URL to a disposable PostgreSQL database.',
  timeout: 30000
}, async () => {
  const schema = `admin_login_test_${randomBytes(8).toString('hex')}`;
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let pool;
  let server;
  let output = '';
  try {
    await control.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
    await pool.query(await fs.readFile(new URL('../server/db/init.sql', import.meta.url), 'utf8'));
    await seedAdmin(pool, { ADMIN_EMAIL: 'first.admin@iitkgp.ac.in', ADMIN_PASSWORD: 'initial-database-password' });

    const probe = net.createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const url = new URL(process.env.TEST_DATABASE_URL);
    url.searchParams.set('options', `-c search_path=${schema}`);
    server = spawn(process.execPath, ['server/server.js'], {
      cwd: new URL('../', import.meta.url),
      env: {
        ...process.env,
        DATABASE_URL: url.toString(), PORT: String(port), NODE_ENV: 'development',
        // Conflicting env values must have no influence on the seeded login.
        ADMIN_EMAIL: 'env-only@iitkgp.ac.in', ADMIN_PASSWORD: 'environment-password',
        ZIMBRA_DEV_MODE: 'true', ZIMBRA_HOST: '', OTP_DEV_MODE: 'true',
        SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: ''
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    server.stdout.on('data', chunk => { output += chunk; });
    server.stderr.on('data', chunk => { output += chunk; });
    const api = async (path, body) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      return { status: response.status, data: await response.json() };
    };
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        if ((await api('/api/courses')).status === 200) { ready = true; break; }
      } catch { /* Wait for the child server to listen. */ }
      await delay(100);
    }
    assert.ok(ready, `API did not start: ${output}`);
    const login = (email, password) => api('/api/auth/login', { email, password });
    for (const identity of ['first.admin@iitkgp.ac.in', 'FIRST.ADMIN', 'admin']) {
      const result = await login(identity, 'initial-database-password');
      assert.equal(result.status, 200);
      assert.equal(result.data.user.role, 'admin');
      assert.equal(result.data.user.authMethod, 'Database-Admin');
      assert.equal('password_hash' in result.data.user, false);
    }
    assert.equal((await login('first.admin', 'environment-password')).status, 401);
    assert.equal((await login('admin', 'wrong')).status, 401);
    const envIdentity = await login('env-only@iitkgp.ac.in', 'environment-password');
    assert.notEqual(envIdentity.data.user?.role, 'admin');
    assert.equal((await api('/api/auth/request-otp', { email: 'first.admin' })).status, 403);
    // Even a pre-existing correct OTP may not authenticate an administrator.
    await pool.query("INSERT INTO otps(email,otp,expires_at) VALUES ('first.admin@iitkgp.ac.in','123456',NOW()+INTERVAL '5 minutes')");
    assert.equal((await api('/api/auth/verify-otp', { email: 'first.admin@iitkgp.ac.in', otp: '123456' })).status, 403);
    assert.equal((await api('/api/auth/enroll', { id: 'admin', email: 'first.admin@iitkgp.ac.in' })).status, 403);

    // A trusted DB update takes effect immediately, without restarting the API.
    await pool.query('UPDATE admin_credentials SET password_hash=$1 WHERE user_id=$2', [await hashPassword('updated-database-password'), 'admin']);
    await pool.query("UPDATE users SET email='updated.admin@iitkgp.ac.in' WHERE id='admin'");
    assert.equal((await login('admin', 'initial-database-password')).status, 401);
    const updated = await login('updated.admin@iitkgp.ac.in', 'updated-database-password');
    assert.equal(updated.status, 200);
    assert.equal(updated.data.user.email, 'updated.admin@iitkgp.ac.in');
    await seedAdmin(pool, { ADMIN_EMAIL: 'first.admin@iitkgp.ac.in', ADMIN_PASSWORD: 'initial-database-password' });
    assert.equal((await login('admin', 'updated-database-password')).status, 200);
  } finally {
    if (server && server.exitCode === null) {
      const stopped = once(server, 'exit');
      server.kill('SIGTERM');
      await stopped;
    }
    await pool?.end();
    await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await control.end();
  }
});
