import { useState } from 'react';
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
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { AddStudentWizard } from '@/components/features/students/AddStudentWizard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, Badge } from '@/components/ui';
import { getBranchName } from '@/config/branches';
import { getStoredUser } from '@/lib/auth/session';
import { useStudents } from '@/lib/hooks/useStudents';
import { STUDY_PLANS } from '@/types';
import { EditStudentWizard } from '@/components/features/students/EditStudentWizard';
import type { Student } from '@/types';

export default function StudentsPage() {
  const { students, loading, error, createStudent, updateStudent, deleteStudent } = useStudents();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const branchScopeLabel = isSuperAdmin
    ? 'All Branches'
    : getBranchName(currentUser?.branch_id ?? null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);     
const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredStudents = students.filter((student) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      student.name.toLowerCase().includes(normalizedQuery) ||
      student.student_id.toLowerCase().includes(normalizedQuery) ||
      student.phone.includes(searchQuery);

    const matchesPlan = planFilter === 'all' || student.study_plan === planFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && student.is_active) ||
      (statusFilter === 'inactive' && !student.is_active);

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const activeStudentsCount = students.filter((student) => student.is_active).length;
  const inactiveStudentsCount = students.length - activeStudentsCount;
  const monthlyRevenue = students
    .filter((student) => student.is_active)
    .reduce((sum, student) => sum + student.monthly_fee, 0);

  const getPlanDetails = (planValue: string) =>
    STUDY_PLANS.find((plan) => plan.value === planValue);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `Delete ${name}?\n\nThis will remove the student record and related attendance/payment history.`,
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteStudent(id);

    if (!result.success) {
      window.alert(`Error: ${result.error}`);
    }
  };

  const handleEdit = (student: Student) => {
  setStudentToEdit(student);
  setIsEditModalOpen(true);
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
              <Users className="h-8 w-8 text-purple-600" />
              Students Management
            </h1>
            <p className="mt-1 text-gray-600">
              {loading
                ? 'Loading students...'
                : `Showing ${filteredStudents.length} of ${students.length} students | ${branchScopeLabel}`}
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
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
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

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-purple-600">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-purple-900">
                    INR {monthlyRevenue.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
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
                <option value="2_hours">2 Hours</option>
                <option value="4_hours">4 Hours</option>
                <option value="unlimited">Unlimited</option>
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

        {!loading && !error && filteredStudents.length === 0 && (
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

        {!loading && !error && filteredStudents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card noPadding>
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
                    {filteredStudents.map((student, index) => {
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
                            <div>
                              <p className="font-semibold text-gray-900">{student.name}</p>
                              <p className="text-sm font-medium text-purple-600">
                                {student.student_id}
                              </p>
                            </div>
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
                                className="rounded-lg p-2 text-purple-600 transition-colors hover:bg-purple-50"
                                title="Edit Student"
                                onClick={() => window.alert('Edit feature coming soon.')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(student.id, student.name)}
                                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                title="Delete Student"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span>{' '}
                    of <span className="font-semibold text-gray-900">{students.length}</span>{' '}
                    students
                  </div>
                  <div className="flex gap-6">
                    <span>
                      Active: <span className="font-semibold text-green-600">{activeStudentsCount}</span>
                    </span>
                    <span>
                      Inactive:{' '}
                      <span className="font-semibold text-red-600">{inactiveStudentsCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      <AddStudentWizard
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={createStudent}
        branchId={currentUser?.branch_id ?? null}
        userRole={currentUser?.role ?? 'admin'}
      />
    </MainLayout>
  );
}
