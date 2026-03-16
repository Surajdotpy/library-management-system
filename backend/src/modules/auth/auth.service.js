import pool from '../../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
function getJwtSecret() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET must be set in the environment');
    }
    return jwtSecret;
}
const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Find user by email
export async function findUserByEmail(email) {
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
export async function verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}
// Generate JWT token
export function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
    };
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}
// Verify JWT token
export function verifyToken(token) {
    if (!token) {
        return null;
    }
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
// Convert User to UserResponse (remove password)
export function sanitizeUser(user) {
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
export async function loginUser(email, password) {
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
export async function hashPassword(plainPassword) {
    const saltRounds = 10;
    return bcrypt.hash(plainPassword, saltRounds);
}
//# sourceMappingURL=auth.service.js.map