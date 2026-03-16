import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Button, Card, Input } from '@/components/ui';
import { getBranchName } from '@/config/branches';
import { getStoredUser } from '@/lib/auth/session';
import { paymentsApi, studentsApi } from '@/lib/api';
import type { MonthlyRevenue, Payment, PendingPayment, RecordPaymentRequest, Student } from '@/types';

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonthYear(month: number, year: number): string {
  const monthLabel = MONTH_OPTIONS.find((option) => option.value === month)?.label ?? `Month ${month}`;
  return `${monthLabel} ${year}`;
}

export default function PaymentsPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const branchLabel = isSuperAdmin
    ? 'All Branches'
    : getBranchName(currentUser?.branch_id ?? null);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [students, setStudents] = useState<Student[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [currentMonthPayments, setCurrentMonthPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentForm, setPaymentForm] = useState<RecordPaymentRequest>({
    student_id: 0,
    amount: 0,
    fee_month: currentMonth,
    fee_year: currentYear,
    payment_method: 'upi',
    transaction_id: '',
    notes: '',
  });

  const fetchPaymentsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [studentData, latestPayments, monthlyPayments, pendingData, revenueData] =
        await Promise.all([
          studentsApi.getAll(),
          paymentsApi.getAll({ limit: 25 }),
          paymentsApi.getAll({ month: currentMonth, year: currentYear, limit: 500 }),
          paymentsApi.getPending(),
          paymentsApi.getMonthlyRevenue(currentYear, currentMonth),
        ]);

      setStudents(studentData);
      setRecentPayments(latestPayments);
      setCurrentMonthPayments(monthlyPayments);
      setPendingPayments(pendingData);
      setMonthlyRevenue(revenueData);
    } catch (err: any) {
      console.error('Failed to load payments page data.', err);
      setError(err.response?.data?.error || 'Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const activeStudents = useMemo(
    () =>
      students
        .filter((student) => student.is_active)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [students],
  );

  const selectedStudent = useMemo(
    () => activeStudents.find((student) => student.id === paymentForm.student_id) ?? null,
    [activeStudents, paymentForm.student_id],
  );

  const todayCollection = useMemo(() => {
    const todayKey = currentDate.toISOString().slice(0, 10);
    const todayPayments = currentMonthPayments.filter(
      (payment) => payment.payment_date.slice(0, 10) === todayKey,
    );

    return {
      count: todayPayments.length,
      amount: todayPayments.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [currentDate, currentMonthPayments]);

  const pendingAmount = useMemo(
    () => pendingPayments.reduce((sum, payment) => sum + payment.total_pending, 0),
    [pendingPayments],
  );

  const filteredPendingPayments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return pendingPayments;
    }

    return pendingPayments.filter(
      (payment) =>
        payment.student_name.toLowerCase().includes(normalizedQuery) ||
        payment.student_code.toLowerCase().includes(normalizedQuery) ||
        payment.student_phone.includes(searchQuery),
    );
  }, [pendingPayments, searchQuery]);

  const yearOptions = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1],
    [currentYear],
  );

  const updatePaymentForm = <K extends keyof RecordPaymentRequest>(
    field: K,
    value: RecordPaymentRequest[K],
  ) => {
    setPaymentForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (paymentError) {
      setPaymentError(null);
    }

    if (paymentSuccess) {
      setPaymentSuccess(null);
    }
  };

  const selectStudentForPayment = (studentId: number) => {
    const student = activeStudents.find((item) => item.id === studentId);

    setPaymentForm((previous) => ({
      ...previous,
      student_id: studentId,
      amount: student?.monthly_fee ?? 0,
    }));

    setPaymentError(null);
    setPaymentSuccess(null);
  };

  const handleSubmitPayment = async () => {
    if (!paymentForm.student_id) {
      setPaymentError('Select a student before recording payment.');
      return;
    }

    if (!selectedStudent) {
      setPaymentError('Selected student is not available.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      await paymentsApi.record({
        student_id: paymentForm.student_id,
        amount: selectedStudent.monthly_fee,
        fee_month: paymentForm.fee_month,
        fee_year: paymentForm.fee_year,
        payment_method: 'upi',
        transaction_id: paymentForm.transaction_id?.trim() || undefined,
        notes: paymentForm.notes?.trim() || undefined,
      });

      setPaymentSuccess('Payment recorded successfully.');
      setPaymentForm({
        student_id: 0,
        amount: 0,
        fee_month: currentMonth,
        fee_year: currentYear,
        payment_method: 'upi',
        transaction_id: '',
        notes: '',
      });

      await fetchPaymentsData();
    } catch (err: any) {
      console.error('Failed to record payment.', err);
      setPaymentError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <DollarSign className="h-8 w-8 text-purple-600" />
              Payments Management
            </h1>
            <p className="mt-1 text-gray-600">
              Track and collect monthly fees for {branchLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={isSuperAdmin ? 'info' : 'success'}>
              {isSuperAdmin ? 'Global View' : 'Branch View'}
            </Badge>
            <Button
              type="button"
              variant="secondary"
              onClick={fetchPaymentsData}
              disabled={loading || paymentLoading}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {loading && (
          <Card>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Loading payments...</span>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Failed to load payments</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={fetchPaymentsData}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-100">
                <p className="text-sm text-purple-700">Today's Collection</p>
                <h2 className="mt-2 text-3xl font-bold text-purple-900">
                  {formatCurrency(todayCollection.amount)}
                </h2>
                <p className="mt-1 text-sm text-purple-700">
                  {todayCollection.count} payment{todayCollection.count === 1 ? '' : 's'}
                </p>
              </Card>

              <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-blue-100">
                <p className="text-sm text-sky-700">This Month</p>
                <h2 className="mt-2 text-3xl font-bold text-sky-900">
                  {formatCurrency(monthlyRevenue?.total_amount ?? 0)}
                </h2>
                <p className="mt-1 text-sm text-sky-700">
                  {monthlyRevenue?.total_payments ?? 0} payment{monthlyRevenue?.total_payments === 1 ? '' : 's'}
                </p>
              </Card>

              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100">
                <p className="text-sm text-amber-700">Pending Amount</p>
                <h2 className="mt-2 text-3xl font-bold text-amber-900">
                  {formatCurrency(pendingAmount)}
                </h2>
                <p className="mt-1 text-sm text-amber-700">
                  {pendingPayments.length} student{pendingPayments.length === 1 ? '' : 's'} pending
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card>
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Collect the monthly fee for a student
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
                      <Plus className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Student
                      </label>
                      <select
                        value={paymentForm.student_id || ''}
                        onChange={(event) =>
                          selectStudentForPayment(
                            event.target.value ? Number(event.target.value) : 0,
                          )
                        }
                        disabled={paymentLoading}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                      >
                        <option value="">Select student</option>
                        {activeStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} ({student.student_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Amount"
                      value={selectedStudent ? selectedStudent.monthly_fee.toString() : ''}
                      readOnly
                      helperText="Amount is locked to the student's monthly fee"
                      fullWidth
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Fee Month
                        </label>
                        <select
                          value={paymentForm.fee_month}
                          onChange={(event) =>
                            updatePaymentForm('fee_month', Number(event.target.value))
                          }
                          disabled={paymentLoading}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                        >
                          {MONTH_OPTIONS.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Fee Year
                        </label>
                        <select
                          value={paymentForm.fee_year}
                          onChange={(event) =>
                            updatePaymentForm('fee_year', Number(event.target.value))
                          }
                          disabled={paymentLoading}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                        >
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Input
                      label="Transaction ID"
                      placeholder="Optional UPI reference"
                      value={paymentForm.transaction_id || ''}
                      onChange={(event) =>
                        updatePaymentForm('transaction_id', event.target.value)
                      }
                      helperText="Optional"
                      fullWidth
                      disabled={paymentLoading}
                    />

                    <Input
                      label="Notes"
                      placeholder="Optional payment note"
                      value={paymentForm.notes || ''}
                      onChange={(event) => updatePaymentForm('notes', event.target.value)}
                      helperText="Optional"
                      fullWidth
                      disabled={paymentLoading}
                    />

                    {paymentError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {paymentError}
                      </div>
                    )}

                    {paymentSuccess && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        {paymentSuccess}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      isLoading={paymentLoading}
                      onClick={handleSubmitPayment}
                      disabled={!selectedStudent || paymentLoading}
                      fullWidth
                    >
                      Record Payment
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Pending Payments</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Students with unpaid monthly dues
                        </p>
                      </div>

                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search student or phone..."
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredPendingPayments.length === 0 ? (
                    <div className="p-10 text-center">
                      <Wallet className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="font-semibold text-gray-900">
                        {pendingPayments.length === 0
                          ? 'No pending payments right now'
                          : 'No pending student matched your search'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {pendingPayments.length === 0
                          ? 'All visible students are up to date.'
                          : 'Try a different search term.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Student
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Pending Months
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Total Pending
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Last Payment
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredPendingPayments.map((payment, index) => (
                            <motion.tr
                              key={payment.student_id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.04 }}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {payment.student_name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {payment.student_code} • {payment.student_phone}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {payment.pending_months}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                                {formatCurrency(payment.total_pending)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(payment.last_payment_date)}
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => selectStudentForPayment(payment.student_id)}
                                  className="font-medium text-purple-600 transition-colors hover:text-purple-700"
                                >
                                  Pay Now
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Recent Payments</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Latest recorded payments across visible data
                        </p>
                      </div>
                      <Badge variant="info">{recentPayments.length}</Badge>
                    </div>
                  </div>

                  {recentPayments.length === 0 ? (
                    <div className="p-10 text-center">
                      <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="font-semibold text-gray-900">No payments recorded yet</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Recorded payments will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Student
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Fee Month
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Amount
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Date
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Receipt
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {recentPayments.map((payment, index) => (
                            <motion.tr
                              key={payment.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.04 }}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {payment.student_name || 'Unknown Student'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {payment.student_code || `Student #${payment.student_id}`}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {formatMonthYear(payment.fee_month, payment.fee_year)}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(payment.payment_date)}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-purple-700">
                                {payment.receipt_number}
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="success">
                                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                </Badge>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
