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
  TodayAttendanceStudent,
  TodayAttendanceSummary,
  AttendanceStats,
} from './attendance.types';

// Payment types
export type {
  Payment,
  RecordPaymentRequest,
  PaymentDueStatus,
  PaymentCommunicationType,
  PaymentCommunicationChannel,
  PaymentCommunicationRequestChannel,
  PaymentReminderStage,
  PaymentCommunicationStatus,
  PaymentCommunicationDeliveryMode,
  PendingPayment,
  MonthlyRevenue,
  BranchRevenue,
  PaymentReceipt,
  PaymentCommunication,
  PaymentQueryOptions,
  PaymentCommunicationQueryOptions,
  SendPaymentReminderRequest,
  SendPaymentReceiptRequest,
  PaymentReminderBatchResult,
} from './payment.types';

export type {
  DashboardBranchInfo,
  DashboardStats,
  DashboardRecentPayment,
  DashboardStudentInside,
  DashboardBranchOverview,
  DashboardPaymentAlerts,
  DashboardNotification,
  DashboardSummary,
} from './dashboard.types';

export type { Branch } from './branch.types';
export type { AdminUser, CreateAdminRequest } from './admin.types';
export type {
  Seat,
  SeatEligibleStudent,
  SeatBooking,
  SeatQueryOptions,
  SeatBookingsQueryOptions,
  CreateSeatBookingRequest,
  ReleaseSeatBookingRequest,
  SeatSection,
  SeatLifecycleStatus,
  SeatAvailabilityStatus,
  SeatBookingStatus,
} from './seat.types';

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
