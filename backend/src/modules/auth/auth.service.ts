import pool from '../../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User, JWTPayload, UserResponse } from './auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  const query = `
    SELECT * FROM users
    WHERE email = $1 AND is_active = true
  `;
  
  console.log('🔍 Looking for email:', email);
  
  const result = await pool.query(query, [email]);
  
  console.log('📊 Found users:', result.rows.length);
  if (result.rows.length > 0) {
    console.log('👤 User found:', result.rows[0].email);
    console.log('🔐 Password hash:', result.rows[0].password.substring(0, 20) + '...');
  }
  
  if (result.rows.length === 0) {
    console.log('❌ No user found with this email!');
    return null;
  }
  
  return result.rows[0];
}

// Verify password
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  } as jwt.SignOptions);
}

// Verify JWT token
export function verifyToken(token: string | undefined): JWTPayload | null {
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Convert User to UserResponse (remove password)
export function sanitizeUser(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id,
    real_name: user.real_name,
    is_active: user.is_active
  };
}

// Main login function
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
  console.log('🔐 LOGIN ATTEMPT:');
  console.log('   Email:', email);
  console.log('   Password:', password);
  
  // Find user by email
  const user = await findUserByEmail(email);
  
  if (!user) {
    console.log('❌ User not found');
    return null;
  }
  
  console.log('✅ User found, checking password...');
  console.log('   Comparing:', password);
  console.log('   Against hash:', user.password.substring(0, 30) + '...');
  
  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  
  console.log('   Password match?', isPasswordValid);
  
  if (!isPasswordValid) {
    console.log('❌ Password verification failed!');
    return null;
  }
  
  console.log('✅ Password correct! Generating token...');
  
  // Generate token
  const token = generateToken(user);
  
  console.log('✅ Login successful!');
  
  return { user, token };
}

// Hash password (for creating new users - optional, for later)
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
}