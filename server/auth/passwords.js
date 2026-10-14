import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
// OWASP's scrypt baseline: N=2^17, r=8, p=1. Version the stored format
// so future parameters can be introduced without guessing how to verify it.
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

export async function hashPassword(password) {
  if (typeof password !== 'string' || !password) throw new Error('A password is required.');
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt, 64, options);
  return `scrypt-v1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || !password || typeof storedHash !== 'string') return false;
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(storedHash);
  if (!match) return false;
  const actual = await deriveKey(password, Buffer.from(match[1], 'hex'), 64, options);
  return timingSafeEqual(actual, Buffer.from(match[2], 'hex'));
}
