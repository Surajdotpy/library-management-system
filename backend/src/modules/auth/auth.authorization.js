export class AuthorizationError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AuthorizationError';
    }
}
export function requireAuthenticatedUser(user) {
    if (!user) {
        throw new AuthorizationError(401, 'Authentication required');
    }
    return user;
}
export function resolveAuthorizedBranchId(user, requestedBranchId) {
    if (user.role === 'superadmin') {
        return requestedBranchId;
    }
    if (user.branch_id == null) {
        throw new AuthorizationError(403, 'Branch access is not configured for this admin');
    }
    if (requestedBranchId != null && requestedBranchId !== user.branch_id) {
        throw new AuthorizationError(403, 'You can only access your assigned branch');
    }
    return user.branch_id;
}
export function isAuthorizationError(error) {
    return error instanceof AuthorizationError;
}
//# sourceMappingURL=auth.authorization.js.map