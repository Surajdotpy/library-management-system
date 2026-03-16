import type { CreateSeatBookingDTO, ReleaseSeatBookingDTO, SeatBooking, SeatEligibleStudent, SeatQueryFilters, SeatSnapshot } from './seats.types.js';
export declare function getSeats(filters: SeatQueryFilters): Promise<SeatSnapshot[]>;
export declare function getEligibleStudents(bookingMonth: number, bookingYear: number, branchId?: number): Promise<SeatEligibleStudent[]>;
export declare function getSeatBookings(bookingMonth: number, bookingYear: number, branchId?: number, limit?: number): Promise<SeatBooking[]>;
export declare function createSeatBooking(data: CreateSeatBookingDTO, assignedBy: number, branchId?: number): Promise<SeatBooking>;
export declare function releaseSeatBooking(bookingId: number, data: ReleaseSeatBookingDTO, releasedBy: number, branchId?: number): Promise<SeatBooking | null>;
//# sourceMappingURL=seats.service.d.ts.map