/**
 * Student Types
 */

// Student object (from database)
export interface Student {
  id: number;
  student_id: string;
  name: string;
  phone: string;
  email: string | null;
  branch_id: number;
  branch_name?: string;
  study_plan: '2_hours' | '4_hours' | 'unlimited';
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  id_proof_type: string | null;
  id_proof_number: string | null;
  notes: string | null;
  monthly_fee: number;
  seat_number: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Create student request (what we send to backend)
export interface CreateStudentRequest {
  name: string;
  phone: string;
  email?: string;
  branch_id: number;
  study_plan: '2_hours' | '4_hours' | 'unlimited';
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  id_proof_type?: string;
  id_proof_number?: string;
  notes?: string;
}

// Update student request
export interface UpdateStudentRequest {
  name?: string;
  phone?: string;
  email?: string;
  branch_id?: number;
  study_plan?: '2_hours' | '4_hours' | 'unlimited';
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
  id_proof_type?: string;
  id_proof_number?: string;
  notes?: string;
  seat_number?: number;
  is_active?: boolean;
}

// Student with additional info (for display)
export interface StudentWithDetails extends Student {
  total_payments: number;
  last_payment_date: string | null;
  pending_amount: number;
  last_attendance_date: string | null;
}

// Study plan option
export interface StudyPlanOption {
  value: '2_hours' | '4_hours' | 'unlimited';
  label: string;
  fee: number;
  description: string;
}

// Study plan options constant
export const STUDY_PLANS: StudyPlanOption[] = [
  {
    value: '2_hours',
    label: '2 Hours Plan',
    fee: 250,
    description: 'Study for 2 hours daily',
  },
  {
    value: '4_hours',
    label: '4 Hours Plan',
    fee: 350,
    description: 'Study for 4 hours daily',
  },
  {
    value: 'unlimited',
    label: 'Unlimited Plan',
    fee: 400,
    description: 'Study all day',
  },
];