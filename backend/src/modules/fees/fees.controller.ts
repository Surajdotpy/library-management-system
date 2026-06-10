import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import * as feesService from './fees.service.ts';
import { getPendingPayments } from '../payments/payments.service.ts';
import { pushPaymentAlert } from '../telegram/telegram-bot.service.ts';

function getBranchFilter(user: AuthRequest['user']): number | undefined {
  if (!user) return undefined;
  if (user.role === 'superadmin') return undefined;
  return user.branch_id ?? undefined;
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const branchId = getBranchFilter((req as AuthRequest).user);
    const data = await feesService.getDashboard(branchId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Fee dashboard error:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to load fee dashboard' });
  }
}

export async function getStudentStatuses(req: Request, res: Response): Promise<void> {
  try {
    const branchId = getBranchFilter((req as AuthRequest).user);
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await feesService.getStudentFeeStatuses(branchId, month, year);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Fee statuses error:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to load fee statuses' });
  }
}

export async function getOverdueStudents(req: Request, res: Response): Promise<void> {
  try {
    const branchId = getBranchFilter((req as AuthRequest).user);
    const pending = await getPendingPayments(branchId);
    const overdue = pending
      .filter((p) => p.due_status === 'overdue' || p.due_status === 'due_today')
      .map((p) => ({
        student_id: p.student_id,
        student_code: p.student_code,
        name: p.student_name,
        branch_name: p.branch_name,
        phone: p.student_phone,
        monthly_fee: p.monthly_fee,
        overdue_months: 1,
        total_due: p.amount,
        last_paid_date: p.paid_through_date,
        due_status: p.due_status,
        next_due_date: p.next_due_date,
      }));
    res.json({ success: true, data: overdue });
  } catch (error: any) {
    console.error('Overdue students error:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to load overdue students' });
  }
}

export async function generateDues(req: Request, res: Response): Promise<void> {
  try {
    const { month, year, branch_id } = req.body;
    if (!month || !year) {
      res.status(400).json({ success: false, error: 'month and year are required' });
      return;
    }
    const user = (req as AuthRequest).user;
    const branchId = branch_id ?? getBranchFilter(user);
    const data = await feesService.generateDues(month, year, branchId);
    res.json({
      success: true,
      data,
      message: `Generated ${data.generated} dues, ${data.skipped} skipped${data.errors.length > 0 ? `, ${data.errors.length} errors` : ''}`,
    });
  } catch (error: any) {
    console.error('Generate dues error:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to generate dues' });
  }
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { student_id, amount, fee_month, fee_year, payment_method, transaction_id, notes } = req.body;
    if (!student_id || !amount || !fee_month || !fee_year) {
      res.status(400).json({ success: false, error: 'student_id, amount, fee_month, and fee_year are required' });
      return;
    }

    const data = await feesService.recordManualPayment(
      student_id,
      amount,
      fee_month,
      fee_year,
      payment_method ?? 'upi',
      transaction_id ?? null,
      notes ?? null,
      user.userId,
    );

    res.status(201).json({ success: true, data, message: 'Payment recorded successfully' });

    pushPaymentAlert({
      id: data.id,
      student_name: data.student_name,
      amount: data.amount,
      branch_name: data.branch_name,
      payment_method: data.payment_method,
    });
  } catch (error: any) {
    console.error('Record payment error:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
}

export async function getStudentPayments(req: Request, res: Response): Promise<void> {
  try {
    const studentId = Number(req.params.studentId);
    if (Number.isNaN(studentId)) {
      res.status(400).json({ success: false, error: 'Invalid student ID' });
      return;
    }
    const data = await feesService.getStudentPayments(studentId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Student payments error:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to load student payments' });
  }
}

export async function getPaymentHistory(req: Request, res: Response): Promise<void> {
  try {
    const branchId = getBranchFilter((req as AuthRequest).user);
    const status = req.query.status as string | undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const data = await feesService.getPaymentHistory(branchId, status, month, year, limit, offset);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Payment history error:', error?.message ?? error);
    res.status(500).json({ success: false, error: 'Failed to load payment history' });
  }
}
