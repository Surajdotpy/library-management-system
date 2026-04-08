/**
 * CREATE ADMIN SCRIPT
 *
 * Purpose: Creates the initial superadmin account for first-time setup.
 *
 * Usage:
 *   npm run script:create-admin
 *
 * Credentials:
 *   Loaded from .env file (DEFAULT_SUPERADMIN_EMAIL, DEFAULT_SUPERADMIN_PASSWORD)
 *
 * Security:
 *   - Password is hashed with bcrypt before storage
 *   - Change the configured password immediately after first login
 *   - .env file must never be committed
 */

import pool from '../src/config/db.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

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

async function createAdmin() {
  try {
    const email = process.env.DEFAULT_SUPERADMIN_EMAIL || 'admin@library.com';
    const password = requireConfiguredPassword('DEFAULT_SUPERADMIN_PASSWORD');
    const hashedPassword = await hashPassword(password);

    const query = `
      INSERT INTO users (
        name, email, password, role, is_active, real_name
      ) VALUES (
        'admin', $1, $2, 'superadmin', true, 'Super Admin'
      )
      RETURNING id, name, email, role;
    `;

    const result = await pool.query(query, [email, hashedPassword]);

    console.log('Admin created successfully.');
    console.log(result.rows[0]);
    console.log('\nLogin credentials:');
    console.log(`Email: ${email}`);
    console.log('Password: [configured via DEFAULT_SUPERADMIN_PASSWORD]');
    console.log('\nImportant: keep the configured password secret and rotate it after first login.');

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    if (error.code === '23505') {
      console.log('Admin already exists.');
      console.log('\nLogin credentials are configured in your .env file:');
      console.log('DEFAULT_SUPERADMIN_EMAIL');
      console.log('DEFAULT_SUPERADMIN_PASSWORD');
    } else {
      console.error('Error creating admin:', error);
    }

    await pool.end();
    process.exit(error.code === '23505' ? 0 : 1);
  }
}

createAdmin();
