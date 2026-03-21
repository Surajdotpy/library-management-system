import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import { requireAuthenticatedUser } from '../auth/auth.authorization.ts';
import * as usersService from './users.service.ts';
import type { CreateAdminDTO } from './users.types.ts';

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

export async function getAdmins(req: AuthRequest, res: Response) {
  try {
    requireAuthenticatedUser(req.user);

    const branchId = req.query.branch_id
      ? Number.parseInt(req.query.branch_id as string, 10)
      : undefined;

    if (Number.isNaN(branchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    const admins = await usersService.listAdmins(branchId);

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admins',
    });
  }
}

export async function createAdmin(req: AuthRequest, res: Response) {
  try {
    requireAuthenticatedUser(req.user);

    const {
      name,
      email,
      password,
      branch_id,
      real_name,
      personal_phone,
      employee_id,
      notes,
    }: CreateAdminDTO = req.body;

    if (!name?.trim()) {
      return badRequest(res, 'Name is required');
    }

    if (!email?.trim()) {
      return badRequest(res, 'Email is required');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return badRequest(res, 'A valid email is required');
    }

    if (!password || password.length < 6) {
      return badRequest(res, 'Password must be at least 6 characters');
    }

    if (!branch_id || Number.isNaN(Number(branch_id))) {
      return badRequest(res, 'Branch is required');
    }

    if (personal_phone && !/^\d{10}$/.test(personal_phone.trim())) {
      return badRequest(res, 'Personal phone must be 10 digits');
    }

    const admin = await usersService.createAdmin({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      branch_id: Number(branch_id),
      real_name: real_name?.trim() || null,
      personal_phone: personal_phone?.trim() || null,
      employee_id: employee_id?.trim() || null,
      notes: notes?.trim() || null,
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: admin,
    });
  } catch (error: any) {
    console.error('Create admin error:', error);

    if (
      error.message === 'Branch not found' ||
      error.message === 'Email already exists'
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create admin',
    });
  }
}
