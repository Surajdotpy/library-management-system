interface EnsureTestUserOptions {
    email: string;
    password?: string;
    role: 'superadmin' | 'admin';
    branchId?: number | null;
    name?: string;
    realName?: string;
}
export declare function ensureTestUser({ email, password, role, branchId, name, realName, }: EnsureTestUserOptions): Promise<void>;
export declare function ensureTestAdminPassword(email?: string, password?: string): Promise<void>;
export declare function syncTableIdSequence(tableName: 'students' | 'fee_payments' | 'seat_bookings'): Promise<void>;
export declare function deleteFeePayment(studentId: number, feeMonth: number, feeYear: number): Promise<void>;
export declare function deleteSeatBookings(studentId: number, bookingMonth: number, bookingYear: number): Promise<void>;
export declare function ensureTestSeat(branchId: number, seatNumber: string, section?: 'general' | 'ac' | 'non_ac' | 'silent_zone'): Promise<{
    id: number;
    seat_number: string;
}>;
export declare function findAvailableSeat(branchId: number, bookingMonth: number, bookingYear: number, excludedSeatIds?: number[]): Promise<{
    id: number;
    seat_number: string;
}>;
export {};
//# sourceMappingURL=test-db.d.ts.map