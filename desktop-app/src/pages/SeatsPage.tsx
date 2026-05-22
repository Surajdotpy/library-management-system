import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  AlertCircle,
  Armchair,
  CalendarDays,
  Loader2,
  RefreshCcw,
  Search,
  TicketCheck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Button, Card, Input } from '@/components/ui';
import { branchesApi, seatsApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth/session';
import type {
  Branch,
  CreateSeatBookingRequest,
  Seat,
  SeatAvailabilityStatus,
  SeatBooking,
  SeatEligibleStudent,
  SeatSection,
} from '@/types';

const MONTHS = [
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

const SECTION_FILTERS: Array<'all' | SeatSection> = ['all', 'general', 'ac', 'non_ac', 'silent_zone'];
const AVAILABILITY_FILTERS: Array<'all' | SeatAvailabilityStatus> = [
  'all',
  'available',
  'booked',
  'maintenance',
  'inactive',
];

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data && typeof data === 'object') {
      const message =
        'error' in data ? data.error : 'message' in data ? data.message : null;

      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function badgeVariantForAvailability(status: SeatAvailabilityStatus) {
  if (status === 'available') return 'success';
  if (status === 'booked') return 'info';
  if (status === 'maintenance') return 'warning';
  return 'danger';
}

function badgeVariantForBooking(status: SeatBooking['status']) {
  if (status === 'active') return 'success';
  if (status === 'reserved') return 'info';
  if (status === 'cancelled') return 'warning';
  if (status === 'released') return 'default';
  return 'danger';
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
  const [eligibleStudents, setEligibleStudents] = useState<SeatEligibleStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<'all' | SeatSection>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | SeatAvailabilityStatus>('all');
  const [form, setForm] = useState<CreateSeatBookingRequest>({
    seat_id: 0,
    student_id: 0,
    booking_month: now.getMonth() + 1,
    booking_year: now.getFullYear(),
    notes: '',
  });

  const effectiveBranchId = branchId === '' ? undefined : branchId;
  const canManageAssignments = !isSuperAdmin || branchId !== '';
  const branchName = branchId === ''
    ? 'All Branches'
    : branches.find((branch) => branch.id === branchId)?.name ?? 'My Branch';

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [branchData, seatData, bookingData, eligibleData] = await Promise.all([
        branchesApi.getAll(),
        seatsApi.getAll({ month, year, branch_id: effectiveBranchId }),
        seatsApi.getBookings({ month, year, branch_id: effectiveBranchId, limit: 50 }),
        canManageAssignments
          ? seatsApi.getEligibleStudents({ month, year, branch_id: effectiveBranchId })
          : Promise.resolve([]),
      ]);

      setBranches(branchData);
      setSeats(seatData);
      setBookings(bookingData);
      setEligibleStudents(eligibleData);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Failed to load seat management data.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [month, year, branchId]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      booking_month: month,
      booking_year: year,
      seat_id: 0,
      student_id: 0,
    }));
    setActionError(null);
    setSuccessMessage(null);
  }, [month, year, branchId]);

  const filteredSeats = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return seats.filter((seat) => {
      const matchesSection = sectionFilter === 'all' || seat.section === sectionFilter;
      const matchesAvailability =
        availabilityFilter === 'all' || seat.availability_status === availabilityFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        seat.seat_number.toLowerCase().includes(normalizedSearch) ||
        seat.booked_student_name?.toLowerCase().includes(normalizedSearch) ||
        seat.booked_student_code?.toLowerCase().includes(normalizedSearch);

      return matchesSection && matchesAvailability && matchesSearch;
    });
  }, [availabilityFilter, search, sectionFilter, seats]);

  const stats = useMemo(
    () =>
      seats.reduce(
        (accumulator, seat) => {
          accumulator.total += 1;
          accumulator[seat.availability_status] += 1;
          return accumulator;
        },
        { total: 0, available: 0, booked: 0, maintenance: 0, inactive: 0 },
      ),
    [seats],
  );

  const availableSeats = useMemo(
    () => seats.filter((seat) => seat.availability_status === 'available'),
    [seats],
  );

  async function handleCreateBooking() {
    if (!canManageAssignments) {
      setActionError('Select a branch first to create seat assignments.');
      return;
    }

    if (!form.seat_id || !form.student_id) {
      setActionError('Select both a seat and a student.');
      return;
    }

    setAssigning(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      await seatsApi.createBooking({
        seat_id: form.seat_id,
        student_id: form.student_id,
        booking_month: form.booking_month,
        booking_year: form.booking_year,
        notes: form.notes?.trim() || undefined,
      });

      setSuccessMessage('Seat booking created successfully.');
      setForm((current) => ({ ...current, seat_id: 0, student_id: 0, notes: '' }));
      await loadData();
    } catch (actionErrorValue) {
      setActionError(getApiErrorMessage(actionErrorValue, 'Failed to create seat booking.'));
    } finally {
      setAssigning(false);
    }
  }

  async function handleReleaseBooking(booking: SeatBooking) {
    setReleasingId(booking.id);
    setActionError(null);
    setSuccessMessage(null);

    try {
      await seatsApi.releaseBooking(booking.id, {
        release_reason:
          booking.status === 'reserved'
            ? 'Reservation cancelled from seats page'
            : 'Seat released from seats page',
      });

      setSuccessMessage(`Seat ${booking.seat_number} released successfully.`);
      await loadData();
    } catch (actionErrorValue) {
      setActionError(getApiErrorMessage(actionErrorValue, 'Failed to release seat booking.'));
    } finally {
      setReleasingId(null);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-100 bg-gradient-to-r from-white via-purple-50 to-blue-50 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">
                Monthly Seat Booking
              </p>
              <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold text-gray-900">
                <Armchair className="h-8 w-8 text-purple-600" />
                Seats and Bookings
              </h1>
              <p className="mt-2 text-gray-600">
                Manage seat inventory, assign monthly bookings, and release seats safely by branch.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge variant={isSuperAdmin ? 'info' : 'success'}>
                {isSuperAdmin ? 'Global Access' : 'Branch Restricted'}
              </Badge>
              <Button type="button" variant="secondary" onClick={() => void loadData()}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {isSuperAdmin && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Branch</label>
                <select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value ? Number(event.target.value) : '')}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Month</label>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              >
                {MONTHS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Year</label>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              >
                {[now.getFullYear(), now.getFullYear() + 1].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-gray-700">Current Scope</p>
              <p className="mt-1 font-bold text-gray-900">{branchName}</p>
              <p className="mt-1 text-sm text-gray-500">
                {MONTHS.find((option) => option.value === month)?.label} {year}
              </p>
            </div>
          </div>
        </motion.div>

        {loading && (
          <Card>
            <div className="flex items-center justify-center py-12 text-gray-600">
              <Loader2 className="mr-3 h-8 w-8 animate-spin text-purple-600" />
              Loading seats...
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="flex items-start gap-3 text-red-600">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Failed to load seat management</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {!loading && !error && (
          <>
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
                  <p className="text-3xl font-bold text-amber-900">
                    {stats.maintenance + stats.inactive}
                  </p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.45fr]">
              <Card>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                    <UserPlus className="h-6 w-6 text-purple-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Assign Seat</h2>
                    <p className="text-sm text-gray-500">
                      Create a booking for the selected month.
                    </p>
                  </div>
                </div>

                {!canManageAssignments && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Select a branch first to create seat assignments as superadmin.
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Seat</label>
                    <select
                      value={form.seat_id || ''}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          seat_id: event.target.value ? Number(event.target.value) : 0,
                        }))
                      }
                      disabled={!canManageAssignments || assigning}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    >
                      <option value="">Select available seat</option>
                      {availableSeats.map((seat) => (
                        <option key={seat.id} value={seat.id}>
                          {seat.seat_number} • {seat.section}
                        </option>
                      ))}
                    </select>
                    {canManageAssignments && availableSeats.length === 0 && (
                      <p className="mt-1.5 text-sm text-amber-700">
                        No available seats found for the selected branch and month.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Student</label>
                    <select
                      value={form.student_id || ''}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          student_id: event.target.value ? Number(event.target.value) : 0,
                        }))
                      }
                      disabled={!canManageAssignments || assigning}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    >
                      <option value="">Select eligible student</option>
                      {eligibleStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.student_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Notes"
                    placeholder="Optional booking note"
                    value={form.notes || ''}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    disabled={!canManageAssignments || assigning}
                    fullWidth
                  />

                  {actionError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {actionError}
                    </div>
                  )}

                  {successMessage && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {successMessage}
                    </div>
                  )}

                  <Button
                    type="button"
                    isLoading={assigning}
                    onClick={() => void handleCreateBooking()}
                    disabled={!canManageAssignments || assigning}
                    fullWidth
                  >
                    Create Seat Booking
                  </Button>
                </div>
              </Card>

              <Card noPadding>
                <div className="flex items-center justify-between border-b border-gray-100 p-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
                    <p className="text-sm text-gray-500">
                      Reservations and releases for the selected scope.
                    </p>
                  </div>
                  <Badge variant="info">{bookings.length}</Badge>
                </div>

                {bookings.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No bookings found yet.</div>
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
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="transition-colors hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900">{booking.seat_number}</p>
                              <p className="text-sm text-gray-500">
                                {booking.section}
                                {isSuperAdmin ? ` • ${booking.branch_name}` : ''}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900">{booking.student_name}</p>
                              <p className="text-sm text-gray-500">{booking.student_code}</p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={badgeVariantForBooking(booking.status)}>
                                {booking.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex items-start gap-2">
                                <CalendarDays className="mt-0.5 h-4 w-4 text-gray-400" />
                                <div>
                                  <p>
                                    {MONTHS.find((option) => option.value === booking.booking_month)?.label}{' '}
                                    {booking.booking_year}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDateTime(booking.assigned_at)}
                            </td>
                            <td className="px-6 py-4">
                              {booking.status === 'active' || booking.status === 'reserved' ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  isLoading={releasingId === booking.id}
                                  onClick={() => void handleReleaseBooking(booking)}
                                >
                                  Release
                                </Button>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  {booking.release_reason || 'Closed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <Card noPadding>
              <div className="border-b border-gray-100 p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Seat Inventory</h2>
                    <p className="text-sm text-gray-500">Live seat visibility for {branchName}.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="relative min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search seat or student..."
                        className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <select
                      value={sectionFilter}
                      onChange={(event) => setSectionFilter(event.target.value as 'all' | SeatSection)}
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {SECTION_FILTERS.map((option) => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All Sections' : option}
                        </option>
                      ))}
                    </select>

                    <select
                      value={availabilityFilter}
                      onChange={(event) =>
                        setAvailabilityFilter(event.target.value as 'all' | SeatAvailabilityStatus)
                      }
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {AVAILABILITY_FILTERS.map((option) => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All Statuses' : option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {filteredSeats.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No seats matched the filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Seat</th>
                        {isSuperAdmin && (
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Branch</th>
                        )}
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Section</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Availability</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSeats.map((seat) => (
                        <tr key={seat.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{seat.seat_number}</p>
                            <p className="text-sm text-gray-500">{seat.floor_name || 'Floor not set'}</p>
                          </td>
                          {isSuperAdmin && (
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {branches.find((branch) => branch.id === seat.branch_id)?.name ?? `Branch ${seat.branch_id}`}
                            </td>
                          )}
                          <td className="px-6 py-4 text-sm text-gray-700">{seat.section}</td>
                          <td className="px-6 py-4">
                            <Badge variant={badgeVariantForAvailability(seat.availability_status)}>
                              {seat.availability_status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {seat.booked_student_name ? (
                              <>
                                <p className="font-semibold text-gray-900">{seat.booked_student_name}</p>
                                <p className="text-sm text-gray-500">{seat.booked_student_code}</p>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">Open</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {seat.start_date ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-gray-400" />
                                  {formatDate(seat.start_date)} - {formatDate(seat.end_date)}
                                </div>
                                {seat.booking_status && (
                                  <p className="mt-1 text-xs text-gray-500">{seat.booking_status}</p>
                                )}
                              </div>
                            ) : (
                              'Open'
                            )}
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
