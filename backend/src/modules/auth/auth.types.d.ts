import type { Request } from 'express';
export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    role: 'superadmin' | 'admin';
    branch_id: number | null;
    is_active: boolean;
    real_name: string;
    personal_phone?: string;
    employee_id?: string;
    date_of_joining?: Date;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    id_proof_type?: string;
    id_proof_number?: string;
    id_proof_url?: string;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    success: true;
    message: string;
    token: string;
    user: UserResponse;
}
export interface UserResponse {
    id: number;
    name: string;
    email: string;
    role: 'superadmin' | 'admin';
    branch_id: number | null;
    real_name: string;
    is_active: boolean;
}
export interface JWTPayload {
    userId: number;
    email: string;
    role: 'superadmin' | 'admin';
    branch_id: number | null;
}
export interface AuthRequest extends Request {
    user?: JWTPayload;
}
//# sourceMappingURL=auth.types.d.ts.map