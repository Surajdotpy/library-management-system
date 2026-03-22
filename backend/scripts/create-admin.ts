/**
 * CREATE ADMIN SCRIPT
 * 
 * Purpose: Creates initial superadmin account for first-time setup
 * 
 * Usage:
 *   npm run script:create-admin
 * 
 * Credentials:
 *   Loaded from .env file (DEFAULT_SUPERADMIN_EMAIL, DEFAULT_SUPERADMIN_PASSWORD)
 * 
 * Security:
 *   - Password is hashed with bcrypt before storage
 *   - Change password immediately after first login
 *   - .env file is NOT committed to GitHub
 */

import dotenv from 'dotenv';
import pool from '../src/config/db.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

// Load environment variables
dotenv.config();

async function createAdmin() {
  try {
    // Get credentials from environment variables
    const email = process.env.DEFAULT_SUPERADMIN_EMAIL || 'admin@library.com';
    const password = process.env.DEFAULT_SUPERADMIN_PASSWORD || 'admin123';
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Insert admin into database
    const query = `
      INSERT INTO users (
        name, email, password, role, is_active, real_name
      ) VALUES (
        'admin', $1, $2, 'superadmin', true, 'Super Admin'
      )
      RETURNING id, name, email, role;
    `;
    
    const result = await pool.query(query, [email, hashedPassword]);
    
    console.log('✅ Admin created successfully!');
    console.log(result.rows[0]);
    console.log('\n📋 Login credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Change this password immediately after first login!');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    if (error.code === '23505') {
      console.log('✅ Admin already exists!');
      console.log('\n📋 Login credentials are in your .env file');
      console.log('   DEFAULT_SUPERADMIN_EMAIL');
      console.log('   DEFAULT_SUPERADMIN_PASSWORD');
    } else {
      console.error('❌ Error creating admin:', error);
    }
    await pool.end();
    process.exit(error.code === '23505' ? 0 : 1);
  }
}

createAdmin();