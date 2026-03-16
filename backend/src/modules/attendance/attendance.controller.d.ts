import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
export declare function markEntry(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function markExit(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getTodayAttendance(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getStudentAttendance(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getStudentStats(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=attendance.controller.d.ts.map