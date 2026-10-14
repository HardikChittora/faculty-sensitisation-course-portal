import tls from 'tls';
import dotenv from 'dotenv';
import { dbManager } from '../db/db.js';
import { verifyPassword } from './passwords.js';

dotenv.config();

const ZIMBRA_HOST = process.env.ZIMBRA_HOST || '';
const ZIMBRA_PORT = parseInt(process.env.ZIMBRA_PORT || '993', 10);
const ZIMBRA_DOMAIN = process.env.ZIMBRA_DOMAIN || 'iitkgp.ac.in';
const ZIMBRA_DEV_MODE = process.env.ZIMBRA_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';

/**
 * Authenticates against Zimbra Mail Server via IMAPS (port 993)
 * or falls back to institute development directory.
 */
export async function authenticateZimbra(usernameOrEmail, password) {
  if (typeof usernameOrEmail !== 'string' || typeof password !== 'string' || !usernameOrEmail.trim() || !password) {
    return { success: false, message: 'Email and password are required.' };
  }
  const cleanInput = usernameOrEmail.trim().toLowerCase();
  
  // Normalize email
  let fullEmail = cleanInput;
  let username = cleanInput;
  if (cleanInput.includes('@')) {
    username = cleanInput.split('@')[0];
  } else {
    fullEmail = `${cleanInput}@${ZIMBRA_DOMAIN}`;
  }

  // PostgreSQL is the only source of administrator identities and passwords.
  // A wrong password must never fall through to faculty/development login.
  const admin = await dbManager.getAdminForLogin(cleanInput);
  if (admin) {
    if (!await verifyPassword(password, admin.password_hash)) {
      return { success: false, message: 'Invalid administrator credentials.' };
    }
    return {
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        department: admin.department,
        role: 'admin',
        authMethod: 'Database-Admin'
      }
    };
  }

  // Live faculty authentication through Zimbra IMAPS.
  if (!ZIMBRA_DEV_MODE && ZIMBRA_HOST && ZIMBRA_HOST !== 'localhost') {
    try {
      const imapAuthSuccess = await tryImapsZimbraLogin(fullEmail, password);
      if (imapAuthSuccess) {
        // Find or create faculty profile in PostgreSQL DB
        let user = await dbManager.getUserById(fullEmail) || await dbManager.getUserById(username);
        if (!user) {
          user = await dbManager.createUserIfNotExists({
            id: username,
            email: fullEmail,
            name: formatNameFromEmail(username),
            department: 'Higher Education Faculty',
            role: 'faculty'
          });
        }
        return { success: true, user: { ...user, role: 'faculty', authMethod: 'Zimbra-IMAPS' } };
      }
    } catch (err) {
      console.warn(`[Zimbra Auth] Live IMAPS server connection to ${ZIMBRA_HOST} failed:`, err.message);
    }
  }

  // Explicit local development bypass; disabled in production.
  if (ZIMBRA_DEV_MODE) {
    let user = await dbManager.getUserById(username) || await dbManager.getUserById(fullEmail);
    if (!user) {
      user = await dbManager.createUserIfNotExists({
        id: username,
        email: fullEmail,
        name: formatNameFromEmail(username),
        department: 'Higher Education Faculty',
        role: 'faculty'
      });
    }
    return {
      success: true,
      user: {
        ...user,
        role: 'faculty',
        authMethod: 'Zimbra-DevMode'
      }
    };
  }

  // If credentials did not match
  return {
    success: false,
    message: 'Invalid Zimbra credentials.'
  };
}

/**
 * IMAPS TLS handshake and LOGIN command execution for Zimbra Collaboration Server
 */
function tryImapsZimbraLogin(email, password) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: ZIMBRA_HOST,
      port: ZIMBRA_PORT,
      rejectUnauthorized: false, // Institute self-signed certs support
      timeout: 4000
    });

    let authenticated = false;
    let step = 0;

    socket.on('data', (data) => {
      const response = data.toString();

      if (step === 0 && response.includes('* OK')) {
        step = 1;
        // Send IMAP LOGIN command
        socket.write(`A01 LOGIN "${email}" "${password}"\r\n`);
      } else if (step === 1) {
        if (response.includes('A01 OK')) {
          authenticated = true;
          socket.write(`A02 LOGOUT\r\n`);
          socket.end();
          resolve(true);
        } else if (response.includes('A01 NO') || response.includes('A01 BAD')) {
          socket.end();
          resolve(false);
        }
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timed out to Zimbra host'));
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('end', () => {
      if (!authenticated) resolve(false);
    });
  });
}

function formatNameFromEmail(username) {
  const parts = username.split(/[._-]/);
  return 'Prof. ' + parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
