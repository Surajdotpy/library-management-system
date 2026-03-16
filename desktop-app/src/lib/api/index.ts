/**
 * Central export for all API modules
 * Import like: import { authApi, studentsApi } from '@/lib/api';
 */

export { default as apiClient } from './client';
export { authApi } from './auth';
export { studentsApi } from './students';
export { attendanceApi } from './attendance';
export { paymentsApi } from './payments';
export { dashboardApi } from './dashboard';
export { branchesApi } from './branches';
export { usersApi } from './users';
