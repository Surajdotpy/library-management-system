import type { JWTPayload } from './auth.types.ts';

export class AuthorizationError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function requireAuthenticatedUser(
  user: JWTPayload | undefined,
): JWTPayload {
  if (!user) {
    throw new AuthorizationError(401, 'Authentication required');
  }

  return user;
}

export function resolveAuthorizedBranchId(
  user: JWTPayload,
  requestedBranchId?: number,
): number | undefined {
  if (user.role === 'superadmin') {
    return requestedBranchId;
  }

  if (user.branch_id == null) {
    throw new AuthorizationError(
      403,
      'Branch access is not configured for this admin',
    );
  }

  if (requestedBranchId != null && requestedBranchId !== user.branch_id) {
    throw new AuthorizationError(
      403,
      'You can only access your assigned branch',
    );
  }

  return user.branch_id;
}

export function isAuthorizationError(
  error: unknown,
): error is AuthorizationError {
  return error instanceof AuthorizationError;
}
