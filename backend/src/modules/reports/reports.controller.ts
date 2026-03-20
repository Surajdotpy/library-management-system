import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as reportsService from './reports.service';

export async function getOverview(req: AuthRequest, res: Response) {
  try {
    const overview = await reportsService.getOverviewStats();
    res.json({ success: true, data: overview });
  } catch (error: any) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
}

export async function getRevenueTrend(req: AuthRequest, res: Response) {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const trend = await reportsService.getRevenueTrend(months);
    res.json({ success: true, data: trend });
  } catch (error: any) {
    console.error('Get revenue trend error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue trend' });
  }
}

export async function getStudentGrowth(req: AuthRequest, res: Response) {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const growth = await reportsService.getStudentGrowth(months);
    res.json({ success: true, data: growth });
  } catch (error: any) {
    console.error('Get student growth error:', error);
    res.status(500).json({ error: 'Failed to fetch student growth' });
  }
}

export async function getBranchComparison(req: AuthRequest, res: Response) {
  try {
    const comparison = await reportsService.getBranchComparison();
    res.json({ success: true, data: comparison });
  } catch (error: any) {
    console.error('Get branch comparison error:', error);
    res.status(500).json({ error: 'Failed to fetch branch comparison' });
  }
}

export async function getAttendancePatterns(req: AuthRequest, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const patterns = await reportsService.getAttendancePatterns(days);
    res.json({ success: true, data: patterns });
  } catch (error: any) {
    console.error('Get attendance patterns error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance patterns' });
  }
}