import pool from '../src/config/db.ts';
import { hashPassword } from '../src/modules/auth/auth.service.ts';

async function createAdmin() {
  try {
    // Hash the password "admin123"
    const hashedPassword = await hashPassword('admin123');
    
    // Insert admin into database
    const query = `
      INSERT INTO users (
        name, email, password, role, is_active, real_name
      ) VALUES (
        'admin', 'admin@library.com', $1, 'superadmin', true, 'Super Admin'
      )
      RETURNING id, name, email, role;
    `;
    
    const result = await pool.query(query, [hashedPassword]);
    
    console.log('✅ Admin created successfully!');
    console.log(result.rows[0]);
    console.log('\nLogin credentials:');
    console.log('Email: admin@library.com');
    console.log('Password: admin123');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    if (error.code === '23505') {
      console.log('✅ Admin already exists!');
      console.log('\nLogin credentials:');
      console.log('Email: admin@library.com');
      console.log('Password: admin123');
    } else {
      console.error('❌ Error creating admin:', error);
    }
    await pool.end();
    process.exit(error.code === '23505' ? 0 : 1);
  }
}

createAdmin();