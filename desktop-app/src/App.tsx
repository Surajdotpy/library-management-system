import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import StudentsPage from '@/pages/StudentsPage';
import AttendancePage from '@/pages/AttendancePage';
import PaymentsPage from '@/pages/PaymentsPage';
import AdminManagementPage from '@/pages/AdminManagementPage';
import TestPage from '@/pages/TestPage';
import { routes } from '@/config/routes';
import { getStoredUser } from '@/lib/auth/session';

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
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path={routes.login} element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path={routes.dashboard} element={<DashboardPage />} />
          <Route path={routes.students} element={<StudentsPage />} />
          <Route path={routes.attendance} element={<AttendancePage />} />
          <Route path={routes.payments} element={<PaymentsPage />} />
          <Route path={routes.test} element={<TestPage />} />
          <Route path={routes.reports} element={<Navigate to={routes.dashboard} replace />} />
        </Route>

        <Route element={<SuperAdminRoute />}>
          <Route path={routes.admins} element={<AdminManagementPage />} />
        </Route>

        <Route path={routes.root} element={<Navigate to={fallbackRoute} replace />} />
        <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
