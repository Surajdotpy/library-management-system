import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckSquare,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  RefreshCcw,
  Search,
  Users,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Button, Card, Input } from '@/components/ui';
import { getBranchName } from '@/config/branches';
import { getStoredUser } from '@/lib/auth/session';
import { attendanceApi, studentsApi } from '@/lib/api';
import type {
  MarkEntryRequest,
  MarkExitRequest,
  Student,
  TodayAttendanceSummary,
  TodayAttendanceStudent,
} from '@/types';

type AttendanceAction = 'entry' | 'exit';

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) {
    return '< 1m';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function createEmptySummary(): TodayAttendanceSummary {
  return {
    date: new Date().toISOString(),
    total_entries: 0,
    currently_inside: 0,
    total_exits: 0,
    students_inside: [],
  };
}

export default function AttendancePage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const branchLabel = isSuperAdmin
    ? 'All Branches'
    : getBranchName(currentUser?.branch_id ?? null);

  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<TodayAttendanceSummary>(createEmptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<AttendanceAction>('entry');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [studentData, todaySummary] = await Promise.all([
        studentsApi.getAll(),
        attendanceApi.getToday(),
      ]);

      setStudents(studentData);
      setSummary(todaySummary);
    } catch (err: any) {
      console.error('Failed to load attendance page data.', err);
      setError(err.response?.data?.error || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const insideStudentIds = useMemo(
    () => new Set(summary.students_inside.map((student) => student.student_id)),
    [summary.students_inside],
  );

  const activeStudents = useMemo(
    () => students.filter((student) => student.is_active),
    [students],
  );

  const entryCandidates = useMemo(
    () => activeStudents.filter((student) => !insideStudentIds.has(student.id)),
    [activeStudents, insideStudentIds],
  );

  const exitCandidates = useMemo(
    () => summary.students_inside,
    [summary.students_inside],
  );

  const currentCandidates = actionType === 'entry' ? entryCandidates : exitCandidates;

  useEffect(() => {
    if (currentCandidates.length === 0) {
      setSelectedStudentId(null);
      return;
    }

    const hasSelection = currentCandidates.some((student) => student.student_id === selectedStudentId || ('id' in student && student.id === selectedStudentId));

    if (!hasSelection) {
      const nextStudentId =
        actionType === 'entry'
          ? (currentCandidates[0] as Student).id
          : (currentCandidates[0] as TodayAttendanceStudent).student_id;
      setSelectedStudentId(nextStudentId);
    }
  }, [actionType, currentCandidates, selectedStudentId]);

  const filteredInsideStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return summary.students_inside;
    }

    return summary.students_inside.filter(
      (student) =>
        student.student_name.toLowerCase().includes(normalizedQuery) ||
        student.student_code.toLowerCase().includes(normalizedQuery),
    );
  }, [searchQuery, summary.students_inside]);

  const nearLimitCount = useMemo(
    () => summary.students_inside.filter((student) => student.is_near_limit).length,
    [summary.students_inside],
  );

  const overtimeCount = useMemo(
    () => summary.students_inside.filter((student) => student.is_overtime).length,
    [summary.students_inside],
  );

  const handleAction = async (
    nextAction: AttendanceAction,
    studentIdOverride?: number,
  ) => {
    const studentId = studentIdOverride ?? selectedStudentId;

    if (!studentId) {
      setActionError('Select a student first.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload: MarkEntryRequest | MarkExitRequest = {
        student_id: studentId,
        notes: notes.trim() || undefined,
      };

      if (nextAction === 'entry') {
        await attendanceApi.markEntry(payload as MarkEntryRequest);
      } else {
        await attendanceApi.markExit(payload as MarkExitRequest);
      }

      setNotes('');
      setActionSuccess(
        nextAction === 'entry'
          ? 'Student entry marked successfully.'
          : 'Student exit marked successfully.',
      );

      await fetchAttendanceData();
      setActionType(nextAction);
    } catch (err: any) {
      console.error('Failed to update attendance.', err);
      setActionError(err.response?.data?.error || 'Failed to update attendance');
    } finally {
      setActionLoading(false);
    }
  };

  const todayDateLabel = new Date(summary.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

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
              <CheckSquare className="h-8 w-8 text-green-600" />
              Attendance Management
            </h1>
            <p className="mt-1 text-gray-600">
              Track student check-ins, check-outs, and plan-limit warnings for {branchLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={isSuperAdmin ? 'info' : 'success'}>
              {isSuperAdmin ? 'Global View' : 'Branch View'}
            </Badge>
            <Button
              type="button"
              variant="secondary"
              onClick={fetchAttendanceData}
              disabled={loading || actionLoading}
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
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-3 text-gray-600">Loading attendance...</span>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Failed to load attendance</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={fetchAttendanceData}
                disabled={loading}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-100">
                <p className="text-sm font-medium text-green-700">Currently Inside</p>
                <p className="mt-2 text-3xl font-bold text-green-900">
                  {summary.currently_inside}
                </p>
                <p className="mt-1 text-sm text-green-700">Live now</p>
              </Card>

              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100">
                <p className="text-sm font-medium text-amber-700">Near Limit</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {nearLimitCount}
                </p>
                <p className="mt-1 text-sm text-amber-700">15 minutes or less left</p>
              </Card>

              <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-100">
                <p className="text-sm font-medium text-rose-700">Over Limit</p>
                <p className="mt-2 text-3xl font-bold text-rose-900">
                  {overtimeCount}
                </p>
                <p className="mt-1 text-sm text-rose-700">Needs action now</p>
              </Card>

              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-sky-100">
                <p className="text-sm font-medium text-blue-700">Today's Entries</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">
                  {summary.total_entries}
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  Exits: {summary.total_exits} | {todayDateLabel}
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card>
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Quick Attendance</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Mark entry or exit for a student
                      </p>
                    </div>
                    <Badge variant="default">{todayDateLabel}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('entry');
                        setActionError(null);
                        setActionSuccess(null);
                      }}
                      className={[
                        'rounded-xl border px-4 py-3 text-left transition-all',
                        actionType === 'entry'
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50/60',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <LogIn className="h-4 w-4" />
                        Mark Entry
                      </div>
                      <p className="mt-1 text-xs">
                        {entryCandidates.length} available
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionType('exit');
                        setActionError(null);
                        setActionSuccess(null);
                      }}
                      className={[
                        'rounded-xl border px-4 py-3 text-left transition-all',
                        actionType === 'exit'
                          ? 'border-rose-500 bg-rose-50 text-rose-800'
                          : 'border-gray-200 text-gray-600 hover:border-rose-300 hover:bg-rose-50/60',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <LogOut className="h-4 w-4" />
                        Mark Exit
                      </div>
                      <p className="mt-1 text-xs">
                        {exitCandidates.length} inside now
                      </p>
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Select Student
                      </label>
                      <select
                        value={selectedStudentId ?? ''}
                        onChange={(event) =>
                          setSelectedStudentId(
                            event.target.value ? Number(event.target.value) : null,
                          )
                        }
                        disabled={actionLoading || currentCandidates.length === 0}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/10 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">
                          {currentCandidates.length === 0
                            ? actionType === 'entry'
                              ? 'No students available for entry'
                              : 'No students available for exit'
                            : 'Choose a student'}
                        </option>
                        {actionType === 'entry'
                          ? entryCandidates.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.name} ({student.student_id})
                              </option>
                            ))
                          : exitCandidates.map((student) => (
                              <option key={student.student_id} value={student.student_id}>
                                {student.student_name} ({student.student_code})
                              </option>
                            ))}
                      </select>
                    </div>

                    <Input
                      label="Notes"
                      placeholder="Optional attendance note"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      helperText="Optional"
                      fullWidth
                      disabled={actionLoading}
                    />

                    {actionError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {actionError}
                      </div>
                    )}

                    {actionSuccess && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        {actionSuccess}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant={actionType === 'entry' ? 'success' : 'danger'}
                      onClick={() => handleAction(actionType)}
                      isLoading={actionLoading}
                      disabled={!selectedStudentId || actionLoading || currentCandidates.length === 0}
                      fullWidth
                    >
                      {actionType === 'entry' ? 'Mark Entry' : 'Mark Exit'}
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Students Inside Now</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {summary.currently_inside} student{summary.currently_inside === 1 ? '' : 's'} currently checked in
                        </p>
                      </div>

                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name or ID..."
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredInsideStudents.length === 0 ? (
                    <div className="p-10 text-center">
                      <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="font-semibold text-gray-900">
                        {summary.students_inside.length === 0
                          ? 'No students are currently inside'
                          : 'No students matched your search'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {summary.students_inside.length === 0
                          ? 'Students who mark entry will appear here.'
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
                              Plan
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Entry Time
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Live Duration
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Remaining
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredInsideStudents.map((student, index) => (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {student.student_name}
                                  </p>
                                  <p className="text-sm text-gray-500">{student.student_code}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {student.study_plan.replace('_', ' ')}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {formatDateTime(student.entry_time)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatDuration(student.current_duration_minutes)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={[
                                    'text-sm font-medium',
                                    student.allowed_minutes == null
                                      ? 'text-gray-600'
                                      : student.is_overtime
                                        ? 'text-red-600'
                                        : student.is_near_limit
                                          ? 'text-amber-700'
                                          : 'text-green-700',
                                  ].join(' ')}
                                >
                                  {student.allowed_minutes == null
                                    ? 'Unlimited'
                                    : student.is_overtime
                                      ? `Over by ${formatDuration(student.overtime_minutes)}`
                                      : `Left ${formatDuration(student.remaining_minutes ?? 0)}`}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <Badge
                                  variant={
                                    student.is_overtime
                                      ? 'danger'
                                      : student.is_near_limit
                                        ? 'warning'
                                        : 'success'
                                  }
                                >
                                  {student.is_overtime
                                    ? 'Over Limit'
                                    : student.is_near_limit
                                      ? 'Near Limit'
                                      : 'Inside'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => handleAction('exit', student.student_id)}
                                  disabled={actionLoading}
                                  className="font-medium text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Mark Exit
                                </button>
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
