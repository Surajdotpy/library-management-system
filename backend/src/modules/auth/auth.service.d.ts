import type { User, JWTPayload, UserResponse } from './auth.types.js';
export declare function findUserByEmail(email: string): Promise<User | null>;
export declare function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
export declare function generateToken(user: User): string;
export declare function verifyToken(token: string | undefined): JWTPayload | null;
export declare function sanitizeUser(user: User): UserResponse;
export declare function loginUser(email: string, password: string): Promise<{
    user: User;
    token: string;
} | null>;
export declare function hashPassword(plainPassword: string): Promise<string>;
//# sourceMappingURL=auth.service.d.ts.map