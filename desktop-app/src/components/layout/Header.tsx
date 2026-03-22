import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  Clock3,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  Search,
  User,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBranchName } from '@/config/branches';
import { routeLabels, routes } from '@/config/routes';
import { clearStoredSession } from '@/lib/auth/session';
import { dashboardApi } from '@/lib/api/dashboard';
import type { DashboardNotification } from '@/types';

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: 'superadmin' | 'admin';
  branchId: number | null;
}

function notificationIcon(notification: DashboardNotification) {
  if (notification.severity === 'critical') {
    return <AlertTriangle className="h-4 w-4" />;
  }

  if (notification.type.startsWith('attendance')) {
    return <Clock3 className="h-4 w-4" />;
  }

  return <Info className="h-4 w-4" />;
}

function severityStyles(notification: DashboardNotification) {
  if (notification.severity === 'critical') {
    return 'bg-red-100 text-red-700';
  }

  if (notification.severity === 'warning') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-blue-100 text-blue-700';
}

export function Header({
  userName,
  userEmail,
  userRole,
  branchId,
}: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const roleLabel = userRole === 'superadmin' ? 'Super Admin' : 'Branch Admin';
  const accessLabel =
    userRole === 'superadmin' ? 'Access to all branches' : getBranchName(branchId);
  const pageTitle =
    routeLabels[location.pathname] ||
    (userRole === 'superadmin' ? 'Super Admin Dashboard' : 'Branch Dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      setNotificationsLoading(true);
      setNotificationsError(null);

      try {
        const summary = await dashboardApi.getSummary(
          userRole === 'superadmin' ? undefined : branchId ?? undefined,
        );

        if (!isMounted) {
          return;
        }

        setNotifications(summary.notifications ?? []);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }

        setNotifications([]);
        setNotificationsError(
          error.response?.data?.error || error.message || 'Failed to load notifications',
        );
      } finally {
        if (isMounted) {
          setNotificationsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [branchId, userRole, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setIsNotificationsOpen(false);
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsNotificationsOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    clearStoredSession();
    navigate(routes.login, { replace: true });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsProfileMenuOpen(false);
  };

  const handleNotificationNavigate = (path: string) => {
    navigate(path);
    setIsNotificationsOpen(false);
  };

  const unreadCount = notifications.length;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{pageTitle}</h2>
        <p className="text-sm text-gray-600">
          Welcome back, <span className="font-semibold text-purple-600">{userName}</span>!
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {roleLabel} | {accessLabel}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Quick search coming soon"
            readOnly
            className="w-64 cursor-default rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((currentValue) => !currentValue);
              setIsProfileMenuOpen(false);
            }}
            className="relative rounded-xl p-2 transition-colors hover:bg-gray-100"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {!notificationsLoading && unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 z-50 mt-3 w-96 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    <p className="text-xs text-gray-500">
                      Live renewal and attendance alerts for your access scope
                    </p>
                  </div>
                  {!notificationsLoading && unreadCount > 0 && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                      {unreadCount} active
                    </span>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    Loading notifications...
                  </div>
                ) : notificationsError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {notificationsError}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                    No urgent renewals or attendance warnings right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationNavigate(notification.action_route)}
                        className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-3 text-left transition-colors hover:border-gray-200 hover:bg-white"
                      >
                        <div className="mb-2 flex items-start gap-3">
                          <div className={`rounded-xl p-2 ${severityStyles(notification)}`}>
                            {notificationIcon(notification)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.title}
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityStyles(notification)}`}
                              >
                                {notification.severity}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {notification.description}
                            </p>
                            {userRole === 'superadmin' && notification.branch_name && (
                              <p className="mt-2 text-xs font-medium text-gray-500">
                                {notification.branch_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={profileMenuRef} className="relative border-l border-gray-200 pl-4">
          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen((currentValue) => !currentValue);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-3 rounded-2xl px-2 py-1 transition-colors hover:bg-gray-50"
            aria-label="Open profile menu"
          >
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{userName}</p>
              <p className="text-xs text-gray-500">{roleLabel}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
              <User className="h-5 w-5 text-white" />
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
              >
                <div className="border-b border-gray-100 pb-4">
                  <p className="text-base font-semibold text-gray-900">{userName}</p>
                  <p className="mt-1 text-sm text-gray-600">{userEmail}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-purple-600">
                    {roleLabel}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{accessLabel}</p>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.dashboard)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    <LayoutDashboard className="h-4 w-4 text-purple-600" />
                    Dashboard
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.students)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Users className="h-4 w-4 text-purple-600" />
                    Students
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
