import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Calendar,
  Edit,
  Loader2,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AddStudentWizard } from '@/components/features/students/AddStudentWizard';
import { EditStudentWizard } from '@/components/features/students/EditStudentWizard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, Badge } from '@/components/ui';
import { getBranchName } from '@/config/branches';
import { getStoredUser } from '@/lib/auth/session';
import { useStudents } from '@/lib/hooks/useStudents';
import { STUDY_PLANS } from '@/types';
import type { Student } from '@/types';

function formatOptionalValue(value: string | number | null | undefined): string {
  if (value == null) {
    return 'Not provided';
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : 'Not provided';
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Not provided';
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface StudentsPageLocationState {
  openStudentId?: number;
  quickSearchQuery?: string;
}

export default function StudentsPage() {
  const {
    students,
    loading,
    error,
    createStudent,
    updateStudent,
    deleteStudent,
    reactivateStudent,
  } = useStudents();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const branchScopeLabel = isSuperAdmin
    ? 'All Branches'
    : getBranchName(currentUser?.branch_id ?? null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToView, setStudentToView] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const matchingStudents = students.filter((student) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      student.name.toLowerCase().includes(normalizedQuery) ||
      student.student_id.toLowerCase().includes(normalizedQuery) ||
      student.phone.includes(searchQuery);

    const matchesPlan = planFilter === 'all' || student.study_plan === planFilter;

    return matchesSearch && matchesPlan;
  });

  const activeStudents = matchingStudents.filter((student) => student.is_active);
  const inactiveStudents = matchingStudents.filter((student) => !student.is_active);
  const displayedActiveStudents =
    statusFilter === 'inactive' ? [] : activeStudents;
  const displayedInactiveStudents =
    statusFilter === 'active' ? [] : inactiveStudents;
  const visibleStudentsCount =
    displayedActiveStudents.length + displayedInactiveStudents.length;

  const activeStudentsCount = students.filter((student) => student.is_active).length;
  const inactiveStudentsCount = students.length - activeStudentsCount;
  const getPlanDetails = (planValue: string) =>
    STUDY_PLANS.find((plan) => plan.value === planValue);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const handleEdit = (student: Student) => {
    setStudentToEdit(student);
    setIsEditModalOpen(true);
  };

  const handleViewStudent = (student: Student) => {
    setStudentToView(student);
  };

  const handleCloseStudentDetails = () => {
    setStudentToView(null);
  };

  useEffect(() => {
    const state = location.state as StudentsPageLocationState | null;

    if (!state?.openStudentId || students.length === 0) {
      return;
    }

    const matchedStudent = students.find((student) => student.id === state.openStudentId);

    if (!matchedStudent) {
      return;
    }

    setStatusFilter('all');
    setSearchQuery(state.quickSearchQuery || matchedStudent.name);
    setStudentToView(matchedStudent);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, students]);

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `Mark ${name} as inactive?\n\nThe student will stay in records, but attendance, seat, and payment actions will stop for this student.`,
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteStudent(id);

    if (result.success) {
      setStatusFilter('all');
      setFeedbackMessage({
        type: 'success',
        text: `${name} is now inactive. Their existing history is still preserved in the system.`,
      });
      return;
    }

    setFeedbackMessage({
      type: 'error',
      text: result.error || 'Failed to update the student status.',
    });
  };

  const handleReactivate = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `Reactivate ${name}?\n\nThis will make the student active again for attendance, payments, and seat assignment.`,
    );

    if (!confirmed) {
      return;
    }

    const result = await reactivateStudent(id);

    if (result.success) {
      setStatusFilter('all');
      setFeedbackMessage({
        type: 'success',
        text: `${name} is active again and is available for normal library operations.`,
      });
      return;
    }

    setFeedbackMessage({
      type: 'error',
      text: result.error || 'Failed to reactivate the student.',
    });
  };

  const renderStudentsTable = (
    sectionStudents: Student[],
    options: {
      title: string;
      description: string;
      badgeVariant: 'success' | 'danger';
      badgeLabel: string;
      emptyStateTitle: string;
      emptyStateDescription: string;
    },
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card noPadding>
        <div className="border-b border-gray-200 bg-gray-50/80 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{options.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{options.description}</p>
            </div>
            <Badge variant={options.badgeVariant}>{options.badgeLabel}</Badge>
          </div>
        </div>

        {sectionStudents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h4 className="text-base font-semibold text-gray-900">
              {options.emptyStateTitle}
            </h4>
            <p className="mt-2 text-sm text-gray-600">
              {options.emptyStateDescription}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Student
                    </th>
                    {isSuperAdmin && (
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Branch
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Plan and Fee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Joined
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
                  {sectionStudents.map((student, index) => {
                    const plan = getPlanDetails(student.study_plan);

                    return (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleViewStudent(student)}
                            className="rounded-lg text-left transition-colors hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                            title="View full student details"
                          >
                            <p className="font-semibold text-gray-900">{student.name}</p>
                            <p className="text-sm font-medium text-purple-600">
                              {student.student_id}
                            </p>
                            <p className="mt-1 text-xs font-medium text-gray-500">
                              Click to view full profile
                            </p>
                          </button>
                        </td>

                        {isSuperAdmin && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              {getBranchName(student.branch_id)}
                            </div>
                          </td>
                        )}

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              {student.phone}
                            </div>
                            {student.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="h-4 w-4" />
                                <span className="max-w-[200px] truncate">{student.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {plan?.label || student.study_plan}
                            </p>
                            <p className="text-sm font-bold text-purple-600">
                              INR {student.monthly_fee}/month
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {formatDate(student.created_at)}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={student.is_active ? 'success' : 'danger'}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-40 disabled:hover:bg-transparent"
                              title={
                                student.is_active
                                  ? 'Edit Student'
                                  : 'Inactive students cannot be edited'
                              }
                              onClick={() => handleEdit(student)}
                              disabled={!student.is_active}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(student.id, student.name)}
                              className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
                              title={
                                student.is_active
                                  ? 'Mark Student Inactive'
                                  : 'Student is already inactive'
                              }
                              disabled={!student.is_active}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {!student.is_active && (
                              <button
                                type="button"
                                onClick={() => handleReactivate(student.id, student.name)}
                                className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50"
                                title="Reactivate Student"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{sectionStudents.length}</span>{' '}
              student{sectionStudents.length === 1 ? '' : 's'} in this section
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );

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
              <Users className="h-8 w-8 text-purple-600" />
              Students Management
            </h1>
            <p className="mt-1 text-gray-600">
              {loading
                ? 'Loading students...'
                : `Showing ${visibleStudentsCount} of ${students.length} students | ${branchScopeLabel}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Add Student
          </button>
        </motion.div>

        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-blue-600">Total Students</p>
                  <p className="text-3xl font-bold text-blue-900">{students.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-green-600">Active Students</p>
                  <p className="text-3xl font-bold text-green-900">{activeStudentsCount}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-red-600">Inactive</p>
                  <p className="text-3xl font-bold text-red-900">{inactiveStudentsCount}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {feedbackMessage && (
          <Card
            className={
              feedbackMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={
                    feedbackMessage.type === 'success'
                      ? 'font-semibold text-emerald-800'
                      : 'font-semibold text-red-800'
                  }
                >
                  {feedbackMessage.type === 'success'
                    ? 'Student status updated'
                    : 'Action failed'}
                </p>
                <p
                  className={
                    feedbackMessage.type === 'success'
                      ? 'mt-1 text-sm text-emerald-700'
                      : 'mt-1 text-sm text-red-700'
                  }
                >
                  {feedbackMessage.text}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-white/70 hover:text-gray-900"
              >
                Dismiss
              </button>
            </div>
          </Card>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Deleting a student is a soft delete.
              The record moves to <span className="font-semibold">Inactive</span> so old
              attendance and payment history stay safe.
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or phone..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <select
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Plans</option>
                {STUDY_PLANS.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </Card>
        </motion.div>

        {loading && (
          <Card>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Loading students...</span>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Error loading students</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {!loading && !error && visibleStudentsCount === 0 && (
          <Card>
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {students.length === 0 ? 'No students yet' : 'No students found'}
              </h3>
              <p className="mb-6 text-gray-600">
                {students.length === 0
                  ? 'Get started by adding your first student.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {students.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  Add First Student
                </button>
              )}
            </div>
          </Card>
        )}

        {!loading && !error && visibleStudentsCount > 0 && (
          <div className="space-y-6">
            {statusFilter !== 'inactive' &&
              renderStudentsTable(displayedActiveStudents, {
                title: 'Active Students',
                description:
                  'Students currently available for attendance, payments, and seat assignment.',
                badgeVariant: 'success',
                badgeLabel: `${displayedActiveStudents.length} active`,
                emptyStateTitle: 'No active students in this view',
                emptyStateDescription:
                  'Try changing the search or filters, or reactivate a student from the inactive section.',
              })}

            {statusFilter !== 'active' &&
              renderStudentsTable(displayedInactiveStudents, {
                title: 'Inactive Students',
                description:
                  'These records are preserved for history and can be reactivated whenever needed.',
                badgeVariant: 'danger',
                badgeLabel: `${displayedInactiveStudents.length} inactive`,
                emptyStateTitle: 'No inactive students in this view',
                emptyStateDescription:
                  'Inactive students will appear here after a soft delete, and you can restore them from this section.',
              })}
          </div>
        )}
      </div>

      {studentToView && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseStudentDetails}
          />

          <div className="flex min-h-screen items-center justify-center px-4 py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl"
            >
              <div className="rounded-t-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                      Student Profile
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-white">
                      {studentToView.name}
                    </h2>
                    <p className="mt-2 text-sm text-white/80">
                      {studentToView.student_id} | {getBranchName(studentToView.branch_id)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={studentToView.is_active ? 'success' : 'danger'}>
                      {studentToView.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      type="button"
                      onClick={handleCloseStudentDetails}
                      className="rounded-lg p-2 text-white transition-colors hover:bg-white/20"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card className="border-blue-100 bg-blue-50/70">
                    <p className="text-sm font-medium text-blue-700">Study Plan</p>
                    <p className="mt-2 text-lg font-bold text-blue-950">
                      {getPlanDetails(studentToView.study_plan)?.label ||
                        formatLabel(studentToView.study_plan)}
                    </p>
                    <p className="mt-1 text-sm text-blue-800">
                      INR {studentToView.monthly_fee.toLocaleString('en-IN')}/month
                    </p>
                  </Card>

                  <Card className="border-emerald-100 bg-emerald-50/70">
                    <p className="text-sm font-medium text-emerald-700">Seat Number</p>
                    <p className="mt-2 text-lg font-bold text-emerald-950">
                      {formatOptionalValue(studentToView.seat_number)}
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Joined {formatDate(studentToView.created_at)}
                    </p>
                  </Card>

                  <Card className="border-amber-100 bg-amber-50/70">
                    <p className="text-sm font-medium text-amber-700">Last Updated</p>
                    <p className="mt-2 text-lg font-bold text-amber-950">
                      {formatDate(studentToView.updated_at)}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      Branch {getBranchName(studentToView.branch_id)}
                    </p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900">Basic Details</h3>
                    <div className="mt-4 space-y-3 text-sm text-gray-700">
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Full Name</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.name}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Student ID</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.student_id}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Date of Birth</span>
                        <span className="text-right font-semibold text-gray-900">
                          {formatDate(studentToView.date_of_birth)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Gender</span>
                        <span className="text-right font-semibold text-gray-900">
                          {formatLabel(studentToView.gender)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-gray-500">Blood Group</span>
                        <span className="text-right font-semibold text-gray-900">
                          {formatOptionalValue(studentToView.blood_group)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>
                    <div className="mt-4 space-y-3 text-sm text-gray-700">
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Phone</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.phone}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Email</span>
                        <span className="text-right font-semibold text-gray-900">
                          {formatOptionalValue(studentToView.email)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Address</span>
                        <span className="max-w-[18rem] text-right font-semibold text-gray-900">
                          {studentToView.address}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">City</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.city}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">State</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.state}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-gray-500">Pincode</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.pincode}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                    <div className="mt-4 space-y-3 text-sm text-gray-700">
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Contact Name</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.emergency_contact_name}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">Phone</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.emergency_contact_phone}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-gray-500">Relation</span>
                        <span className="text-right font-semibold text-gray-900">
                          {studentToView.emergency_contact_relation}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900">Identity and Notes</h3>
                    <div className="mt-4 space-y-3 text-sm text-gray-700">
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">ID Proof Type</span>
                        <span className="text-right font-semibold text-gray-900">
                          {formatOptionalValue(studentToView.id_proof_type)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                        <span className="font-medium text-gray-500">ID Proof Number</span>
                        <span className="text-right font-semibold text-gray-900">
                          {formatOptionalValue(studentToView.id_proof_number)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <span className="block font-medium text-gray-500">Notes</span>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-800">
                          {formatOptionalValue(studentToView.notes)}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      <AddStudentWizard
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={createStudent}
        branchId={currentUser?.branch_id ?? null}
        userRole={currentUser?.role ?? 'admin'}
      />

      <EditStudentWizard
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={updateStudent}
        student={studentToEdit}
        userRole={currentUser?.role ?? 'admin'}
      />
    </MainLayout>
  );
}
