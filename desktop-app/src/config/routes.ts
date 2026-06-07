/**
 * Application Routes
 * Central place for all route paths
 */

export const routes = {
  root: '/',

  // Auth routes
  login: '/login',
  
  // Main routes
  dashboard: '/dashboard',
  students: '/students',
  seats: '/seats',
  attendance: '/attendance',
  payments: '/payments',
  fees: '/fees',
  admins: '/admins',
  reports: '/reports',
  test: '/test',
  
  // Settings
  profile: '/profile',
  settings: '/settings',
  
  // Error pages
  notFound: '/404',
  unauthorized: '/unauthorized',
} as const;

// Route labels (for navigation menu)
export const routeLabels: Record<string, string> = {
  [routes.dashboard]: 'Dashboard',
  [routes.students]: 'Students',
  [routes.seats]: 'Seats',
  [routes.attendance]: 'Attendance',
  [routes.payments]: 'Payments',
  [routes.fees]: 'Fees',
  [routes.admins]: 'Admins',
  [routes.reports]: 'Reports',
  [routes.profile]: 'Profile',
  [routes.settings]: 'Settings',
};
