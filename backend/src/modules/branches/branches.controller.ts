import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
import { requireAuthenticatedUser } from '../auth/auth.authorization.js';
import * as branchesService from './branches.service.js';

export async function getBranches(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const branches = await branchesService.getAccessibleBranches(user);

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get branches',
    });
  }
}
