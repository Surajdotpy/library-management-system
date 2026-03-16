export interface Student {
    id: number;
    student_id: string;
    name: string;
    email?: string;
    phone: string;
    date_of_birth: Date;
    gender: 'male' | 'female' | 'other';
    blood_group?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relation: string;
    photo_url?: string;
    id_proof_type?: string;
    id_proof_number?: string;
    id_proof_url?: string;
    branch_id: number;
    assigned_seat_id?: number;
    study_plan: '2_hours' | '4_hours' | 'unlimited';
    daily_hours_limit?: number;
    registration_date: Date;
    membership_status: 'active' | 'inactive' | 'suspended' | 'expired';
    monthly_fee: number;
    is_active: boolean;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface CreateStudentDTO {
    name: string;
    email?: string | null;
    phone: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
    blood_group?: string | null;
    address: string;
    city: string;
    state: string;
    pincode: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relation: string;
    photo_url?: string;
    id_proof_type?: string | null;
    id_proof_number?: string | null;
    id_proof_url?: string;
    branch_id: number;
    study_plan: '2_hours' | '4_hours' | 'unlimited';
    notes?: string | null;
}
export interface UpdateStudentDTO {
    name?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'other';
    blood_group?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    photo_url?: string;
    id_proof_type?: string;
    id_proof_number?: string;
    id_proof_url?: string;
    study_plan?: '2_hours' | '4_hours' | 'unlimited';
    membership_status?: 'active' | 'inactive' | 'suspended' | 'expired';
    notes?: string;
}
//# sourceMappingURL=students.types.d.ts.map