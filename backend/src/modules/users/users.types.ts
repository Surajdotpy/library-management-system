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
  created_at: Date;
  updated_at: Date;
}

export interface CreateAdminDTO {
  name: string;
  email: string;
  password: string;
  branch_id: number;
  real_name?: string | null;
  personal_phone?: string | null;
  employee_id?: string | null;
  notes?: string | null;
}
