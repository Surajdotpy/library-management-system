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
export declare function syncTableIdSequence(tableName: 'students' | 'fee_payments'): Promise<void>;
export declare function deleteFeePayment(studentId: number, feeMonth: number, feeYear: number): Promise<void>;
export {};
//# sourceMappingURL=test-db.d.ts.map