import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../modules/auth/auth.types.js';
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function requireRole(...allowedRoles: Array<'superadmin' | 'admin'>): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map