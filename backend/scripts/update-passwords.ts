/**
 * UPDATE PASSWORDS SCRIPT
 *
 * Purpose: Resets configured admin passwords from .env values.
 *
 * Usage:
 *   npm run script:reset-passwords
 *
 * Warning:
 *   This resets every configured admin account password.
 */

import bcrypt from 'bcrypt';
import pool from '../src/config/db.js';

function requireConfiguredPassword(envKey: string): string {
  const password = process.env[envKey]?.trim();

  if (!password) {
    throw new Error(`${envKey} must be set before running this script`);
  }

  if (
    password.toLowerCase() === 'admin123' ||
    password.toLowerCase().startsWith('change_me')
  ) {
    throw new Error(`${envKey} still contains an insecure placeholder value`);
  }

  if (password.length < 12) {
    throw new Error(`${envKey} must be at least 12 characters long`);
  }

  return password;
}

async function updateAllPasswords() {
  try {
    console.log('Starting password reset.\n');

    const usersToUpdate = [
      {
        email: process.env.DEFAULT_SUPERADMIN_EMAIL || 'admin@library.com',
        password: requireConfiguredPassword('DEFAULT_SUPERADMIN_PASSWORD'),
        role: 'superadmin',
      },
      {
        email: process.env.DEFAULT_ADMIN1_EMAIL || 'admin1@library.com',
        password: requireConfiguredPassword('DEFAULT_ADMIN1_PASSWORD'),
        role: 'admin',
      },
      {
        email: process.env.DEFAULT_ADMIN2_EMAIL || 'admin2@library.com',
        password: requireConfiguredPassword('DEFAULT_ADMIN2_PASSWORD'),
        role: 'admin',
      },
      {
        email: process.env.DEFAULT_ADMIN3_EMAIL || 'admin3@library.com',
        password: requireConfiguredPassword('DEFAULT_ADMIN3_PASSWORD'),
        role: 'admin',
      },
      {
        email: process.env.DEFAULT_ADMIN4_EMAIL || 'admin4@library.com',
        password: requireConfiguredPassword('DEFAULT_ADMIN4_PASSWORD'),
        role: 'admin',
      },
    ];

    for (const userData of usersToUpdate) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const result = await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
        [hashedPassword, userData.email],
      );

      if (result.rows.length > 0) {
        console.log(`${userData.email}: password reset`);
      } else {
        console.log(`${userData.email}: user not found in database`);
      }
    }

    console.log('\nAll passwords reset successfully.');
    console.log('Credentials remain defined in your .env file.');
    console.log('Remember to rotate these passwords after login.');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

updateAllPasswords();
