import { motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Clock,
  DollarSign,
  Loader2,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/features/dashboard/StatCard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Card } from '@/components/ui';
import { getStoredUser } from '@/lib/auth/session';
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary';

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

export default function DashboardPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const branchId = isSuperAdmin ? undefined : currentUser?.branch_id ?? undefined;
  const { summary, loading, error, refreshSummary } = useDashboardSummary(branchId);

  const branchLabel = summary?.branch?.name ?? (isSuperAdmin ? 'All Branches' : 'My Branch');
  const introTitle = isSuperAdmin ? 'Super Admin Overview' : 'Branch Admin Overview';
  const introText = isSuperAdmin
    ? 'Track student activity, attendance, revenue, and capacity across every active branch.'
    : `You are viewing the live operating dashboard for ${branchLabel}. All data here is limited to your branch.`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-100 bg-gradient-to-r from-white via-purple-50 to-blue-50 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">
                {introTitle}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">{branchLabel}</h1>
              <p className="mt-2 max-w-3xl text-gray-600">{introText}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={isSuperAdmin ? 'info' : 'success'}>
                {isSuperAdmin ? 'Global Access' : 'Branch Restricted'}
              </Badge>
              {summary && (
                <Badge variant="default">
                  Updated {formatDateTime(summary.generated_at)}
                </Badge>
              )}
            </div>
          </div>
        </motion.div>

        {loading && (
          <Card>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Loading dashboard...</span>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Failed to load dashboard</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshSummary}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Retry
              </button>
            </div>
          </Card>
        )}

        {summary && !loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={isSuperAdmin ? 'Total Students' : 'Branch Students'}
                value={summary.stats.total_students}
                icon={Users}
                color="blue"
                delay={0.1}
              />
              <StatCard
                title="Currently Inside"
                value={summary.stats.currently_inside}
                icon={UserCheck}
                color="green"
                delay={0.2}
              />
              <StatCard
                title="Today's Revenue"
                value={formatCurrency(summary.stats.today_revenue)}
                icon={DollarSign}
                color="purple"
                delay={0.3}
              />
              <StatCard
                title="Occupancy Rate"
                value={`${summary.stats.occupancy_rate}%`}
                icon={TrendingUp}
                color="amber"
                delay={0.4}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-100">
                <p className="text-sm font-medium text-green-700">Active Students</p>
                <p className="mt-2 text-2xl font-bold text-green-900">
                  {summary.stats.active_students}
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Inactive: {summary.stats.inactive_students}
                </p>
              </Card>

              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100">
                <p className="text-sm font-medium text-amber-700">Pending Payments</p>
                <p className="mt-2 text-2xl font-bold text-amber-900">
                  {summary.stats.pending_payments}
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Entries today: {summary.stats.today_entries} | Exits: {summary.stats.today_exits}
                </p>
              </Card>

              <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-blue-100">
                <p className="text-sm font-medium text-sky-700">Monthly Revenue</p>
                <p className="mt-2 text-2xl font-bold text-sky-900">
                  {formatCurrency(summary.stats.monthly_revenue)}
                </p>
                <p className="mt-1 text-sm text-sky-700">
                  Capacity: {summary.stats.total_capacity}
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Recent Payments</h3>
                      <Badge variant="info">{summary.recent_payments.length}</Badge>
                    </div>
                  </div>

                  {summary.recent_payments.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">No recent payments found.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {summary.recent_payments.map((payment, index) => (
                        <motion.div
                          key={payment.payment_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + index * 0.05 }}
                          className="p-4 transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                              <DollarSign className="h-5 w-5 text-purple-600" />
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{payment.student_name}</p>
                              <p className="text-sm text-gray-600">
                                {payment.student_code} • Receipt {payment.receipt_number}
                              </p>
                              {isSuperAdmin && (
                                <p className="text-xs text-gray-500">{payment.branch_name}</p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-purple-700">
                                {formatCurrency(payment.amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDateTime(payment.payment_date)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <div>
                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Currently Inside</h3>
                      <Badge variant="success">{summary.students_inside.length}</Badge>
                    </div>
                  </div>

                  {summary.students_inside.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">No students are currently inside.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {summary.students_inside.map((student, index) => (
                        <motion.div
                          key={student.attendance_id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                          className="p-4 transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                              <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{student.student_name}</p>
                              <p className="text-sm text-gray-600">{student.student_code}</p>
                              {isSuperAdmin && (
                                <p className="text-xs text-gray-500">{student.branch_name}</p>
                              )}
                              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3.5 w-3.5" />
                                Entered {formatDateTime(student.entry_time)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {isSuperAdmin && summary.branch_overview && summary.branch_overview.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Branch Performance</h3>
                      <Badge variant="info">{summary.branch_overview.length} branches</Badge>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Branch
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Students
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Inside
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Occupancy
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {summary.branch_overview.map((branch) => (
                          <tr key={branch.branch_id} className="transition-colors hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="font-semibold text-gray-900">{branch.branch_name}</p>
                                  <p className="text-xs text-gray-500">{branch.branch_code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {branch.active_students} active / {branch.total_students} total
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {branch.currently_inside} / {branch.total_capacity}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {branch.occupancy_rate}%
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-purple-700">
                              {formatCurrency(branch.monthly_revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
