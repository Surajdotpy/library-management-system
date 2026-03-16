import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
export declare function getAdmins(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function createAdmin(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=users.controller.d.ts.map