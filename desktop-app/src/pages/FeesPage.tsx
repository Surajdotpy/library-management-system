import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Download,
  IndianRupee,
  Loader2,
  RefreshCcw,
  Search,
  UserCheck,
  UserX,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Button, Card, Input } from '@/components/ui';
import { branchesApi, feesApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth/session';
import type {
  Branch,
  FeeDashboard,
  FeePaymentDetail,
  FeePaymentRecord,
  OverdueStudent,
  StudentFeeStatus,
} from '@/types';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
] as const;

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
] as const;

type Tab = 'overview' | 'statuses' | 'overdue' | 'history' | 'record';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const msg = 'error' in data ? data.error : 'message' in data ? data.message : null;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'paid' ? 'success' as const
    : status === 'overdue' ? 'danger' as const
    : status === 'pending' ? 'warning' as const
    : 'default' as const;
  return <Badge variant={variant}>{status}</Badge>;
}

export default function FeesPage() {
  const user = getStoredUser();
  const isSuperAdmin = user?.role === 'superadmin';
  const now = new Date();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [branchId, setBranchId] = useState<number | ''>(isSuperAdmin ? '' : user?.branch_id ?? '');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Data states
  const [dashboard, setDashboard] = useState<FeeDashboard | null>(null);
  const [statuses, setStatuses] = useState<StudentFeeStatus[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<OverdueStudent[]>([]);
  const [payments, setPayments] = useState<FeePaymentRecord[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);

  const [statusSearch, setStatusSearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('');

  const effectiveBranchId = branchId === '' ? undefined : branchId;

  // ── Record Payment Form ──
  const [recordForm, setRecordForm] = useState({
    student_id: '',
    amount: '',
    fee_month: now.getMonth() + 1,
    fee_year: now.getFullYear(),
    payment_method: 'upi',
    transaction_id: '',
    notes: '',
  });
  const [recordLoading, setRecordLoading] = useState(false);

  // ── Generate Dues ──
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genLoading, setGenLoading] = useState(false);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const limit = 25;

  async function loadDashboard() {
    try {
      const data = await feesApi.getDashboard(effectiveBranchId);
      setDashboard(data);
    } catch { /* non-critical */ }
  }

  async function loadStatuses() {
    try {
      const data = await feesApi.getStudentStatuses(effectiveBranchId, month, year);
      setStatuses(data);
    } catch { /* non-critical */ }
  }

  async function loadOverdue() {
    try {
      const data = await feesApi.getOverdueStudents(effectiveBranchId);
      setOverdueStudents(data);
    } catch { /* non-critical */ }
  }

  async function loadHistory() {
    try {
      const data = await feesApi.getPaymentHistory({
        branchId: effectiveBranchId,
        status: historyStatusFilter || undefined,
        month,
        year,
        limit,
        offset: (page - 1) * limit,
      });
      setPayments(data.data);
      setPaymentsTotal(data.total);
    } catch { /* non-critical */ }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const branchData = await branchesApi.getAll();
      setBranches(branchData);
      await Promise.all([
        loadDashboard(),
        loadStatuses(),
        loadOverdue(),
        loadHistory(),
      ]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAll(); }, [branchId]);
  useEffect(() => { if (activeTab === 'statuses') void loadStatuses(); }, [month, year, activeTab]);
  useEffect(() => { if (activeTab === 'overdue') void loadOverdue(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'history') void loadHistory(); }, [activeTab, page, historyStatusFilter]);

  async function handleGenerateDues() {
    setActionMsg(null);
    setGenLoading(true);
    try {
      const result = await feesApi.generateDues(genMonth, genYear, effectiveBranchId);
      setActionMsg({
        type: 'success',
        text: `${result.generated} dues created, ${result.skipped} skipped${result.errors.length ? ', errors: ' + result.errors.join(', ') : ''}.`,
      });
      await Promise.all([loadDashboard(), loadStatuses(), loadOverdue()]);
    } catch (err) {
      setActionMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to generate dues') });
    } finally {
      setGenLoading(false);
    }
  }

  async function handleRecordPayment() {
    if (!recordForm.student_id || !recordForm.amount) return;
    setActionMsg(null);
    setRecordLoading(true);
    try {
      await feesApi.recordPayment({
        student_id: Number(recordForm.student_id),
        amount: Number(recordForm.amount),
        fee_month: recordForm.fee_month,
        fee_year: recordForm.fee_year,
        payment_method: recordForm.payment_method,
        transaction_id: recordForm.transaction_id.trim() || undefined,
        notes: recordForm.notes.trim() || undefined,
      });
      setActionMsg({ type: 'success', text: 'Payment recorded successfully.' });
      setRecordForm({ student_id: '', amount: '', fee_month: now.getMonth() + 1, fee_year: now.getFullYear(), payment_method: 'upi', transaction_id: '', notes: '' });
      await Promise.all([loadDashboard(), loadStatuses(), loadOverdue(), loadHistory()]);
    } catch (err) {
      setActionMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to record payment') });
    } finally {
      setRecordLoading(false);
    }
  }

  const filteredStatuses = useMemo(() => {
    const q = statusSearch.trim().toLowerCase();
    if (!q) return statuses;
    return statuses.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.student_code.toLowerCase().includes(q) ||
      s.branch_name.toLowerCase().includes(q)
    );
  }, [statuses, statusSearch]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'statuses', label: 'Fee Status' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'history', label: 'Payment History' },
    { key: 'record', label: 'Record Payment' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-100 bg-gradient-to-r from-white via-purple-50 to-blue-50 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Finance</p>
              <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-gray-900">
                <Wallet className="h-8 w-8 text-purple-600" /> Fee Management
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant={isSuperAdmin ? 'info' : 'success'}>
                {isSuperAdmin ? 'Global Access' : 'Branch Restricted'}
              </Badge>
              <Button type="button" variant="secondary" onClick={() => void loadAll()}>
                <RefreshCcw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {isSuperAdmin && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Branch</label>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              >
                {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`rounded-t-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Messages */}
        {actionMsg && (
          <div className={`rounded-xl border p-4 text-sm ${
            actionMsg.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}>
            {actionMsg.text}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <Card><div className="flex items-center justify-center py-12 text-gray-600">
            <Loader2 className="mr-3 h-8 w-8 animate-spin text-purple-600" /> Loading fee data...
          </div></Card>
        )}

        {/* Error */}
        {error && !loading && (
          <Card><div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div><p className="font-semibold">Failed to load</p><p className="text-sm">{error}</p></div>
          </div></Card>
        )}

        {!loading && !error && (
          <>
            {/* ────────────── OVERVIEW TAB ────────────── */}
            {activeTab === 'overview' && (
              <>
                {dashboard && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-100">
                      <p className="text-sm font-medium text-emerald-700">Today Collected</p>
                      <div className="mt-3 flex items-center gap-3">
                        <IndianRupee className="h-8 w-8 text-emerald-600" />
                        <div>
                          <p className="text-3xl font-bold text-emerald-900">{formatINR(dashboard.today_collected)}</p>
                          <p className="text-sm text-emerald-600">{dashboard.today_count} payments</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-100">
                      <p className="text-sm font-medium text-blue-700">This Month</p>
                      <div className="mt-3 flex items-center gap-3">
                        <Banknote className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-3xl font-bold text-blue-900">{formatINR(dashboard.month_collected)}</p>
                          <p className="text-sm text-blue-600">{dashboard.month_count} payments</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100">
                      <p className="text-sm font-medium text-amber-700">Pending Fees</p>
                      <div className="mt-3 flex items-center gap-3">
                        <UserCheck className="h-8 w-8 text-amber-600" />
                        <div>
                          <p className="text-3xl font-bold text-amber-900">{formatINR(dashboard.pending_amount)}</p>
                          <p className="text-sm text-amber-600">{dashboard.pending_count} students</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-100">
                      <p className="text-sm font-medium text-red-700">Overdue</p>
                      <div className="mt-3 flex items-center gap-3">
                        <UserX className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-3xl font-bold text-red-900">{formatINR(dashboard.overdue_amount)}</p>
                          <p className="text-sm text-red-600">{dashboard.overdue_count} students</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Generate Dues */}
                <Card>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                      <CalendarDays className="h-5 w-5 text-purple-700" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Generate Monthly Dues</h2>
                      <p className="text-sm text-gray-500">
                        Create pending fee records for all active students in a given month.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-40">
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Month</label>
                      <select value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none"
                      >
                        {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div className="w-40">
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Year</label>
                      <select value={genYear} onChange={(e) => setGenYear(Number(e.target.value))}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none"
                      >
                        {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <Button type="button" variant="primary" isLoading={genLoading}
                      onClick={() => void handleGenerateDues()} disabled={genLoading}>
                      <Download className="h-4 w-4" /> Generate Dues
                    </Button>
                  </div>
                </Card>

                {/* Overdue Summary */}
                {overdueStudents.length > 0 && (
                  <Card noPadding>
                    <div className="flex items-center justify-between border-b border-gray-100 p-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Overdue Students</h2>
                        <p className="text-sm text-gray-500">{overdueStudents.length} students with pending dues.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setActiveTab('overdue')}>
                        View All
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Branch</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Overdue</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {overdueStudents.slice(0, 5).map((s) => (
                            <tr key={s.student_id} className="transition-colors hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-900">{s.name}</p>
                                <p className="text-sm text-gray-500">{s.student_code}</p>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{s.branch_name}</td>
                              <td className="px-6 py-4">
                                <Badge variant="danger">{s.overdue_months} months</Badge>
                              </td>
                              <td className="px-6 py-4 font-semibold text-red-700">{formatINR(s.total_due)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ────────────── FEE STATUS TAB ────────────── */}
            {activeTab === 'statuses' && (
              <Card noPadding>
                <div className="border-b border-gray-100 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Student Fee Status</h2>
                      <p className="text-sm text-gray-500">
                        Fee status for {MONTHS.find((m) => m.value === month)?.label} {year}.
                      </p>
                    </div>
                    <div className="relative min-w-[250px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={statusSearch} onChange={(e) => setStatusSearch(e.target.value)}
                        placeholder="Search by name, code, branch..."
                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
                {filteredStatuses.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No students found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Branch</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fee</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Paid</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Coverage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredStatuses.map((s) => (
                          <tr key={s.student_id} className="transition-colors hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900">{s.name}</p>
                              <p className="text-sm text-gray-500">{s.student_code}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{s.branch_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{s.study_plan}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900">{formatINR(s.monthly_fee)}</td>
                            <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                            <td className="px-6 py-4 font-semibold text-gray-900">{formatINR(s.paid_amount)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {s.coverage_start ? `${new Date(s.coverage_start).toLocaleDateString('en-IN')} - ${s.coverage_end ? new Date(s.coverage_end).toLocaleDateString('en-IN') : ''}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* ────────────── OVERDUE TAB ────────────── */}
            {activeTab === 'overdue' && (
              <>
                {overdueStudents.length === 0 ? (
                  <Card><div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-semibold">No overdue students! 🎉</p>
                    <p className="text-sm">All fees are up to date.</p>
                  </div></Card>
                ) : (
                  <Card noPadding>
                    <div className="border-b border-gray-100 p-6">
                      <h2 className="text-xl font-bold text-gray-900">Overdue Students</h2>
                      <p className="text-sm text-gray-500">{overdueStudents.length} students with pending dues.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Branch</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Monthly Fee</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Overdue</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Due</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Last Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {overdueStudents.map((s) => (
                            <tr key={s.student_id} className="transition-colors hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-900">{s.name}</p>
                                <p className="text-sm text-gray-500">{s.student_code}</p>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{s.branch_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{s.phone}</td>
                              <td className="px-6 py-4 font-semibold text-gray-900">{formatINR(s.monthly_fee)}</td>
                              <td className="px-6 py-4"><Badge variant="danger">{s.overdue_months} months</Badge></td>
                              <td className="px-6 py-4 font-semibold text-red-700">{formatINR(s.total_due)}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {s.last_paid_date ? new Date(s.last_paid_date).toLocaleDateString('en-IN') : 'Never'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ────────────── PAYMENT HISTORY TAB ────────────── */}
            {activeTab === 'history' && (
              <Card noPadding>
                <div className="border-b border-gray-100 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                      <p className="text-sm text-gray-500">{paymentsTotal} total payments.</p>
                    </div>
                    <div className="flex gap-3">
                      <select value={historyStatusFilter} onChange={(e) => { setHistoryStatusFilter(e.target.value); setPage(1); }}
                        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                </div>
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No payments found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Receipt</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Branch</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Method</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {payments.map((p) => (
                          <tr key={p.id} className="transition-colors hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-mono text-gray-900">{p.receipt_number || '-'}</td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900">{p.student_name}</p>
                              <p className="text-sm text-gray-500">{p.student_code}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{p.branch_name}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900">{formatINR(p.amount)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{p.payment_method}</td>
                            <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(p.payment_date).toLocaleDateString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {paymentsTotal > limit && (
                  <div className="flex items-center justify-between border-t border-gray-100 p-6">
                    <p className="text-sm text-gray-600">Page {page} of {Math.ceil(paymentsTotal / limit)}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Previous
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={page >= Math.ceil(paymentsTotal / limit)} onClick={() => setPage((p) => p + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* ────────────── RECORD PAYMENT TAB ────────────── */}
            {activeTab === 'record' && (
              <Card>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                    <IndianRupee className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Record Manual Payment</h2>
                    <p className="text-sm text-gray-500">
                      Record a cash, UPI, card, or cheque payment received offline.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Student ID" type="number" placeholder="Enter numeric student ID"
                    value={recordForm.student_id}
                    onChange={(e) => setRecordForm((f) => ({ ...f, student_id: e.target.value }))}
                  />
                  <Input label="Amount (₹)" type="number" placeholder="0"
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Month</label>
                    <select value={recordForm.fee_month}
                      onChange={(e) => setRecordForm((f) => ({ ...f, fee_month: Number(e.target.value) }))}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none"
                    >
                      {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Year</label>
                    <select value={recordForm.fee_year}
                      onChange={(e) => setRecordForm((f) => ({ ...f, fee_year: Number(e.target.value) }))}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none"
                    >
                      {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Payment Method</label>
                    <select value={recordForm.payment_method}
                      onChange={(e) => setRecordForm((f) => ({ ...f, payment_method: e.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none"
                    >
                      {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <Input label="Transaction ID (optional)" placeholder="UPI ref / cheque no."
                    value={recordForm.transaction_id}
                    onChange={(e) => setRecordForm((f) => ({ ...f, transaction_id: e.target.value }))}
                  />
                </div>
                <div className="mt-4">
                  <Input label="Notes (optional)" placeholder="Any remarks"
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="mt-6">
                  <Button type="button" variant="primary" isLoading={recordLoading}
                    onClick={() => void handleRecordPayment()}
                    disabled={!recordForm.student_id || !recordForm.amount || recordLoading}
                    fullWidth
                  >
                    Record Payment
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
