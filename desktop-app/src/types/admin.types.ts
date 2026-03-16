export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'admin';
  branch_id: number;
  branch_name: string;
  is_active: boolean;
  real_name: string | null;
  personal_phone: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminRequest {
  name: string;
  email: string;
  password: string;
  branch_id: number;
  real_name?: string;
  personal_phone?: string;
  employee_id?: string;
  notes?: string;
}
