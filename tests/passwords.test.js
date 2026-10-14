import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from '../server/auth/passwords.js';

test('hashes have unique salts, preserve the exact password, and reject wrong passwords', async () => {
  const password = ' Local test password 🔒 $ # ';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password.trim(), first), false);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('missing, malformed and unsupported password hashes fail closed', async () => {
  for (const hash of [null, '', 'plaintext', 'scrypt-v2$bad$bad', 'scrypt-v1$aa$bb']) {
    assert.equal(await verifyPassword('password', hash), false);
  }
  assert.equal(await verifyPassword(null, 'hash'), false);
  await assert.rejects(hashPassword(''), /password is required/);
});
