import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
import * as paymentService from './payments.service.js';
import type { RecordPaymentDTO } from './payments.types.js';

// POST /api/payments - Record a new payment
export async function recordPayment(req: AuthRequest, res: Response) {
  try {
    const data: RecordPaymentDTO = req.body;
    
    // Validate required fields
    if (!data.student_id || !data.amount || !data.fee_month || !data.fee_year) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: student_id, amount, fee_month, fee_year'
      });
    }
    
    // Validate month (1-12)
    if (data.fee_month < 1 || data.fee_month > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fee_month. Must be between 1 and 12'
      });
    }
    
    // Validate year
    const currentYear = new Date().getFullYear();
    if (data.fee_year < 2020 || data.fee_year > currentYear + 1) {
      return res.status(400).json({
        success: false,
        error: `Invalid fee_year. Must be between 2020 and ${currentYear + 1}`
      });
    }
    
    // Get admin user ID from auth middleware
    const collectedBy = req.user?.userId;
    
    if (!collectedBy) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Record payment
    const payment = await paymentService.recordPayment(data, collectedBy);
    
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error: any) {
    console.error('Record payment error:', error);
    
    // Handle specific business logic errors
    if (error.message.includes('already recorded') || 
        error.message.includes('not found') ||
        error.message.includes('Amount mismatch')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to record payment'
    });
  }
}

// GET /api/payments/student/:studentId - Get student's payment history
export async function getStudentPayments(req: AuthRequest, res: Response) {
  try {
    const studentId = parseInt(req.params.studentId as string);
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
    
    const history = await paymentService.getStudentPaymentHistory(studentId, limit);
    
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Get student payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history'
    });
  }
}

// GET /api/payments - Get all payments (with filters)
export async function getAllPayments(req: AuthRequest, res: Response) {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const branchId = req.query.branch_id ? parseInt(req.query.branch_id as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const payments = await paymentService.getAllPayments(month, year, branchId, limit);
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payments'
    });
  }
}

// GET /api/payments/pending - Get pending payments
export async function getPendingPayments(req: AuthRequest, res: Response) {
  try {
    const branchId = req.query.branch_id ? parseInt(req.query.branch_id as string) : undefined;
    
    const pending = await paymentService.getPendingPayments(branchId);
    
    res.status(200).json({
      success: true,
      count: pending.length,
      data: pending
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending payments'
    });
  }
}

// GET /api/payments/revenue/:month/:year - Get monthly revenue report
export async function getMonthlyRevenue(req: AuthRequest, res: Response) {
  try {
    const month = parseInt(req.params.month as string);
    const year = parseInt(req.params.year as string);
    
    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month or year'
      });
    }
    
    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: 'Month must be between 1 and 12'
      });
    }
    
    const revenue = await paymentService.getMonthlyRevenue(month, year);
    
    res.status(200).json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Get monthly revenue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue report'
    });
  }
}

// GET /api/payments/receipt/:receiptNumber - Get payment by receipt number
export async function getPaymentByReceipt(req: AuthRequest, res: Response) {
  try {
    const receiptNumber = req.params.receiptNumber as string;
    
    if (!receiptNumber) {
      return res.status(400).json({
        success: false,
        error: 'Receipt number is required'
      });
    }
    
    const payment = await paymentService.getPaymentByReceiptNumber(receiptNumber);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment by receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment'
    });
  }
}