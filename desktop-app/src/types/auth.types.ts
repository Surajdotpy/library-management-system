/**
 * Authentication & User Types
 */

// User object (what we get from backend)
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'admin';
  branch_id: number | null;
  real_name: string;
  is_active: boolean;
  created_at: string;
}

// Login request (what we send to backend)
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response (what backend sends back)
export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

// Auth context state
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}