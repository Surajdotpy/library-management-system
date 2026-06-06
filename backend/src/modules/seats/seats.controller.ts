import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import {
  isAuthorizationError,
  requireAuthenticatedUser,
  resolveAuthorizedBranchId,
} from '../auth/auth.authorization.ts';
import * as seatsService from './seats.service.ts';
import type {
  AssignSeatDTO,
  BulkCreateSeatsDTO,
  CreateSeatBookingDTO,
  ReleaseSeatBookingDTO,
  SeatAvailabilityStatus,
  SeatQueryFilters,
  SeatSection,
  UpdateSeatDTO,
} from './seats.types.ts';

const VALID_SECTIONS = new Set<SeatSection>([
  'general',
  'ac',
  'non_ac',
  'silent_zone',
]);
const VALID_AVAILABILITY = new Set<SeatAvailabilityStatus>([
  'available',
  'booked',
  'maintenance',
  'inactive',
]);
const VALID_RELEASE_STATUSES = new Set(['released', 'cancelled', 'expired']);

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

function parseBranchId(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? Number.NaN : parsedValue;
}

function parsePositiveInteger(
  value: unknown,
  fallback?: number,
): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return Number.NaN;
  }

  return parsedValue;
}

function resolveBookingPeriod(req: AuthRequest): { month: number; year: number } | null {
  const currentDate = new Date();
  const month = parsePositiveInteger(
    typeof req.query.month === 'string' ? req.query.month : undefined,
    currentDate.getMonth() + 1,
  );
  const year = parsePositiveInteger(
    typeof req.query.year === 'string' ? req.query.year : undefined,
    currentDate.getFullYear(),
  );

  if (
    month == null ||
    year == null ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { month, year };
}

function resolveOptionalBookingPeriod(req: AuthRequest): { month: number; year: number } | null {
  const hasMonth = typeof req.query.month === 'string' && req.query.month.trim() !== '';
  const hasYear = typeof req.query.year === 'string' && req.query.year.trim() !== '';

  if (!hasMonth && !hasYear) return null;

  return resolveBookingPeriod(req);
}

export async function getSeats(req: AuthRequest, res: Response) {
  try {
    const period = resolveOptionalBookingPeriod(req);
    const requestedBranchId = parseBranchId(req.query.branch_id);

    if (Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    const section = typeof req.query.section === 'string' ? req.query.section : undefined;

    if (section && !VALID_SECTIONS.has(section as SeatSection)) {
      return badRequest(res, 'Invalid section filter');
    }

    const availability =
      typeof req.query.availability === 'string' ? req.query.availability : undefined;

    if (
      availability &&
      !VALID_AVAILABILITY.has(availability as SeatAvailabilityStatus)
    ) {
      return badRequest(res, 'Invalid availability filter');
    }

    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const filters: SeatQueryFilters = {
      ...(period ? { booking_month: period.month, booking_year: period.year } : {}),
      ...(branchId != null ? { branch_id: branchId } : {}),
      ...(section ? { section: section as SeatSection } : {}),
      ...(availability
        ? { availability: availability as SeatAvailabilityStatus }
        : {}),
      ...(search?.trim() ? { search } : {}),
    };
    const seats = await seatsService.getSeats(filters);

    res.status(200).json({
      success: true,
      count: seats.length,
      data: seats,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get seats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get seats',
    });
  }
}

export async function getEligibleStudents(req: AuthRequest, res: Response) {
  try {
    const period = resolveBookingPeriod(req);

    if (!period) {
      return badRequest(res, 'A valid month and year are required');
    }

    const requestedBranchId = parseBranchId(req.query.branch_id);

    if (Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const students = await seatsService.getEligibleStudents(
      period.month,
      period.year,
      branchId,
    );

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get eligible students error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get eligible students',
    });
  }
}

export async function getSeatBookings(req: AuthRequest, res: Response) {
  try {
    const period = resolveBookingPeriod(req);

    if (!period) {
      return badRequest(res, 'A valid month and year are required');
    }

    const requestedBranchId = parseBranchId(req.query.branch_id);
    const limit = parsePositiveInteger(
      typeof req.query.limit === 'string' ? req.query.limit : undefined,
      50,
    );

    if (Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    if (limit == null || Number.isNaN(limit)) {
      return badRequest(res, 'Invalid limit');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const bookings = await seatsService.getSeatBookings(
      period.month,
      period.year,
      branchId,
      Math.min(limit, 200),
    );

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Get seat bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get seat bookings',
    });
  }
}

export async function createSeatBooking(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const { seat_id, student_id, booking_month, booking_year, notes } =
      req.body as Partial<CreateSeatBookingDTO>;

    if (!seat_id || !student_id || !booking_month || !booking_year) {
      return badRequest(
        res,
        'Missing required fields: seat_id, student_id, booking_month, booking_year',
      );
    }

    if (!Number.isInteger(seat_id) || seat_id <= 0) {
      return badRequest(res, 'Seat ID must be a valid number');
    }

    if (!Number.isInteger(student_id) || student_id <= 0) {
      return badRequest(res, 'Student ID must be a valid number');
    }

    if (!Number.isInteger(booking_month) || booking_month < 1 || booking_month > 12) {
      return badRequest(res, 'Booking month must be between 1 and 12');
    }

    if (!Number.isInteger(booking_year) || booking_year < 2020 || booking_year > 2100) {
      return badRequest(res, 'Booking year is invalid');
    }

    const branchId = resolveAuthorizedBranchId(user);
    const booking = await seatsService.createSeatBooking(
      {
        seat_id,
        student_id,
        booking_month,
        booking_year,
        notes: notes?.trim() || null,
      },
      user.userId,
      branchId,
    );

    res.status(201).json({
      success: true,
      message: 'Seat booking created successfully',
      data: booking,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Create seat booking error:', error);

    if (
      error.message.includes('selected month') ||
      error.message.includes('already booked') ||
      error.message.includes('already has') ||
      error.message.includes('Seat not found') ||
      error.message.includes('Student not found') ||
      error.message.includes('Only active') ||
      error.message.includes('same branch')
    ) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create seat booking',
    });
  }
}

