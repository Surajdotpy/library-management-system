import pool from '../../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User, JWTPayload, UserResponse } from './auth.types.js';

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be set in the environment');
  }

  return jwtSecret;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  const query = `
    SELECT *
    FROM users
    WHERE email = $1 AND is_active = true
  `;

  const result = await pool.query(query, [email]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// Verify password
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// Verify JWT token
export function verifyToken(token: string | undefined): JWTPayload | null {
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET) as unknown as JWTPayload;
  } catch {
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
    is_active: user.is_active,
  };
}

// Main login function
export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: User; token: string } | null> {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, user.password);

  if (!isPasswordValid) {
    return null;
  }

  const token = generateToken(user);
  return { user, token };
}

// Hash password (for creating new users - optional, for later)
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}
