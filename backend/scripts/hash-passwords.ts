import pool from '../src/config/db.ts';
import { hashPassword } from '../src/modules/auth/auth.service.ts';

async function hashAllPasswords() {
  try {
    // Get all users
    const getUsersQuery = 'SELECT id, email, password FROM users';
    const users = await pool.query(getUsersQuery);
    
    console.log(`Found ${users.rows.length} users\n`);
    
    for (const user of users.rows) {
      // Check if already hashed (starts with $2b$)
      if (user.password.startsWith('$2b$')) {
        console.log(`✅ ${user.email} - Already hashed, skipping`);
        continue;
      }
      
      // Hash the plain text password
      const hashedPassword = await hashPassword(user.password);
      
      // Update in database
      const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
      await pool.query(updateQuery, [hashedPassword, user.id]);
      
      console.log(`✅ ${user.email} - Hashed password: "${user.password}"`);
    }
    
    console.log('\n✅ All passwords hashed successfully!');
    console.log('\nYou can now login with the original passwords.');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

hashAllPasswords();