export async function releaseSeatBooking(req: AuthRequest, res: Response) {
  try {
    const bookingId = Number.parseInt(req.params.bookingId as string, 10);

    if (Number.isNaN(bookingId)) {
      return badRequest(res, 'Invalid booking ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const { release_reason, status } = req.body as Partial<ReleaseSeatBookingDTO>;

    if (status && !VALID_RELEASE_STATUSES.has(status)) {
      return badRequest(res, 'Invalid release status');
    }

    const branchId = resolveAuthorizedBranchId(user);
    const releaseData = {
      release_reason: release_reason?.trim() || null,
      ...(status ? { status } : {}),
    };
    const booking = await seatsService.releaseSeatBooking(
      bookingId,
      releaseData,
      user.userId,
      branchId,
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Seat booking not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Seat booking released successfully',
      data: booking,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Release seat booking error:', error);

    if (error.message.includes('already closed')) {
      return badRequest(res, error.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to release seat booking',
    });
  }
}

export async function bulkCreate(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const { branch_id, start_number, count, floor_name } = req.body as Partial<BulkCreateSeatsDTO>;

    if (!branch_id || !Number.isInteger(branch_id) || branch_id <= 0) {
      return badRequest(res, 'A valid branch_id is required');
    }

    const startNum = start_number ?? 0;
    const seatCount = count ?? 0;

    if (!Number.isInteger(startNum) || startNum < 1) {
      return badRequest(res, 'start_number must be a positive integer');
    }

    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 1000) {
      return badRequest(res, 'count must be between 1 and 1000');
    }

    const result = await seatsService.bulkCreateSeats({
      branch_id,
      start_number: startNum,
      count: seatCount,
      ...(floor_name?.trim() ? { floor_name: floor_name.trim() } : {}),
    });

    res.status(201).json({
      success: true,
      message: `${result.created} seats created`,
      data: result,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Bulk create seats error:', error);
    res.status(500).json({ success: false, error: 'Failed to create seats' });
  }
}

export async function updateSeat(req: AuthRequest, res: Response) {
  try {
    const seatId = Number.parseInt(req.params.seatId as string, 10);
    if (Number.isNaN(seatId)) return badRequest(res, 'Invalid seat ID');

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const data = req.body as Partial<UpdateSeatDTO>;

    const seat = await seatsService.updateSeat(seatId, data, branchId);
    if (!seat) return badRequest(res, 'Seat not found');

    res.status(200).json({ success: true, data: seat });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Update seat error:', error);
    res.status(500).json({ success: false, error: 'Failed to update seat' });
  }
}

export async function assignSeat(req: AuthRequest, res: Response) {
  try {
    const seatId = Number.parseInt(req.params.seatId as string, 10);
    if (Number.isNaN(seatId)) return badRequest(res, 'Invalid seat ID');

    const user = requireAuthenticatedUser(req.user);
    const { student_id } = req.body as Partial<AssignSeatDTO>;

    if (!student_id || !Number.isInteger(student_id) || student_id <= 0) {
      return badRequest(res, 'A valid student_id is required');
    }

    const branchId = resolveAuthorizedBranchId(user);
    const seat = await seatsService.assignSeat(seatId, student_id, user.userId, branchId);

    res.status(200).json({
      success: true,
      message: 'Seat assigned successfully',
      data: seat,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    if (
      error.message.includes('not found') ||
      error.message.includes('Only active') ||
      error.message.includes('same branch') ||
      error.message.includes('already assigned')
    ) {
      return badRequest(res, error.message);
    }
    console.error('Assign seat error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign seat' });
  }
}

export async function unassignSeat(req: AuthRequest, res: Response) {
  try {
    const seatId = Number.parseInt(req.params.seatId as string, 10);
    if (Number.isNaN(seatId)) return badRequest(res, 'Invalid seat ID');

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const seat = await seatsService.unassignSeat(seatId, branchId);

    res.status(200).json({
      success: true,
      message: 'Seat unassigned successfully',
      data: seat,
    });
  } catch (error: any) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return badRequest(res, error.message);
    }
    console.error('Unassign seat error:', error);
    res.status(500).json({ success: false, error: 'Failed to unassign seat' });
  }
}
