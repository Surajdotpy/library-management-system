import { useEffect, useRef, useState } from 'react';
import {
  Armchair,
  BarChart3,
  CheckSquare,
  ChevronDown,
  Download,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCcw,
  Search,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBranchName } from '@/config/branches';
import { routeLabels, routes } from '@/config/routes';
import { authApi, paymentsApi, studentsApi } from '@/lib/api';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { Payment, Student } from '@/types';
import { NotificationBell } from './NotificationBell';
import { NotificationDropdown } from './NotificationDropdown';

type UserRole = 'superadmin' | 'admin';

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  branchId: number | null;
}

interface SearchablePage {
  label: string;
  path: string;
  description: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const SEARCHABLE_PAGES: SearchablePage[] = [
  {
    label: 'Dashboard',
    path: routes.dashboard,
    description: 'Overview, occupancy, and latest activity',
    icon: LayoutDashboard,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Students',
    path: routes.students,
    description: 'Profiles, registration details, and status',
    icon: Users,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Seats',
    path: routes.seats,
    description: 'Seat allocation and availability',
    icon: Armchair,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Attendance',
    path: routes.attendance,
    description: 'Entry, exit, and live presence',
    icon: CheckSquare,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Payments',
    path: routes.payments,
    description: 'Receipts, renewals, and history',
    icon: BarChart3,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Reports',
    path: routes.reports,
    description: 'Cross-branch analytics and exports',
    icon: BarChart3,
    roles: ['superadmin'],
  },
  {
    label: 'Admins',
    path: routes.admins,
    description: 'Manage admin accounts and access',
    icon: UserPlus,
    roles: ['superadmin'],
  },
];

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentStatusLabel(status: Payment['status']): string {
  if (status === 'pending') {
    return 'Pending Verification';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
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
  const { unreadCount, markAllAsRead } = useNotifications();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStudents, setSearchStudents] = useState<Student[]>([]);
  const [searchPayments, setSearchPayments] = useState<Payment[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchPages = SEARCHABLE_PAGES
    .filter((page) => page.roles.includes(userRole))
    .filter((page) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      return `${page.label} ${page.description}`
        .toLowerCase()
        .includes(normalizedSearchQuery);
    })
    .slice(0, normalizedSearchQuery ? 4 : 5);

  const hasEntityResults = searchStudents.length > 0 || searchPayments.length > 0;
  const shouldShowEmptyState =
    normalizedSearchQuery.length >= 2 &&
    !searchLoading &&
    !searchError &&
    searchPages.length === 0 &&
    !hasEntityResults;

  const resetSearch = () => {
    setSearchQuery('');
    setSearchStudents([]);
    setSearchPayments([]);
    setSearchError(null);
    setSearchLoading(false);
    setIsSearchOpen(false);
  };

  const focusSearchInput = () => {
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  };

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

      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
        focusSearchInput();
        return;
      }

      if (event.key === '/' && !isTypingElement(event.target)) {
        event.preventDefault();
        setIsSearchOpen(true);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
        focusSearchInput();
        return;
      }

