import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import * as attendanceService from './attendance.service.ts';
import type { MarkEntryDTO, MarkExitDTO } from './attendance.types.ts';
import {
  isAuthorizationError,
  requireAuthenticatedUser,
  resolveAuthorizedBranchId,
} from '../auth/auth.authorization.ts';

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

// POST /api/attendance/entry - Mark student entry
export async function markEntry(req: AuthRequest, res: Response) {
  try {
    const data: MarkEntryDTO = req.body;

    if (!data.student_id) {
      return badRequest(res, 'student_id is required');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const attendance = await attendanceService.markEntry(
      data,
      user.userId,
      branchId,
    );

    res.status(201).json({
      success: true,
      message: 'Entry marked successfully',
      data: attendance,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Mark entry error:', error);

    if (
      error.message.includes('already') ||
      error.message.includes('not found')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark entry',
    });
  }
}

// POST /api/attendance/exit - Mark student exit
export async function markExit(req: AuthRequest, res: Response) {
  try {
    const data: MarkExitDTO = req.body;

    if (!data.student_id) {
      return badRequest(res, 'student_id is required');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const attendance = await attendanceService.markExit(
      data,
      user.userId,
      branchId,
    );

    res.status(200).json({
      success: true,
      message: 'Exit marked successfully',
      data: attendance,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Mark exit error:', error);

    if (
      error.message.includes('No entry') ||
      error.message.includes('already') ||
      error.message.includes('not found')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark exit',
    });
  }
}

// GET /api/attendance/today - Get today's attendance summary
export async function getTodayAttendance(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const summary = await attendanceService.getTodayAttendance(branchId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to get today's attendance",
    });
  }
}

// GET /api/attendance/student/:studentId - Get student's attendance history
export async function getStudentAttendance(req: AuthRequest, res: Response) {
  try {
    const studentId = Number.parseInt(req.params.studentId as string, 10);

    if (Number.isNaN(studentId)) {
      return badRequest(res, 'Invalid student ID');
    }

    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 30;
    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const history = await attendanceService.getStudentAttendanceHistory(
      studentId,
      startDate,
      endDate,
      limit,
      branchId,
    );

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get student attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student attendance',
    });
  }
}

// GET /api/attendance/student/:studentId/stats - Get student's attendance statistics
export async function getStudentStats(req: AuthRequest, res: Response) {
  try {
    const studentId = Number.parseInt(req.params.studentId as string, 10);

    if (Number.isNaN(studentId)) {
      return badRequest(res, 'Invalid student ID');
    }

    const month = req.query.month ? Number.parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? Number.parseInt(req.query.year as string, 10) : undefined;
    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const stats = await attendanceService.getStudentAttendanceStats(
      studentId,
      month,
      year,
      branchId,
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student statistics',
    });
  }
}
