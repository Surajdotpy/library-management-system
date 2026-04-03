import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import {
  isAuthorizationError,
  requireAuthenticatedUser,
  resolveAuthorizedBranchId,
} from '../auth/auth.authorization.ts';
import * as dashboardService from './dashboard.service.ts';

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

export async function getSummary(req: AuthRequest, res: Response) {
  try {
    const requestedBranchId = req.query.branch_id
      ? Number.parseInt(req.query.branch_id as string, 10)
      : undefined;

    // Only validate if branch_id was actually provided in query
    if (requestedBranchId !== undefined && Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const summary = await dashboardService.getDashboardSummary(branchId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get dashboard summary error:', error);

    if (error.message === 'Branch not found') {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard summary',
    });
  }
}
