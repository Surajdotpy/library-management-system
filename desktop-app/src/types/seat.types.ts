import type { StudyPlan } from './student.types';

export type SeatSection = 'general' | 'ac' | 'non_ac' | 'silent_zone';
export type SeatLifecycleStatus = 'active' | 'maintenance' | 'inactive';
export type SeatAvailabilityStatus = 'available' | 'booked' | 'maintenance' | 'inactive';
export type SeatBookingStatus =
  | 'reserved'
  | 'active'
  | 'released'
  | 'expired'
  | 'cancelled';

export interface Seat {
  id: number;
  branch_id: number;
  seat_number: string;
  floor_name: string | null;
  section: SeatSection;
  seat_status: SeatLifecycleStatus;
  availability_status: SeatAvailabilityStatus;
  is_available: boolean;
  assigned_to_student_id: number | null;
  assigned_date: string | null;
  booking_id: number | null;
  booked_student_id: number | null;
  booked_student_name: string | null;
  booked_student_code: string | null;
  booking_status: SeatBookingStatus | null;
  booking_month: number | null;
  booking_year: number | null;
  start_date: string | null;
  end_date: string | null;
  booking_notes: string | null;
}

export interface SeatEligibleStudent {
  id: number;
  student_id: string;
  name: string;
  branch_id: number;
  branch_name: string;
  study_plan: StudyPlan;
  monthly_fee: number;
}

export interface SeatBooking {
  id: number;
  seat_id: number;
  seat_number: string;
  section: SeatSection;
  floor_name: string | null;
  student_id: number;
  student_name: string;
  student_code: string;
  branch_id: number;
  branch_name: string;
  booking_month: number;
  booking_year: number;
  status: SeatBookingStatus;
  start_date: string;
  end_date: string;
  assigned_by: number | null;
  assigned_by_name: string | null;
  released_by: number | null;
  released_by_name: string | null;
  assigned_at: string;
  released_at: string | null;
  release_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeatQueryOptions {
  month: number;
  year: number;
  branch_id?: number;
}

export interface SeatBookingsQueryOptions extends SeatQueryOptions {
  limit?: number;
}

export interface CreateSeatBookingRequest {
  seat_id: number;
  student_id: number;
  booking_month: number;
  booking_year: number;
  notes?: string;
}

export interface ReleaseSeatBookingRequest {
  release_reason?: string;
  status?: 'released' | 'cancelled' | 'expired';
}
