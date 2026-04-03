import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  LayoutDashboard,
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
import { NotificationBell } from './NotificationBell';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: 'superadmin' | 'admin';
  branchId: number | null;
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
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationsContainerRef.current &&
        !notificationsContainerRef.current.contains(target)
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

  // Close dropdowns on navigation
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

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4"
    >
      {/* Left: Page title + user info */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{pageTitle}</h2>
        <p className="text-sm text-gray-600">
          Welcome back,{' '}
          <span className="font-semibold text-purple-600">{userName}</span>!
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {roleLabel} | {accessLabel}
        </p>
      </div>

      {/* Right: Search, Bell, Profile */}
      <div className="flex items-center gap-4">
        {/* Quick search placeholder */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Quick search coming soon"
            readOnly
            className="w-64 cursor-default rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Notification area: bell button + dropdown panel (separate components) */}
        <div ref={notificationsContainerRef} className="relative flex items-start">
          {/* Bell button — uses useNotifications internally */}
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileMenuOpen(false);
            }}
            className="relative rounded-xl p-2 transition-colors hover:bg-gray-100"
            aria-label="Open notifications"
          >
            <NotificationBell isOpen={isNotificationsOpen} />
          </button>

          {/* Dropdown panel — uses useNotifications internally (separate hook instance) */}
          <AnimatePresence>
            {isNotificationsOpen && (
              <NotificationDropdown
                onClose={() => setIsNotificationsOpen(false)}
                showBranchName={userRole === 'superadmin'}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Profile menu */}
        <div ref={profileMenuRef} className="relative border-l border-gray-200 pl-4">
          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen((prev) => !prev);
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
