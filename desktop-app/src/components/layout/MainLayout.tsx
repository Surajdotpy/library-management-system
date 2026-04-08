import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { routes } from '@/config/routes';
import { getStoredUser } from '@/lib/auth/session';
import { NotificationsProvider } from '@/lib/hooks/useNotifications';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to={routes.login} replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar userRole={user.role} />
      <NotificationsProvider>
        <div className="flex-1 flex flex-col ml-64 overflow-hidden">
          <Header
            userName={user.real_name || user.name}
            userEmail={user.email}
            userRole={user.role}
            branchId={user.branch_id}
          />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </NotificationsProvider>
    </div>
  );
}
