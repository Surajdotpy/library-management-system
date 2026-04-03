import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { routes } from '@/config/routes';
import { getStoredUser } from '@/lib/auth/session';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const StudentsPage = lazy(() => import('@/pages/StudentsPage'));
const SeatsPage = lazy(() => import('@/pages/SeatsPage'));
const AttendancePage = lazy(() => import('@/pages/AttendancePage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const AdminManagementPage = lazy(() => import('@/pages/AdminManagementPage'));
const TestPage = lazy(() => import('@/pages/TestPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
import StudentPaymentPage from "@/pages/StudentPaymentPage";
function ProtectedRoute() {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to={routes.login} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const user = getStoredUser();

  if (user) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return <Outlet />;
}

function SuperAdminRoute() {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to={routes.login} replace />;
  }

  if (user.role !== 'superadmin') {
    return <Navigate to={routes.dashboard} replace />;
  }

  return <Outlet />;
}

function App() {
  const fallbackRoute = getStoredUser() ? routes.dashboard : routes.login;

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path={routes.login} element={<LoginPage />} />
          </Route>

          <Route path="/pay/:paymentId" element={<StudentPaymentPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path={routes.dashboard} element={<DashboardPage />} />
            <Route path={routes.students} element={<StudentsPage />} />
            <Route path={routes.seats} element={<SeatsPage />} />
            <Route path={routes.attendance} element={<AttendancePage />} />
            <Route path={routes.payments} element={<PaymentsPage />} />
            <Route path={routes.test} element={<TestPage />} />
          </Route>

          <Route element={<SuperAdminRoute />}>
            <Route path={routes.admins} element={<AdminManagementPage />} />
            <Route path={routes.reports} element={<ReportsPage />} />
          </Route>

          <Route path={routes.root} element={<Navigate to={fallbackRoute} replace />} />
          <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;