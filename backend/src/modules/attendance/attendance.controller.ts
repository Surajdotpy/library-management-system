import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
import * as attendanceService from './attendance.service.js';
import type { MarkEntryDTO, MarkExitDTO } from './attendance.types.js';

// POST /api/attendance/entry - Mark student entry
export async function markEntry(req: AuthRequest, res: Response) {
  try {
    const data: MarkEntryDTO = req.body;
    
    // Validate required fields
    if (!data.student_id) {
      return res.status(400).json({
        success: false,
        error: 'student_id is required'
      });
    }
    
    // Get admin user ID from auth middleware
    const markedBy = req.user?.userId;
    
    if (!markedBy) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Mark entry
    const attendance = await attendanceService.markEntry(data, markedBy);
    
    res.status(201).json({
      success: true,
      message: 'Entry marked successfully',
      data: attendance
    });
  } catch (error: any) {
    console.error('Mark entry error:', error);
    
    // Handle specific business logic errors
    if (error.message.includes('already')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to mark entry'
    });
  }
}

// POST /api/attendance/exit - Mark student exit
export async function markExit(req: AuthRequest, res: Response) {
  try {
    const data: MarkExitDTO = req.body;
    
    // Validate required fields
    if (!data.student_id) {
      return res.status(400).json({
        success: false,
        error: 'student_id is required'
      });
    }
    
    // Get admin user ID from auth middleware
    const markedBy = req.user?.userId;
    
    if (!markedBy) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Mark exit
    const attendance = await attendanceService.markExit(data, markedBy);
    
    res.status(200).json({
      success: true,
      message: 'Exit marked successfully',
      data: attendance
    });
  } catch (error: any) {
    console.error('Mark exit error:', error);
    
    // Handle specific business logic errors
    if (error.message.includes('No entry') || error.message.includes('already')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to mark exit'
    });
  }
}

// GET /api/attendance/today - Get today's attendance summary
export async function getTodayAttendance(req: AuthRequest, res: Response) {
  try {
    const summary = await attendanceService.getTodayAttendance();
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get today\'s attendance'
    });
  }
}

// GET /api/attendance/student/:studentId - Get student's attendance history
export async function getStudentAttendance(req: AuthRequest, res: Response) {
  try {
    const studentId = parseInt(req.params.studentId as string);
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }
    
    // Get query parameters
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
    
    const history = await attendanceService.getStudentAttendanceHistory(
      studentId,
      startDate,
      endDate,
      limit
    );
    
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student attendance'
    });
  }
}

// GET /api/attendance/student/:studentId/stats - Get student's attendance statistics
export async function getStudentStats(req: AuthRequest, res: Response) {
  try {
    const studentId = parseInt(req.params.studentId as string);
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }
    
    // Get optional month/year from query
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    
    const stats = await attendanceService.getStudentAttendanceStats(
      studentId,
      month,
      year
    );
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student statistics'
    });
  }
}
