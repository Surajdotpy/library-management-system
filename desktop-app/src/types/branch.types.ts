export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  total_capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
