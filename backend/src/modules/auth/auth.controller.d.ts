import type { Request, Response } from 'express';
import type { AuthRequest } from './auth.types.js';
export declare function login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function logout(req: Request, res: Response): Promise<void>;
export declare function getCurrentUser(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.controller.d.ts.map