import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
export declare function getStudents(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getStudent(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function createStudent(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updateStudent(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function deleteStudent(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=students.controller.d.ts.map