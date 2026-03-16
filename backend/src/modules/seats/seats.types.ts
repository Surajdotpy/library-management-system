export type SeatSection = 'general' | 'ac' | 'non_ac' | 'silent_zone';
export type SeatLifecycleStatus = 'active' | 'maintenance' | 'inactive';
export type SeatAvailabilityStatus = 'available' | 'booked' | 'maintenance' | 'inactive';
export type SeatBookingStatus =
  | 'reserved'
  | 'active'
  | 'released'
  | 'expired'
  | 'cancelled';

export interface SeatSnapshot {
  id: number;
  branch_id: number;
  seat_number: string;
  floor_name: string | null;
  section: SeatSection;
  seat_status: SeatLifecycleStatus;
  availability_status: SeatAvailabilityStatus;
  is_available: boolean;
  assigned_to_student_id: number | null;
  assigned_date: Date | null;
  booking_id: number | null;
  booked_student_id: number | null;
  booked_student_name: string | null;
  booked_student_code: string | null;
  booking_status: SeatBookingStatus | null;
  booking_month: number | null;
  booking_year: number | null;
  start_date: Date | null;
  end_date: Date | null;
  booking_notes: string | null;
}

export interface SeatEligibleStudent {
  id: number;
  student_id: string;
  name: string;
  branch_id: number;
  branch_name: string;
  study_plan: '2_hours' | '4_hours' | 'unlimited';
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
  start_date: Date;
  end_date: Date;
  assigned_by: number | null;
  assigned_by_name: string | null;
  released_by: number | null;
  released_by_name: string | null;
  assigned_at: Date;
  released_at: Date | null;
  release_reason: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSeatBookingDTO {
  seat_id: number;
  student_id: number;
  booking_month: number;
  booking_year: number;
  notes?: string | null;
}

export interface ReleaseSeatBookingDTO {
  release_reason?: string | null;
  status?: 'released' | 'cancelled' | 'expired';
}

export interface SeatQueryFilters {
  booking_month: number;
  booking_year: number;
  branch_id?: number;
  section?: SeatSection;
  availability?: SeatAvailabilityStatus;
  search?: string;
}
