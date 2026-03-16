import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  Building2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Button, Card, Input } from '@/components/ui';
import { routes } from '@/config/routes';
import { getStoredUser } from '@/lib/auth/session';
import { branchesApi, usersApi } from '@/lib/api';
import type { AdminUser, Branch, CreateAdminRequest } from '@/types';

interface AdminFormState {
  name: string;
  email: string;
  password: string;
  branch_id: string;
  real_name: string;
  personal_phone: string;
  employee_id: string;
  notes: string;
}

type AdminFormErrors = Partial<Record<keyof AdminFormState, string>>;

const initialFormState: AdminFormState = {
  name: '',
  email: '',
  password: '',
  branch_id: '',
  real_name: '',
  personal_phone: '',
  employee_id: '',
  notes: '',
};

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data;

    if (apiError && typeof apiError === 'object') {
      const message = 'error' in apiError ? apiError.error : 'message' in apiError ? apiError.message : null;

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

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function validateForm(formData: AdminFormState): AdminFormErrors {
  const errors: AdminFormErrors = {};

  if (!formData.name.trim()) {
    errors.name = 'Username is required';
  }

  if (!formData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!formData.branch_id) {
    errors.branch_id = 'Select a branch';
  }

  if (formData.personal_phone && !/^\d{10}$/.test(formData.personal_phone.trim())) {
    errors.personal_phone = 'Phone number must be 10 digits';
  }

  return errors;
}

export default function AdminManagementPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdminFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<AdminFormErrors>({});

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.is_active),
    [branches],
  );

  const branchCoverageCount = useMemo(() => {
    const coveredBranches = new Set(admins.filter((admin) => admin.is_active).map((admin) => admin.branch_id));
    return coveredBranches.size;
  }, [admins]);

  async function loadPageData() {
    setLoading(true);
    setPageError(null);

    try {
      const [adminList, branchList] = await Promise.all([
        usersApi.getAdmins(),
        branchesApi.getAll(),
      ]);

      setAdmins(adminList);
      setBranches(branchList);
    } catch (error) {
      setPageError(getApiErrorMessage(error, 'Failed to load admin management data.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    void loadPageData();
  }, [isSuperAdmin]);

  function updateField<K extends keyof AdminFormState>(field: K, value: AdminFormState[K]) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSubmitError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitError('Please fix the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    const payload: CreateAdminRequest = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      branch_id: Number(formData.branch_id),
      real_name: formData.real_name.trim() || undefined,
      personal_phone: formData.personal_phone.trim() || undefined,
      employee_id: formData.employee_id.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    try {
      const createdAdmin = await usersApi.createAdmin(payload);

      setAdmins((current) => [createdAdmin, ...current]);
      setFormData(initialFormState);
      setFormErrors({});
      setSuccessMessage(`Admin account created for ${createdAdmin.branch_name}.`);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Failed to create admin account.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentUser) {
    return <Navigate to={routes.login} replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-white via-purple-50 to-blue-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">
                Super Admin Controls
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Admin Management</h1>
              <p className="mt-2 max-w-3xl text-gray-600">
                Create branch admins, review coverage across branches, and keep access ownership
                organized from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="info">Superadmin Only</Badge>
              <Badge variant="default">{activeBranches.length} active branches</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-100">
            <p className="text-sm font-medium text-blue-700">Total Admin Accounts</p>
            <div className="mt-3 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <p className="text-3xl font-bold text-blue-900">{admins.length}</p>
            </div>
          </Card>

          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-100">
            <p className="text-sm font-medium text-emerald-700">Covered Branches</p>
            <div className="mt-3 flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
              <p className="text-3xl font-bold text-emerald-900">{branchCoverageCount}</p>
            </div>
            <p className="mt-2 text-sm text-emerald-700">
              {Math.max(activeBranches.length - branchCoverageCount, 0)} branches still need admin coverage.
            </p>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100">
            <p className="text-sm font-medium text-amber-700">Active Branches</p>
            <div className="mt-3 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-amber-600" />
              <p className="text-3xl font-bold text-amber-900">{activeBranches.length}</p>
            </div>
            <p className="mt-2 text-sm text-amber-700">
              Branch access comes from the live backend branch list.
            </p>
          </Card>
        </div>

        {pageError && (
          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-semibold">Unable to load admin data</p>
                  <p className="text-sm">{pageError}</p>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => void loadPageData()}>
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-12 text-gray-600">
              <Loader2 className="mr-3 h-7 w-7 animate-spin text-purple-600" />
              Loading admin management...
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.6fr]">
            <Card>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                  <UserPlus className="h-6 w-6 text-purple-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Branch Admin</h2>
                  <p className="text-sm text-gray-500">
                    Superadmin can create one or more branch-specific admin accounts.
                  </p>
                </div>
              </div>

              {activeBranches.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No active branches are available yet. Add branches first, then create admins.
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Username"
                      placeholder="branch_admin_1"
                      value={formData.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      error={formErrors.name}
                      required
                      fullWidth
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="admin1@library.com"
                      value={formData.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      error={formErrors.email}
                      required
                      fullWidth
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      error={formErrors.password}
                      required
                      fullWidth
                    />

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Branch
                        <span className="ml-1 text-red-500">*</span>
                      </label>
                      <select
                        value={formData.branch_id}
                        onChange={(event) => updateField('branch_id', event.target.value)}
                        className={`block w-full rounded-xl border-2 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 ${
                          formErrors.branch_id
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                            : 'border-gray-200 focus:border-purple-500 focus:ring-purple-500/10 hover:border-gray-300'
                        }`}
                        required
                      >
                        <option value="">Select a branch</option>
                        {activeBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name} ({branch.code})
                          </option>
                        ))}
                      </select>
                      {formErrors.branch_id && (
                        <p className="mt-1.5 text-sm text-red-600">{formErrors.branch_id}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Real Name"
                      placeholder="Priya Sharma"
                      value={formData.real_name}
                      onChange={(event) => updateField('real_name', event.target.value)}
                      fullWidth
                    />
                    <Input
                      label="Personal Phone"
                      placeholder="9876543210"
                      value={formData.personal_phone}
                      onChange={(event) => updateField('personal_phone', event.target.value)}
                      error={formErrors.personal_phone}
                      fullWidth
                    />
                  </div>

                  <Input
                    label="Employee ID"
                    placeholder="EMP-ADM-001"
                    value={formData.employee_id}
                    onChange={(event) => updateField('employee_id', event.target.value)}
                    fullWidth
                  />

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      rows={4}
                      placeholder="Optional context for this admin account"
                      className="block w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 hover:border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    />
                  </div>

                  {submitError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  {successMessage && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {successMessage}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                      New admin accounts inherit branch restrictions automatically after login.
                    </p>
                    <Button type="submit" isLoading={submitting}>
                      Create Admin
                    </Button>
                  </div>
                </form>
              )}
            </Card>

            <Card noPadding>
              <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Existing Admins</h2>
                  <p className="text-sm text-gray-500">
                    Review active branch assignments and admin account details.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={() => void loadPageData()}>
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>

              {admins.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  No admin accounts have been created yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Admin
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Branch
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {admins.map((admin) => (
                        <tr key={admin.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {admin.real_name || admin.name}
                              </p>
                              <p className="text-sm text-gray-600">{admin.email}</p>
                              <p className="text-xs text-gray-500">Username: {admin.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2">
                              <Building2 className="mt-0.5 h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {admin.branch_name}
                                </p>
                                <p className="text-xs text-gray-500">Branch ID: {admin.branch_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <p>{admin.personal_phone || 'Not provided'}</p>
                            <p className="text-xs text-gray-500">
                              {admin.employee_id || 'No employee ID'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={admin.is_active ? 'success' : 'warning'}>
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {formatDate(admin.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
