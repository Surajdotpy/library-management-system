/**
 * Application Routes
 * Central place for all route paths
 */

export const routes = {
  // Auth routes
  login: '/login',
  
  // Main routes
  dashboard: '/dashboard',
  students: '/students',
  attendance: '/attendance',
  payments: '/payments',
  reports: '/reports',
  
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
  [routes.attendance]: 'Attendance',
  [routes.payments]: 'Payments',
  [routes.reports]: 'Reports',
  [routes.profile]: 'Profile',
  [routes.settings]: 'Settings',
};
