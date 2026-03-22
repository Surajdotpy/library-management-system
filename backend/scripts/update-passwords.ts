/**
 * UPDATE PASSWORDS SCRIPT
 * 
 * Purpose: Resets all user passwords to defaults from .env
 * 
 * Usage:
 *   npm run script:reset-passwords
 * 
 * ⚠️  WARNING: This will reset ALL user passwords!
 *    Use only when needed (e.g., forgot all passwords)
 * 
 * Credentials:
 *   Loaded from .env file
 */

import dotenv from 'dotenv';
import pool from '../src/config/db.js';
import bcrypt from 'bcrypt';

// Load environment variables
dotenv.config();

async function updateAllPasswords() {
  try {
    console.log('🔐 Starting password reset...\n');
    
    // Define all users with their credentials from .env
    const usersToUpdate = [
      { 
        email: process.env.DEFAULT_SUPERADMIN_EMAIL || 'admin@library.com', 
        password: process.env.DEFAULT_SUPERADMIN_PASSWORD || 'admin123', 
        role: 'superadmin' 
      },
      { 
        email: process.env.DEFAULT_ADMIN1_EMAIL || 'admin1@library.com', 
        password: process.env.DEFAULT_ADMIN1_PASSWORD || 'admin123', 
        role: 'admin' 
      },
      { 
        email: process.env.DEFAULT_ADMIN2_EMAIL || 'admin2@library.com', 
        password: process.env.DEFAULT_ADMIN2_PASSWORD || 'admin123', 
        role: 'admin' 
      },
      { 
        email: process.env.DEFAULT_ADMIN3_EMAIL || 'admin3@library.com', 
        password: process.env.DEFAULT_ADMIN3_PASSWORD || 'admin123', 
        role: 'admin' 
      },
      { 
        email: process.env.DEFAULT_ADMIN4_EMAIL || 'admin4@library.com', 
        password: process.env.DEFAULT_ADMIN4_PASSWORD || 'admin123', 
        role: 'admin' 
      }
    ];
    
    for (const userData of usersToUpdate) {
      // Generate fresh hash for each password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Update in database
      const result = await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
        [hashedPassword, userData.email]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ ${userData.email} → Password reset`);
      } else {
        console.log(`⚠️  ${userData.email} → User not found in database`);
      }
    }
    
    console.log('\n✅ All passwords reset successfully!');
    console.log('\n📋 Credentials are stored in your .env file');
    console.log('⚠️  Remember to change these passwords after login!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

updateAllPasswords();