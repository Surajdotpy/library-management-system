import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
export declare function getSeats(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getEligibleStudents(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getSeatBookings(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function createSeatBooking(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function releaseSeatBooking(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=seats.controller.d.ts.map