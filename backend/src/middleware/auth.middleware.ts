import type { Response, NextFunction } from 'express';
import { findUserById, verifyToken } from '../modules/auth/auth.service.ts';
import type { AuthRequest } from '../modules/auth/auth.types.ts';

// Middleware to verify JWT token and authenticate user
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.get('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    // Token format: "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format. Use: Bearer <token>'
      });
    }
    
    const token = parts[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token is missing'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    const user = await findUserById(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive or no longer exists'
      });
    }

    if (user.token_version !== decoded.token_version) {
      return res.status(401).json({
        success: false,
        error: 'Session has expired. Please login again'
      });
    }

    // Always attach the current database state so role and branch access
    // changes take effect immediately.
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id,
      token_version: user.token_version,
    };
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

// Optional: Middleware to check if user has specific role
export function requireRole(...allowedRoles: Array<'superadmin' | 'admin'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
}

// Middleware to require superadmin role
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }
  
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Superadmin access required'
    });
  }
  
  next();
}
