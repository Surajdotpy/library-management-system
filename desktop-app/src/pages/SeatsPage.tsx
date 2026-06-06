import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  AlertCircle,
  Armchair,
  CalendarDays,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  TicketCheck,
  Trash2,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Button, Card } from '@/components/ui';
import { branchesApi, seatsApi, studentsApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth/session';
import type { Branch, Seat, SeatBooking, Student } from '@/types';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
] as const;

const AVAILABILITY_FILTERS = ['all', 'available', 'booked', 'maintenance', 'inactive'] as const;

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

function badgeVariant(status: string) {
  if (status === 'available') return 'success' as const;
  if (status === 'booked') return 'info' as const;
  if (status === 'maintenance') return 'warning' as const;
  if (status === 'inactive') return 'danger' as const;
  if (status === 'active') return 'success' as const;
  if (status === 'reserved') return 'info' as const;
  if (status === 'cancelled') return 'warning' as const;
  return 'default' as const;
}

export default function SeatsPage() {
  const user = getStoredUser();
  const isSuperAdmin = user?.role === 'superadmin';
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [branchId, setBranchId] = useState<number | ''>(isSuperAdmin ? '' : user?.branch_id ?? '');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<SeatBooking[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [search, setSearch] = useState('');
  const [availFilter, setAvailFilter] = useState<string>('all');

  const effectiveBranchId = branchId === '' ? undefined : branchId;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [branchData, seatData, bookingData, studentData] = await Promise.all([
        branchesApi.getAll(),
        seatsApi.getAll({ branch_id: effectiveBranchId }),
        seatsApi.getBookings({ month, year, branch_id: effectiveBranchId, limit: 50 }),
        studentsApi.getAll() as Promise<Student[]>,
      ]);
      setBranches(branchData);
      setSeats(seatData);
      setBookings(bookingData);
      setStudents(studentData);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [month, year, branchId]);

  const filteredSeats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return seats.filter((s) => {
      if (availFilter !== 'all' && s.availability_status !== availFilter) return false;
      if (!q) return true;
      return (
        s.seat_number.toLowerCase().includes(q) ||
        (s.booked_student_name?.toLowerCase() || '').includes(q) ||
        (s.booked_student_code?.toLowerCase() || '').includes(q)
      );
    });
  }, [seats, search, availFilter]);

  const stats = useMemo(() =>
    seats.reduce(
      (acc, s) => {
        acc.total++;
        acc[s.availability_status]++;
        return acc;
      },
      { total: 0, available: 0, booked: 0, maintenance: 0, inactive: 0 },
    ),
    [seats],
  );

  // ── Bulk Create ──
  const [bulkForm, setBulkForm] = useState({ branch_id: 0, start_number: 1, count: 100, floor_name: '' });
  const [bulkLoading, setBulkLoading] = useState(false);

  async function handleBulkCreate() {
    setActionMsg(null);
    setBulkLoading(true);
    try {
      const result = await seatsApi.bulkCreate({
        branch_id: effectiveBranchId ?? bulkForm.branch_id,
        start_number: bulkForm.start_number,
        count: bulkForm.count,
        floor_name: bulkForm.floor_name.trim() || undefined,
      });
      setActionMsg({ type: 'success', text: `${result.created} seats created.` });
      await loadData();
    } catch (err) {
      setActionMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to create seats') });
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Assign / Unassign ──
  const [assignSeatId, setAssignSeatId] = useState<number | ''>('');
  const [assignStudentId, setAssignStudentId] = useState<number | ''>('');
  const [assignLoading, setAssignLoading] = useState(false);

  const availableSeats = useMemo(() => seats.filter((s) => s.availability_status === 'available'), [seats]);
  const assignableStudents = useMemo(() => {
    if (!assignSeatId) return students;
    const seat = seats.find((s) => s.id === assignSeatId);
    if (!seat) return students;
    return students.filter((st) => st.branch_id === seat.branch_id);
  }, [students, assignSeatId, seats]);

  async function handleAssign() {
    if (!assignSeatId || !assignStudentId) return;
    setActionMsg(null);
    setAssignLoading(true);
    try {
      await seatsApi.assign(assignSeatId, { student_id: assignStudentId });
      setActionMsg({ type: 'success', text: 'Seat assigned successfully.' });
      setAssignSeatId('');
      setAssignStudentId('');
      await loadData();
    } catch (err) {
      setActionMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to assign seat') });
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleUnassign(seatId: number) {
    setActionMsg(null);
    try {
      await seatsApi.unassign(seatId);
      setActionMsg({ type: 'success', text: 'Seat unassigned.' });
      await loadData();
    } catch (err) {
      setActionMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to unassign seat') });
    }
  }

  // ── Render ──
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-100 bg-gradient-to-r from-white via-purple-50 to-blue-50 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Seat Management</p>
              <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-gray-900">
                <Armchair className="h-8 w-8 text-purple-600" /> Seats
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant={isSuperAdmin ? 'info' : 'success'}>
                {isSuperAdmin ? 'Global Access' : 'Branch Restricted'}
              </Badge>
              <Button type="button" variant="secondary" onClick={() => void loadData()}>
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
                {[now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Loading / Error */}
        {loading && (
          <Card><div className="flex items-center justify-center py-12 text-gray-600">
            <Loader2 className="mr-3 h-8 w-8 animate-spin text-purple-600" /> Loading seats...
          </div></Card>
        )}
        {error && (
          <Card><div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div><p className="font-semibold">Failed to load</p><p className="text-sm">{error}</p></div>
          </div></Card>
        )}

        {!loading && !error && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-100">
                <p className="text-sm font-medium text-blue-700">Total Seats</p>
                <div className="mt-3 flex items-center gap-3">
                  <Armchair className="h-8 w-8 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                </div>
              </Card>
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-100">
                <p className="text-sm font-medium text-emerald-700">Available</p>
                <div className="mt-3 flex items-center gap-3">
                  <TicketCheck className="h-8 w-8 text-emerald-600" />
                  <p className="text-3xl font-bold text-emerald-900">{stats.available}</p>
                </div>
              </Card>
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-100">
                <p className="text-sm font-medium text-purple-700">Booked</p>
                <div className="mt-3 flex items-center gap-3">
                  <Users className="h-8 w-8 text-purple-600" />
                  <p className="text-3xl font-bold text-purple-900">{stats.booked}</p>
                </div>
              </Card>
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100">
                <p className="text-sm font-medium text-amber-700">Maint. / Inactive</p>
                <div className="mt-3 flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-amber-600" />
                  <p className="text-3xl font-bold text-amber-900">{stats.maintenance + stats.inactive}</p>
                </div>
              </Card>
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

            {/* Bulk Create + Assign Section */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                    <Plus className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Create Seats</h2>
                    <p className="text-sm text-gray-500">Bulk-create numbered seats for a branch.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Start Number</label>
                      <input type="number" min={1} value={bulkForm.start_number}
                        onChange={(e) => setBulkForm((f) => ({ ...f, start_number: Number(e.target.value) }))}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Count</label>
                      <input type="number" min={1} max={1000} value={bulkForm.count}
                        onChange={(e) => setBulkForm((f) => ({ ...f, count: Number(e.target.value) }))}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Floor Name (optional)</label>
                    <input type="text" placeholder="e.g. Ground Floor" value={bulkForm.floor_name}
                      onChange={(e) => setBulkForm((f) => ({ ...f, floor_name: e.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none" />
                  </div>
                  <Button type="button" variant="primary" isLoading={bulkLoading}
                    onClick={() => void handleBulkCreate()}
                    disabled={bulkLoading || (!effectiveBranchId && !isSuperAdmin) || bulkForm.count < 1}
                    fullWidth>
                    Create {bulkForm.count} Seats
                  </Button>
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                    <UserPlus className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Assign Seat</h2>
                    <p className="text-sm text-gray-500">Permanently assign a seat to a student.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Seat</label>
                    <select value={assignSeatId} onChange={(e) => { setAssignSeatId(e.target.value ? Number(e.target.value) : ''); setAssignStudentId(''); }}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none">
                      <option value="">Select available seat</option>
                      {availableSeats.map((s) => (
                        <option key={s.id} value={s.id}>{s.seat_number}</option>
                      ))}
                    </select>
                    {availableSeats.length === 0 && (
                      <p className="mt-1 text-sm text-amber-700">No available seats.</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Student</label>
                    <select value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!assignSeatId || assignableStudents.length === 0}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:outline-none">
                      <option value="">
                        {!assignSeatId ? 'Select a seat first' : 'Select student'}
                      </option>
                      {assignableStudents.map((st) => (
                        <option key={st.id} value={st.id}>{st.name} ({st.student_id})</option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" variant="primary" isLoading={assignLoading}
                    onClick={() => void handleAssign()}
                    disabled={!assignSeatId || !assignStudentId || assignLoading} fullWidth>
                    Assign Seat
                  </Button>
                </div>
              </Card>
            </div>

            {/* Seat Inventory */}
            <Card noPadding>
              <div className="border-b border-gray-100 p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Seat Inventory</h2>
                    <p className="text-sm text-gray-500">Permanent seat assignments. Click Assign/Unassign to manage.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search seat or student..."
                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}
                      className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {AVAILABILITY_FILTERS.map((f) => (
                        <option key={f} value={f}>{f === 'all' ? 'All Statuses' : f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {filteredSeats.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No seats match the filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Seat</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Floor</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Assigned To</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSeats.map((seat) => (
                        <tr key={seat.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{seat.seat_number}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{seat.floor_name || '-'}</td>
                          <td className="px-6 py-4">
                            <Badge variant={badgeVariant(seat.availability_status)}>
                              {seat.availability_status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {seat.booked_student_name ? (
                              <div>
                                <p className="font-semibold text-gray-900">{seat.booked_student_name}</p>
                                <p className="text-sm text-gray-500">{seat.booked_student_code}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Open</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {seat.availability_status === 'available' && (
                                <Button type="button" variant="primary" size="sm" fullWidth={false}
                                  onClick={() => { setAssignSeatId(seat.id); }}>
                                  Assign
                                </Button>
                              )}
                              {seat.availability_status === 'booked' && (
                                <Button type="button" variant="outline" size="sm" fullWidth={false}
                                  onClick={() => void handleUnassign(seat.id)}>
                                  <Trash2 className="h-3.5 w-3.5" /> Unassign
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Recent Bookings */}
            <Card noPadding>
              <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Monthly Bookings</h2>
                  <p className="text-sm text-gray-500">Booking history for {MONTHS.find((m) => m.value === month)?.label} {year}.</p>
                </div>
                <Badge variant="info">{bookings.length}</Badge>
              </div>

              {bookings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No bookings found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Seat</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Period</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Assigned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bookings.map((b) => (
                        <tr key={b.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{b.seat_number}</p>
                            <p className="text-sm text-gray-500">{b.section}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{b.student_name}</p>
                            <p className="text-sm text-gray-500">{b.student_code}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={badgeVariant(b.status)}>{b.status}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-start gap-2">
                              <CalendarDays className="mt-0.5 h-4 w-4 text-gray-400" />
                              <div>
                                <p>{MONTHS.find((m) => m.value === b.booking_month)?.label} {b.booking_year}</p>
                                <p className="text-xs text-gray-500">
                                  {b.start_date ? new Date(b.start_date).toLocaleDateString('en-IN') : '-'} - {b.end_date ? new Date(b.end_date).toLocaleDateString('en-IN') : '-'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {b.assigned_at ? new Date(b.assigned_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
