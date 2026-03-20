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
import { BRANCH_OPTIONS, getBranchName } from '@/config/branches';
import { Button, Input } from '@/components/ui';
import { STUDY_PLANS, type Student, type UpdateStudentRequest, type User as AppUser } from '@/types';

interface EditStudentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: number, data: UpdateStudentRequest) => Promise<{ success: boolean; error?: string }>;
  student: Student | null;
  userRole: AppUser['role'];
}

type SelectableBranchId = number | '';
type FormValues = {
  branch_id: SelectableBranchId;
  name: string;
  phone: string;
  email: string;
  study_plan: '2_hours' | '4_hours' | 'unlimited';
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  id_proof_type: string;
  id_proof_number: string;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const TOTAL_STEPS = 3;

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

function createFormValuesFromStudent(student: Student): FormValues {
  return {
    branch_id: student.branch_id,
    name: student.name,
    phone: student.phone,
    email: student.email || '',
    study_plan: student.study_plan,
    date_of_birth: student.date_of_birth,
    gender: student.gender,
    blood_group: student.blood_group || '',
    address: student.address,
    city: student.city,
    state: student.state,
    pincode: student.pincode,
    emergency_contact_name: student.emergency_contact_name,
    emergency_contact_phone: student.emergency_contact_phone,
    emergency_contact_relation: student.emergency_contact_relation,
    id_proof_type: student.id_proof_type || '',
    id_proof_number: student.id_proof_number || '',
    notes: student.notes || '',
  };
}

function validateStep(
  step: number,
  values: FormValues,
  userRole: AppUser['role'],
): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 1) {
    if (userRole === 'superadmin' && !values.branch_id) {
      errors.branch_id = 'Select a branch for this student.';
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

function buildUpdatePayload(values: FormValues): UpdateStudentRequest {
  const email = values.email.trim();
  const bloodGroup = values.blood_group.trim();
  const idProofNumber = values.id_proof_number.trim();
  const notes = values.notes.trim();

  const payload: UpdateStudentRequest = {
    name: values.name.trim(),
    phone: values.phone,
    study_plan: values.study_plan,
    date_of_birth: values.date_of_birth,
    gender: values.gender,
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode,
    emergency_contact_name: values.emergency_contact_name.trim(),
    emergency_contact_phone: values.emergency_contact_phone,
    emergency_contact_relation: values.emergency_contact_relation.trim(),
  };

  if (email) payload.email = email;
  if (bloodGroup) payload.blood_group = bloodGroup;
  if (idProofNumber) {
    payload.id_proof_type = values.id_proof_type;
    payload.id_proof_number = idProofNumber;
  }
  if (notes) payload.notes = notes;

  if (typeof values.branch_id === 'number') {
    payload.branch_id = values.branch_id;
  }

  return payload;
}

export function EditStudentWizard({
  isOpen,
  onClose,
  onSubmit,
  student,
  userRole,
}: EditStudentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<FormValues | null>(null);

  useEffect(() => {
    if (isOpen && student) {
      setFormData(createFormValuesFromStudent(student));
      setCurrentStep(1);
      setFieldErrors({});
      setSubmitError(null);
    }
  }, [isOpen, student]);

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    if (!formData) return;

    setFormData((previous: FormValues | null) => ({
      ...(previous || ({} as FormValues)),
      [field]: value,
    }));

    setFieldErrors((previous: FieldErrors) => {
      if (!previous[field]) return previous;
      const nextErrors = { ...previous };
      delete nextErrors[field];
      return nextErrors;
    });

    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateCurrentStep = (): boolean => {
    if (!formData) return false;

    const errors = validateStep(currentStep, formData, userRole);
    setFieldErrors(errors);

    const firstError = Object.values(errors)[0] ?? null;
    setSubmitError(firstError);

    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((previous) => Math.min(previous + 1, TOTAL_STEPS));
  };

  const handlePrev = () => {
    setSubmitError(null);
    setCurrentStep((previous) => Math.max(previous - 1, 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!student || !formData || !validateCurrentStep()) return;

    setLoading(true);
    setSubmitError(null);

    try {
      const payload = buildUpdatePayload(formData);
      const result = await onSubmit(student.id, payload);

      if (!result.success) {
        setSubmitError(result.error || 'Failed to update student.');
        return;
      }

      onClose();
    } catch (error) {
      console.error('Failed to update student', error);
      setSubmitError('An unexpected error occurred while updating the student.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData(null);
      setCurrentStep(1);
      setFieldErrors({});
      setSubmitError(null);
      onClose();
    }
  };

  if (!isOpen || !student || !formData) {
    return null;
  }

  const selectedPlan = STUDY_PLANS.find((plan) => plan.value === formData.study_plan);
  const canSubmit = !loading;

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
                <h2 className="text-2xl font-bold text-white">Edit Student</h2>
                <p className="mt-1 text-sm text-white/80">
                  Update {student.name}'s information
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
                          value={formData.branch_id}
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
                        <p className="text-sm text-purple-700">Branch</p>
                        <p className="mt-1 text-lg font-semibold text-purple-900">
                          {getBranchName(student.branch_id)}
                        </p>
                      </div>
                    )}

                    <Input
                      label="Full Name"
                      placeholder="e.g., Rahul Kumar"
                      value={formData.name}
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
                      value={formData.phone}
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
                      value={formData.email}
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
                              formData.study_plan === plan.value
                                ? 'border-purple-600 bg-purple-50 shadow-sm'
                                : 'border-gray-200 hover:border-purple-300',
                            ].join(' ')}
                          >
                            <input
                              type="radio"
                              name="study_plan"
                              value={plan.value}
                              checked={formData.study_plan === plan.value}
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
                        value={formData.date_of_birth}
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
                          value={formData.gender}
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
                        value={formData.blood_group}
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
                      value={formData.address}
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
                        value={formData.city}
                        onChange={(event) => updateField('city', event.target.value)}
                        error={fieldErrors.city}
                        required
                        fullWidth
                        disabled={loading}
                      />

                      <Input
                        label="State"
                        placeholder="Uttar Pradesh"
                        value={formData.state}
                        onChange={(event) => updateField('state', event.target.value)}
                        error={fieldErrors.state}
                        required
                        fullWidth
                        disabled={loading}
                      />

                      <Input
                        label="PIN Code"
                        type="tel"
                        placeholder="243001"
                        value={formData.pincode}
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
                      value={formData.emergency_contact_name}
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
                      value={formData.emergency_contact_phone}
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
                        value={formData.emergency_contact_relation}
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
                          value={formData.id_proof_type}
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
                          formData.id_proof_type === 'Aadhar' ? '123456789012' : 'Enter ID number'
                        }
                        value={formData.id_proof_number}
                        onChange={(event) =>
                          updateField(
                            'id_proof_number',
                            formData.id_proof_type === 'Aadhar'
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
                      placeholder="Additional remarks"
                      value={formData.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      helperText="Optional"
                      fullWidth
                      disabled={loading}
                    />

                    <div className="mt-6 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
                      <h4 className="mb-3 font-bold text-purple-900">Updated Information</h4>
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-gray-600">Name</p>
                          <p className="font-semibold text-gray-900">
                            {formData.name || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Phone</p>
                          <p className="font-semibold text-gray-900">
                            {formData.phone || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Study Plan</p>
                          <p className="font-semibold text-gray-900">
                            {selectedPlan?.label || formData.study_plan}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Monthly Fee</p>
                          <p className="text-lg font-bold text-purple-600">
                            ₹{selectedPlan?.fee ?? 0}
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
                    'Updating Student...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Update Student
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