      if (event.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    if (normalizedSearchQuery.length < 2) {
      setSearchStudents([]);
      setSearchPayments([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const [students, paymentPage] = await Promise.all([
          studentsApi.search(normalizedSearchQuery, { includeInactive: true, limit: 6 }),
          paymentsApi.getAll({
            search: normalizedSearchQuery,
            page: 1,
            limit: 6,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setSearchStudents(students);
        setSearchPayments(paymentPage.data);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }

        console.error('Quick search failed.', error);
        setSearchStudents([]);
        setSearchPayments([]);
        setSearchError(error.response?.data?.error || 'Search is temporarily unavailable');
      } finally {
        if (isMounted) {
          setSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isSearchOpen, normalizedSearchQuery]);

  // Close dropdowns on navigation
  useEffect(() => {
    setIsNotificationsOpen(false);
    setIsProfileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    void authApi.logout().finally(() => {
      navigate(routes.login, { replace: true });
    });
  };

  const [updateState, setUpdateState] = useState<{
    status: string;
    currentVersion: string;
    targetVersion: string | null;
    progress: number | null;
    error: string | null;
  }>({ status: 'idle', currentVersion: '', targetVersion: null, progress: null, error: null });

  useEffect(() => {
    const win = window as any;
    if (!win.appUpdates) return;

    win.appUpdates.getState().then((state: any) => {
      setUpdateState((prev) => ({ ...prev, ...state }));
    }).catch(() => {});

    const unsub = win.appUpdates.subscribe((state: any) => {
      setUpdateState((prev) => ({ ...prev, ...state }));
    });
    return () => unsub?.();
  }, []);

  const handleCheckUpdate = () => {
    const win = window as any;
    if (win.appUpdates) win.appUpdates.check();
  };

  const handleDownloadUpdate = () => {
    const win = window as any;
    if (win.appUpdates) win.appUpdates.download();
  };

  const handleStudentResultClick = (student: Student) => {
    navigate(routes.students, {
      state: {
        openStudentId: student.id,
        quickSearchQuery: student.name,
      },
    });
    resetSearch();
  };

  const handlePaymentResultClick = (payment: Payment) => {
    const paymentDate = new Date(payment.payment_date);

    navigate(routes.payments, {
      state: {
        historySearchQuery: payment.receipt_number,
        historyMonthFilter: paymentDate.getMonth() + 1,
        historyYearFilter: paymentDate.getFullYear(),
      },
    });
    resetSearch();
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4"
    >
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

      <div className="flex items-center gap-4">
        <div ref={searchContainerRef} className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search students, receipts, pages..."
            value={searchQuery}
            onFocus={() => {
              setIsSearchOpen(true);
              setIsNotificationsOpen(false);
              setIsProfileMenuOpen(false);
            }}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            className="w-80 rounded-xl border border-gray-200 py-2 pl-10 pr-16 text-gray-700 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400">
            Ctrl+K
          </span>

          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 z-50 mt-3 w-[30rem] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
              >
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">Quick Search</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Find pages, students, receipts, phone numbers, and transaction records.
                  </p>
                </div>

                <div className="max-h-[28rem] overflow-y-auto p-3">
                  {normalizedSearchQuery.length < 2 && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      Type at least 2 letters to search students and payments. Page shortcuts are
                      ready below.
                    </div>
                  )}

                  <div className="mt-3">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Pages
                    </p>
                    <div className="mt-2 space-y-1">
                      {searchPages.length === 0 ? (
                        <div className="rounded-xl px-3 py-2 text-sm text-gray-500">
                          No page matched this search.
                        </div>
                      ) : (
                        searchPages.map((page) => (
                          <button
                            key={page.path}
                            type="button"
                            onClick={() => handleNavigate(page.path)}
                            className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                              <page.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{page.label}</p>
                              <p className="text-xs text-gray-500">{page.description}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {normalizedSearchQuery.length >= 2 && (
                    <>
                      <div className="mt-4">
                        <div className="flex items-center justify-between px-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Students
                          </p>
                          {searchLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          {searchStudents.length === 0 && !searchLoading ? (
                            <div className="rounded-xl px-3 py-2 text-sm text-gray-500">
                              No students matched this search.
                            </div>
                          ) : (
                            searchStudents.map((student) => (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => handleStudentResultClick(student)}
                                className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {student.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {student.student_id} | {student.phone}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {getBranchName(student.branch_id)}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                    student.is_active
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {student.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Payments
                        </p>
                        <div className="mt-2 space-y-1">
                          {searchPayments.length === 0 && !searchLoading ? (
                            <div className="rounded-xl px-3 py-2 text-sm text-gray-500">
                              No payments matched this search.
                            </div>
                          ) : (
                            searchPayments.map((payment) => (
                              <button
                                key={payment.id}
                                type="button"
                                onClick={() => handlePaymentResultClick(payment)}
                                className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {payment.student_name || 'Unknown Student'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Receipt {payment.receipt_number}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {payment.transaction_id || payment.student_code || 'No reference'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-purple-700">
                                    {formatCurrency(payment.amount)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {paymentStatusLabel(payment.status)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDateTime(payment.payment_date)}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {searchError && (
                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {searchError}
                    </div>
                  )}

                  {shouldShowEmptyState && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                      Nothing matched this search. Try a student name, phone number, receipt
                      number, or page name.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={notificationsContainerRef} className="relative flex items-start">
          <div className="group relative mr-1 flex items-center gap-2 rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs transition-colors hover:border-purple-300 hover:bg-purple-50">
            {updateState.currentVersion ? (
              <span className="font-semibold text-gray-500">v{updateState.currentVersion}</span>
            ) : (
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            )}

            {updateState.status === 'checking' && (
              <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
            )}

            {updateState.status === 'downloading' && (
              <span className="text-purple-600 font-medium">{updateState.progress}%</span>
            )}

            {updateState.status === 'available' && (
              <button
                type="button"
                onClick={handleDownloadUpdate}
                className="flex items-center gap-1 text-purple-600 font-medium hover:text-purple-800"
              >
                <Download className="h-3 w-3" />
                Update to v{updateState.targetVersion}
              </button>
            )}

            {updateState.status === 'downloaded' && (
              <button
                type="button"
                onClick={() => {
                  const win = window as any;
                  if (win.appUpdates) win.appUpdates.install();
                }}
                className="flex items-center gap-1 text-green-600 font-medium animate-pulse"
              >
                <RefreshCcw className="h-3 w-3" />
                Restart to update
              </button>
            )}

            {updateState.status === 'error' && (
              <button
                type="button"
                onClick={handleCheckUpdate}
                className="flex items-center gap-1 text-red-500 hover:text-red-700"
                title={updateState.error || 'Update check failed'}
              >
                <RefreshCcw className="h-3 w-3" />
                Retry
              </button>
            )}

            {(updateState.status === 'idle' || updateState.status === 'dev') && (
              <button
                type="button"
                onClick={handleCheckUpdate}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title="Check for updates"
              >
                <RefreshCcw className="h-3 w-3 text-gray-400 hover:text-purple-600" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((prev) => {
                const nextOpen = !prev;

                if (nextOpen && unreadCount > 0) {
                  markAllAsRead();
                }

                return nextOpen;
              });
              setIsProfileMenuOpen(false);
              setIsSearchOpen(false);
            }}
            className="relative rounded-xl p-2 transition-colors hover:bg-gray-100"
            aria-label="Open notifications"
          >
            <NotificationBell isOpen={isNotificationsOpen} />
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <NotificationDropdown
                onClose={() => setIsNotificationsOpen(false)}
                showBranchName={userRole === 'superadmin'}
              />
            )}
          </AnimatePresence>
        </div>

        <div ref={profileMenuRef} className="relative border-l border-gray-200 pl-4">
          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen((prev) => !prev);
              setIsNotificationsOpen(false);
              setIsSearchOpen(false);
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
