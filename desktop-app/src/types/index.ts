/**
 * Central export for all types
 * Import types like: import { User, Student } from '@/types';
 */

// Auth types
export type {
  User,
  LoginRequest,
  LoginResponse,
  AuthContextType,
} from './auth.type';

// Student types
export type {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  StudentWithDetails,
  StudyPlanOption,
} from './student.types';

export { STUDY_PLANS } from './student.types';

// Attendance types
export type {
  Attendance,
  MarkEntryRequest,
  MarkExitRequest,
  TodayAttendance,
  AttendanceStats,
  AttendanceSummary,
} from './attendance.types';

// Payment types
export type {
  Payment,
  RecordPaymentRequest,
  PendingPayment,
  MonthlyRevenue,
  BranchRevenue,
  PaymentReceipt,
} from './payment.types';

// Common types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}