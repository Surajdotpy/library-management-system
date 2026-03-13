import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, Badge } from '@/components/ui';
import { AddStudentModal } from '@/components/features/students/AddStudentModal';
import { useStudents } from '@/lib/hooks/useStudents';
import { Users, Plus, Search, Loader2, AlertCircle, Phone, Mail, Trash2, Edit, Calendar, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { STUDY_PLANS } from '@/types';

export default function StudentsPage() {
  const { students, loading, error, createStudent, deleteStudent } = useStudents();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get current user
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = currentUser?.role === 'superadmin';

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phone.includes(searchQuery);

    const matchesPlan = planFilter === 'all' || student.study_plan === planFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && student.is_active) ||
      (statusFilter === 'inactive' && !student.is_active);

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Get plan details
  const getPlanDetails = (planValue: string) => {
    return STUDY_PLANS.find(p => p.value === planValue);
  };

  // Get branch name (you'll need to add this to your student type or fetch separately)
  const getBranchName = (branchId: number) => {
    const branches: { [key: number]: string } = {
      1: 'Bareilly Main',
      2: 'Bareilly East',
      3: 'Bareilly West',
      4: 'Bareilly North',
    };
    return branches[branchId] || `Branch ${branchId}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle delete with confirmation
  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?\n\nThis will permanently remove:\n• Student record\n• All attendance history\n• All payment records\n\nThis action CANNOT be undone!`)) {
      const result = await deleteStudent(id);
      if (!result.success) {
        alert('Error: ' + result.error);
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              Students Management
            </h1>
            <p className="text-gray-600 mt-1">
              {loading ? 'Loading...' : (
                <>
                  Showing {filteredStudents.length} of {students.length} students
                  {isSuperAdmin && ' (All Branches)'}
                </>
              )}
            </p>
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </button>
        </motion.div>


        {/* Quick Stats */}
{!loading && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="grid grid-cols-1 md:grid-cols-4 gap-4"
  >
    {/* Total Students */}
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600 mb-1">Total Students</p>
          <p className="text-3xl font-bold text-blue-900">{students.length}</p>
        </div>
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>

    {/* Active Students */}
    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-600 mb-1">Active Students</p>
          <p className="text-3xl font-bold text-green-900">
            {students.filter(s => s.is_active).length}
          </p>
        </div>
        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>

    {/* Monthly Revenue */}
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-purple-600 mb-1">Monthly Revenue</p>
          <p className="text-3xl font-bold text-purple-900">
            ₹{students.filter(s => s.is_active).reduce((sum, s) => sum + s.monthly_fee, 0).toLocaleString()}
          </p>
        </div>
        <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>

    {/* Inactive Students */}
    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-600 mb-1">Inactive</p>
          <p className="text-3xl font-bold text-red-900">
            {students.filter(s => !s.is_active).length}
          </p>
        </div>
        <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  </motion.div>
)};

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Plans</option>
                <option value="2_hours">2 Hours</option>
                <option value="4_hours">4 Hours</option>
                <option value="unlimited">Unlimited</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </Card>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <Card>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading students...</span>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading students</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filteredStudents.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {students.length === 0 ? 'No students yet' : 'No students found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {students.length === 0 
                  ? 'Get started by adding your first student to Coffee aur Kitaab'
                  : 'Try adjusting your search or filters'
                }
              </p>
              {students.length === 0 && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                >
                  Add First Student
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Students Table */}
        {!loading && !error && filteredStudents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card noPadding>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                      {isSuperAdmin && (
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Branch</th>
                      )}
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan & Fee</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Joined</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
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
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* Student Info */}
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{student.name}</p>
                              <p className="text-sm text-purple-600 font-medium">{student.student_id}</p>
                            </div>
                          </td>

                          {/* Branch (SuperAdmin only) */}
                          {isSuperAdmin && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                {getBranchName(student.branch_id)}
                              </div>
                            </td>
                          )}

                          {/* Contact */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4" />
                                {student.phone}
                              </div>
                              {student.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  <span className="truncate max-w-[200px]">{student.email}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Plan & Fee */}
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{plan?.label || student.study_plan}</p>
                              <p className="text-sm text-purple-600 font-bold">₹{student.monthly_fee}/month</p>
                            </div>
                          </td>

                          {/* Joined Date */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {formatDate(student.created_at)}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <Badge variant={student.is_active ? 'success' : 'danger'}>
                              {student.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Edit Student"
                                onClick={() => alert('Edit feature coming soon!')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(student.id, student.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Student"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Stats */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{' '}
                    <span className="font-semibold text-gray-900">{students.length}</span> students
                  </div>
                  <div className="flex gap-6">
                    <span>Active: <span className="font-semibold text-green-600">{students.filter(s => s.is_active).length}</span></span>
                    <span>Inactive: <span className="font-semibold text-red-600">{students.filter(s => !s.is_active).length}</span></span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={createStudent}
      />
    </MainLayout>
  );
}

