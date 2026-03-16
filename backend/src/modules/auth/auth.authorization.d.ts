import type { JWTPayload } from './auth.types.js';
export declare class AuthorizationError extends Error {
    readonly statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare function requireAuthenticatedUser(user: JWTPayload | undefined): JWTPayload;
export declare function resolveAuthorizedBranchId(user: JWTPayload, requestedBranchId?: number): number | undefined;
export declare function isAuthorizationError(error: unknown): error is AuthorizationError;
//# sourceMappingURL=auth.authorization.d.ts.map