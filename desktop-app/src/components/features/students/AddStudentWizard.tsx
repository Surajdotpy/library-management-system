import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Phone as PhoneIcon,
  User,
  X,
} from 'lucide-react';
import { BRANCH_OPTIONS, getBranchName, isKnownBranchId } from '@/config/branches';
import { INDIAN_STATE_OPTIONS } from '@/config/indianStates';
import { Button, Input } from '@/components/ui';
import { STUDY_PLANS, type CreateStudentRequest, type User as AppUser } from '@/types';

interface AddStudentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStudentRequest) => Promise<{ success: boolean; error?: string }>;
  branchId?: number | null;
  userRole: AppUser['role'];
}

type SelectableBranchId = number | '';

type FormValues = Omit<
  CreateStudentRequest,
  'branch_id' | 'email' | 'blood_group' | 'id_proof_type' | 'id_proof_number' | 'notes'
> & {
  branch_id: SelectableBranchId;
  email: string;
  blood_group: string;
  id_proof_type: string;
  id_proof_number: string;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const TOTAL_STEPS = 3;

function createInitialFormValues(
  assignedBranchId: number | null | undefined,
  userRole: AppUser['role'],
): FormValues {
  return {
    branch_id: userRole === 'superadmin' ? assignedBranchId ?? '' : assignedBranchId ?? '',
    name: '',
    phone: '',
    email: '',
    study_plan: '1_hour',
    date_of_birth: '',
    gender: 'male',
    blood_group: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Father',
    id_proof_type: '',
    id_proof_number: '',
    notes: '',
  };
}

const STEP_ITEMS = [
  { number: 1, title: 'Basic Info', icon: User },
  { number: 2, title: 'Personal Details', icon: FileText },
  { number: 3, title: 'Emergency Contact', icon: PhoneIcon },
] as const;

const RELATIONSHIP_OPTIONS = [
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Guardian',
  'Spouse',
  'Other',
] as const;

const ID_PROOF_OPTIONS = [
  'Aadhar',
  'PAN',
  'Voter ID',
  'Passport',
  'Driving License',
  'Student ID',
] as const;

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isFixedLengthNumeric(value: string, length: number): boolean {
  return new RegExp(`^\\d{${length}}$`).test(value);
}

function resolveSelectedBranchId(
  values: FormValues,
  assignedBranchId: number | null | undefined,
  userRole: AppUser['role'],
): number | null {
  if (userRole === 'superadmin') {
    return typeof values.branch_id === 'number' ? values.branch_id : null;
  }

  return assignedBranchId ?? null;
}

function validateStep(
  step: number,
  values: FormValues,
  assignedBranchId: number | null | undefined,
  userRole: AppUser['role'],
): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 1) {
    const selectedBranchId = resolveSelectedBranchId(values, assignedBranchId, userRole);

    if (!selectedBranchId) {
      errors.branch_id =
        userRole === 'superadmin'
          ? 'Select a branch for this student.'
          : 'Assign a branch to this admin account before adding students.';
    }

    if (!values.name.trim()) {
      errors.name = 'Student name is required.';
    }

    if (!isFixedLengthNumeric(values.phone, 10)) {
      errors.phone = 'Enter a valid 10-digit phone number.';
    }

    if (values.email.trim() && !isValidEmail(values.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
  }

  if (step === 2) {
    if (!values.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required.';
    }

    if (!values.address.trim()) {
      errors.address = 'Address is required.';
    }

    if (!values.city.trim()) {
      errors.city = 'City is required.';
    }

    if (!values.state.trim()) {
      errors.state = 'State is required.';
    }

    if (!isFixedLengthNumeric(values.pincode, 6)) {
      errors.pincode = 'Enter a valid 6-digit PIN code.';
    }
  }

  if (step === 3) {
    if (!values.emergency_contact_name.trim()) {
      errors.emergency_contact_name = 'Emergency contact name is required.';
    }

    if (!isFixedLengthNumeric(values.emergency_contact_phone, 10)) {
      errors.emergency_contact_phone = 'Enter a valid 10-digit emergency phone number.';
    }

    if (!values.emergency_contact_relation.trim()) {
      errors.emergency_contact_relation = 'Relationship is required.';
    }

    if (values.id_proof_number.trim()) {
      if (!values.id_proof_type.trim()) {
        errors.id_proof_type = 'Select an ID proof type.';
      } else if (
        values.id_proof_type === 'Aadhar' &&
        !isFixedLengthNumeric(values.id_proof_number, 12)
      ) {
        errors.id_proof_number = 'Aadhar number must be 12 digits.';
      } else if (
        values.id_proof_type !== 'Aadhar' &&
        values.id_proof_number.trim().length < 4
      ) {
        errors.id_proof_number = 'ID proof number looks too short.';
      }
    }
  }

  return errors;
}

function buildStudentPayload(values: FormValues, branchId: number): CreateStudentRequest {
  const email = values.email.trim();
  const bloodGroup = values.blood_group.trim();
  const idProofNumber = values.id_proof_number.trim();
  const notes = values.notes.trim();

  return {
    name: values.name.trim(),
    phone: values.phone,
    email: email || undefined,
    branch_id: branchId,
    study_plan: values.study_plan,
    date_of_birth: values.date_of_birth,
    gender: values.gender,
    blood_group: bloodGroup || undefined,
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode,
    emergency_contact_name: values.emergency_contact_name.trim(),
    emergency_contact_phone: values.emergency_contact_phone,
    emergency_contact_relation: values.emergency_contact_relation.trim(),
    id_proof_type: idProofNumber ? values.id_proof_type : undefined,
    id_proof_number: idProofNumber || undefined,
    notes: notes || undefined,
  };
}

export function AddStudentWizard({
  isOpen,
  onClose,
  onSubmit,
  branchId,
  userRole,
}: AddStudentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<FormValues>(() =>
    createInitialFormValues(branchId, userRole),
  );
  const formValues = formData;

  const resetFormData = () => {
    setCurrentStep(1);
    setLoading(false);
    setFieldErrors({});
    setSubmitError(null);
    setFormData(createInitialFormValues(branchId, userRole));
  };

  useEffect(() => {
    if (!isOpen) {
      resetFormData();
    }
  }, [isOpen, branchId, userRole]);

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFieldErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      const nextErrors = { ...previous };
      delete nextErrors[field];
      return nextErrors;
    });

    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateCurrentStep = (): boolean => {
    const errors = validateStep(currentStep, formValues, branchId, userRole);
    setFieldErrors(errors);

    const firstError = Object.values(errors)[0] ?? null;
    setSubmitError(firstError);

    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, TOTAL_STEPS));
  };

  const handlePrev = () => {
    setSubmitError(null);
    setCurrentStep((previous) => Math.max(previous - 1, 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    const selectedBranchId = resolveSelectedBranchId(formValues, branchId, userRole);

    if (!selectedBranchId || !isKnownBranchId(selectedBranchId)) {
      setSubmitError('Select a valid branch before adding a student.');
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const payload = buildStudentPayload(formValues, selectedBranchId);
      const result = await onSubmit(payload);

      if (!result.success) {
        setSubmitError(result.error || 'Failed to add student. Please try again.');
        return;
      }

      resetFormData();
      onClose();
    } catch (error) {
      console.error('Failed to submit student registration', error);
      setSubmitError('An unexpected error occurred while saving the student.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetFormData();
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const selectedPlan = STUDY_PLANS.find((plan) => plan.value === formValues.study_plan);
  const selectedBranchId = resolveSelectedBranchId(formValues, branchId, userRole);
  const canSubmit = Boolean(selectedBranchId) && !loading;
  const showAdminBranchWarning = userRole === 'admin' && !branchId;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        >
          <div className="rounded-t-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Add New Student</h2>
                <p className="mt-1 text-sm text-white/80">
                  Complete the registration details in three quick steps.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-lg p-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              {STEP_ITEMS.map((step, index) => (
                <div key={step.number} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className={[
                        'flex h-12 w-12 items-center justify-center rounded-full font-bold transition-all',
                        currentStep > step.number
                          ? 'bg-green-500 text-white'
                          : currentStep === step.number
                            ? 'bg-white text-purple-600 shadow-lg'
                            : 'bg-white/20 text-white/60',
                      ].join(' ')}
                    >
                      {currentStep > step.number ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <step.icon className="h-6 w-6" />
                      )}
                    </div>
                    <p
                      className={[
                        'mt-2 text-sm font-medium',
                        currentStep >= step.number ? 'text-white' : 'text-white/60',
                      ].join(' ')}
                    >
                      {step.title}
                    </p>
                  </div>

                  {index < STEP_ITEMS.length - 1 && (
                    <div
                      className={[
                        'mx-2 h-1 flex-1 rounded transition-all',
                        currentStep > step.number ? 'bg-green-500' : 'bg-white/20',
                      ].join(' ')}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {showAdminBranchWarning && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                This account is not assigned to a branch yet. Assign a branch before creating a student.
              </div>
            )}

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  !
                </div>
                <p className="text-sm font-medium text-red-700">{submitError}</p>
              </motion.div>
            )}

            <div className="min-h-[420px]">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="mb-6 text-xl font-bold text-gray-900">Basic Information</h3>

                    {userRole === 'superadmin' ? (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Branch <span className="ml-1 text-red-500">*</span>
                        </label>
                        <select
                          value={formValues.branch_id}
                          onChange={(event) =>
                            updateField(
                              'branch_id',
                              event.target.value ? Number(event.target.value) : '',
                            )
                          }
                          disabled={loading}
                          className={[
                            'w-full rounded-xl border-2 px-4 py-3 text-gray-900 transition-all focus:outline-none focus:ring-4',
                            fieldErrors.branch_id
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                              : 'border-gray-200 focus:border-purple-500 focus:ring-purple-500/10',
                          ].join(' ')}
                        >
                          <option value="">Select branch</option>
                          {BRANCH_OPTIONS.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.branch_id && (
                          <p className="mt-1.5 text-sm text-red-600">{fieldErrors.branch_id}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                        <p className="text-sm text-purple-700">Student will be created for</p>
                        <p className="mt-1 text-lg font-semibold text-purple-900">
                          {getBranchName(branchId)}
                        </p>
                      </div>
                    )}

                    <Input
                      label="Full Name"
                      placeholder="e.g., Rahul Kumar"
                      value={formValues.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      error={fieldErrors.name}
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="9876543210"
                      value={formValues.phone}
                      onChange={(event) =>
                        updateField('phone', event.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      error={fieldErrors.phone}
                      helperText="10-digit mobile number"
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="student@example.com"
                      value={formValues.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      error={fieldErrors.email}
                      helperText="Optional"
                      fullWidth
                      disabled={loading}
                    />

                    <div>
                      <label className="mb-3 block text-sm font-semibold text-gray-700">
                        Study Plan <span className="ml-1 text-red-500">*</span>
                      </label>

                      <div className="space-y-3">
                        {STUDY_PLANS.map((plan) => (
                          <label
                            key={plan.value}
                            className={[
                              'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all',
                              formValues.study_plan === plan.value
                                ? 'border-purple-600 bg-purple-50 shadow-sm'
                                : 'border-gray-200 hover:border-purple-300',
                            ].join(' ')}
                          >
                            <input
                              type="radio"
                              name="study_plan"
                              value={plan.value}
                              checked={formValues.study_plan === plan.value}
                              onChange={(event) =>
                                updateField(
                                  'study_plan',
                                  event.target.value as FormValues['study_plan'],
                                )
                              }
                              disabled={loading}
                              className="mt-1"
                            />

                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-gray-900">{plan.label}</span>
                                <span className="text-lg font-bold text-purple-600">₹{plan.fee}</span>
                              </div>
                              <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="mb-6 text-xl font-bold text-gray-900">Personal Details</h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Input
                        label="Date of Birth"
                        type="date"
                        value={formValues.date_of_birth}
                        onChange={(event) => updateField('date_of_birth', event.target.value)}
                        error={fieldErrors.date_of_birth}
                        required
                        fullWidth
                        disabled={loading}
                      />

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Gender <span className="ml-1 text-red-500">*</span>
                        </label>
                        <select
                          value={formValues.gender}
                          onChange={(event) =>
                            updateField('gender', event.target.value as FormValues['gender'])
                          }
                          disabled={loading}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Blood Group
                      </label>
                      <select
                        value={formValues.blood_group}
                        onChange={(event) => updateField('blood_group', event.target.value)}
                        disabled={loading}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                      >
                        <option value="">Select blood group</option>
                        {BLOOD_GROUP_OPTIONS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Address"
                      placeholder="House no., street, area"
                      value={formValues.address}
                      onChange={(event) => updateField('address', event.target.value)}
                      error={fieldErrors.address}
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Input
                        label="City"
                        placeholder="Bareilly"
                        value={formValues.city}
                        onChange={(event) => updateField('city', event.target.value)}
                        error={fieldErrors.city}
                        required
                        fullWidth
                        disabled={loading}
                      />

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          State <span className="ml-1 text-red-500">*</span>
                        </label>
                        <select
                          value={formValues.state}
                          onChange={(event) => updateField('state', event.target.value)}
                          disabled={loading}
                          className={[
                            'w-full rounded-xl border-2 px-4 py-3 text-gray-900 transition-all focus:outline-none focus:ring-4',
                            fieldErrors.state
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                              : 'border-gray-200 focus:border-purple-500 focus:ring-purple-500/10',
                          ].join(' ')}
                        >
                          <option value="">Select state</option>
                          {INDIAN_STATE_OPTIONS.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.state && (
                          <p className="mt-1.5 text-sm text-red-600">{fieldErrors.state}</p>
                        )}
                      </div>

                      <Input
                        label="PIN Code"
                        type="tel"
                        placeholder="243001"
                        value={formValues.pincode}
                        onChange={(event) =>
                          updateField('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        error={fieldErrors.pincode}
                        helperText="6 digits"
                        required
                        fullWidth
                        disabled={loading}
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="mb-6 text-xl font-bold text-gray-900">Emergency Contact</h3>

                    <Input
                      label="Contact Person Name"
                      placeholder="Emergency contact name"
                      value={formValues.emergency_contact_name}
                      onChange={(event) =>
                        updateField('emergency_contact_name', event.target.value)
                      }
                      error={fieldErrors.emergency_contact_name}
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <Input
                      label="Contact Phone"
                      type="tel"
                      placeholder="9876543210"
                      value={formValues.emergency_contact_phone}
                      onChange={(event) =>
                        updateField(
                          'emergency_contact_phone',
                          event.target.value.replace(/\D/g, '').slice(0, 10),
                        )
                      }
                      error={fieldErrors.emergency_contact_phone}
                      helperText="10-digit mobile number"
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Relationship <span className="ml-1 text-red-500">*</span>
                      </label>
                      <select
                        value={formValues.emergency_contact_relation}
                        onChange={(event) =>
                          updateField('emergency_contact_relation', event.target.value)
                        }
                        disabled={loading}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                      >
                        {RELATIONSHIP_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          ID Proof Type
                        </label>
                        <select
                          value={formValues.id_proof_type}
                          onChange={(event) => updateField('id_proof_type', event.target.value)}
                          disabled={loading}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                        >
                          <option value="">Select ID Type</option>
                          {ID_PROOF_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.id_proof_type && (
                          <p className="mt-1.5 text-sm text-red-600">{fieldErrors.id_proof_type}</p>
                        )}
                      </div>

                      <Input
                        label="ID Proof Number"
                        placeholder={
                          formValues.id_proof_type === 'Aadhar' ? '123456789012' : 'Enter ID number'
                        }
                        value={formValues.id_proof_number}
                        onChange={(event) =>
                          updateField(
                            'id_proof_number',
                            formValues.id_proof_type === 'Aadhar'
                              ? event.target.value.replace(/\D/g, '').slice(0, 12)
                              : event.target.value.trimStart(),
                          )
                        }
                        error={fieldErrors.id_proof_number}
                        helperText="Optional"
                        fullWidth
                        disabled={loading}
                      />
                    </div>

                    <Input
                      label="Notes"
                      placeholder="Additional remarks or registration notes"
                      value={formValues.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      helperText="Optional"
                      fullWidth
                      disabled={loading}
                    />

                    <div className="mt-6 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
                      <h4 className="mb-3 font-bold text-purple-900">Registration Summary</h4>
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-gray-600">Name</p>
                          <p className="font-semibold text-gray-900">
                            {formValues.name || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Phone</p>
                          <p className="font-semibold text-gray-900">
                            {formValues.phone || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Study Plan</p>
                          <p className="font-semibold text-gray-900">
                            {selectedPlan?.label || formValues.study_plan}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Monthly Fee</p>
                          <p className="text-lg font-bold text-purple-600">
                            ₹{selectedPlan?.fee ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Branch</p>
                          <p className="font-semibold text-gray-900">
                            {selectedBranchId ? getBranchName(selectedBranchId) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex gap-3 border-t border-gray-200 pt-6">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrev}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}

              <div className="flex-1" />

              {currentStep < TOTAL_STEPS ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  disabled={!canSubmit}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    'Adding Student...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Complete Registration
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
