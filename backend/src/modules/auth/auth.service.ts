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
  
  const result = await pool.query(query, [email]);
  
  if (result.rows.length === 0) {
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
  } as jwt.SignOptions);  // ← FIXED: Added type assertion
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
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
  // Find user by email
  const user = await findUserByEmail(email);
  
  if (!user) {
    return null;  // User not found
  }
  
  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  
  if (!isPasswordValid) {
    return null;  // Wrong password
  }
  
  // Generate token
  const token = generateToken(user);
  
  return { user, token };
}

// Hash password (for creating new users - optional, for later)
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
}