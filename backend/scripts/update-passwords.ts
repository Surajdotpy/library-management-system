import pool from '../src/config/db.ts';
import bcrypt from 'bcrypt';

async function updateAllPasswords() {
  try {
    console.log('🔐 Starting password update...\n');
    
    // Define all users with their new passwords
    const usersToUpdate = [
      { email: 'superadmin@library.com', password: 'admin123', role: 'superadmin' },
      { email: 'admin1@library.com', password: 'admin123', role: 'admin' },
      { email: 'admin2@library.com', password: 'admin123', role: 'admin' },
      { email: 'admin3@library.com', password: 'admin123', role: 'admin' },
      { email: 'admin4@library.com', password: 'admin123', role: 'admin' }
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
        console.log(`✅ ${userData.email} → Password set to: "${userData.password}"`);
      } else {
        console.log(`⚠️  ${userData.email} → User not found in database`);
      }
    }
    
    console.log('\n✅ All passwords updated successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    usersToUpdate.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

updateAllPasswords();