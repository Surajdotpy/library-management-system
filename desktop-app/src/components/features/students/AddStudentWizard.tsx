import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Check, User, FileText, Phone as PhoneIcon } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { STUDY_PLANS } from '@/types';

interface AddStudentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
}

interface FormData {
  // Step 1: Basic Info
  name: string;
  phone: string;
  email: string;
  study_plan: '2_hours' | '4_hours' | 'unlimited';
  
  // Step 2: Personal Details
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  blood_group: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  
  // Step 3: Emergency Contact & ID
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  id_proof_type: string;
  id_proof_number: string;
}

export function AddStudentWizard({ isOpen, onClose, onSubmit }: AddStudentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
 const [formData, setFormData] = useState<FormData>({
  // Step 1
  name: '',
  phone: '',
  email: '',
  study_plan: '2_hours',
  
  // Step 2
  date_of_birth: '',
  gender: 'Male',
  blood_group: '',
  address: '',
  city: '',
  state: 'Uttar Pradesh',
  pincode: '',
  
  // Step 3
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: 'Father',
  id_proof_type: 'Aadhar',
  id_proof_number: '',
});

  const totalSteps = 3;

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Validation for each step
  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.phone.trim() || formData.phone.length !== 10) {
      setError('Valid 10-digit phone number is required');
      return false;
    }
    if (formData.email && !formData.email.includes('@')) {
      setError('Valid email is required');
      return false;
    }
    return true;
  };

 const validateStep2 = (): boolean => {
  if (!formData.date_of_birth) {
    setError('Date of birth is required');
    return false;
  }
  if (!formData.gender) {
    setError('Gender is required');
    return false;
  }
  if (!formData.address.trim()) {
    setError('Address is required');
    return false;
  }
  if (!formData.city.trim()) {
    setError('City is required');
    return false;
  }
  if (!formData.state.trim()) {
    setError('State is required');
    return false;
  }
  if (!formData.pincode.trim() || formData.pincode.length !== 6) {
    setError('Valid 6-digit PIN code is required');
    return false;
  }
  return true;
};

 const validateStep3 = (): boolean => {
  if (!formData.emergency_contact_name.trim()) {
    setError('Emergency contact name is required');
    return false;
  }
  if (!formData.emergency_contact_phone.trim() || formData.emergency_contact_phone.length !== 10) {
    setError('Valid 10-digit emergency phone is required');
    return false;
  }
  if (!formData.emergency_contact_relation.trim()) {
    setError('Relationship is required');
    return false;
  }
  return true;
};

  const handleNext = () => {
    setError('');
    
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const result = await onSubmit({
  ...formData,
  branch_id,
  email: formData.email || null,
  blood_group: formData.blood_group || null,
  id_proof_type: formData.id_proof_type || null,
  id_proof_number: formData.id_proof_number || null,
});

    

      if (result.success) {
        // Reset form
        setFormData({
          name: '', phone: '', email: '', study_plan: '2_hours',
          date_of_birth: '', father_name: '', mother_name: '',
          address_line1: '', address_line2: '', city: '',
          state: 'Uttar Pradesh', pincode: '',
          emergency_contact: '', emergency_phone: '',
          relationship: 'Father', aadhar_number: '',
        });
        setCurrentStep(1);
        setError('');
        onClose();
      } else {
        setError(result.error || 'Failed to add student');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCurrentStep(1);
      setError('');
      onClose();
    }
  };

  const selectedPlan = STUDY_PLANS.find(p => p.value === formData.study_plan);

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Basic Info', icon: User },
    { number: 2, title: 'Personal Details', icon: FileText },
    { number: 3, title: 'Emergency Contact', icon: PhoneIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="min-h-screen px-4 flex items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Student</h2>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all
                        ${currentStep > step.number
                          ? 'bg-green-500 text-white'
                          : currentStep === step.number
                          ? 'bg-white text-purple-600 shadow-lg'
                          : 'bg-white/20 text-white/60'
                        }
                      `}
                    >
                      {currentStep > step.number ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <p className={`text-sm mt-2 font-medium ${currentStep >= step.number ? 'text-white' : 'text-white/60'}`}>
                      {step.title}
                    </p>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 rounded transition-all ${
                        currentStep > step.number ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
              >
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {/* Step Content */}
            <div className="min-h-[400px]">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: Basic Information */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h3>
                    
                    <Input
                      label="Full Name"
                      placeholder="e.g., Rahul Kumar"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                      fullWidth
                      disabled={loading}
                      helperText="10-digit mobile number"
                    />

                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      fullWidth
                      disabled={loading}
                    />

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Study Plan <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        {STUDY_PLANS.map((plan) => (
                          <label
                            key={plan.value}
                            className={`
                              flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all
                              ${formData.study_plan === plan.value
                                ? 'border-purple-600 bg-purple-50 shadow-sm'
                                : 'border-gray-200 hover:border-purple-300'
                              }
                            `}
                          >
                            <input
                              type="radio"
                              name="study_plan"
                              value={plan.value}
                              checked={formData.study_plan === plan.value}
                              onChange={(e) => updateField('study_plan', e.target.value as any)}
                              disabled={loading}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900">{plan.label}</span>
                                <span className="text-lg font-bold text-purple-600">₹{plan.fee}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Personal Details */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Personal Details</h3>
                    
                    <Input
                      label="Date of Birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => updateField('date_of_birth', e.target.value)}
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Father's Name"
                        placeholder="Father's full name"
                        value={formData.father_name}
                        onChange={(e) => updateField('father_name', e.target.value)}
                        fullWidth
                        disabled={loading}
                        helperText="Either Father or Mother name required"
                      />

                      <Input
                        label="Mother's Name"
                        placeholder="Mother's full name"
                        value={formData.mother_name}
                        onChange={(e) => updateField('mother_name', e.target.value)}
                        fullWidth
                        disabled={loading}
                      />
                    </div>

                    <Input
                      label="Address Line 1"
                      placeholder="House no., Street, Area"
                      value={formData.address_line1}
                      onChange={(e) => updateField('address_line1', e.target.value)}
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <Input
                      label="Address Line 2 (Optional)"
                      placeholder="Landmark, Colony"
                      value={formData.address_line2}
                      onChange={(e) => updateField('address_line2', e.target.value)}
                      fullWidth
                      disabled={loading}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        placeholder="Bareilly"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        required
                        fullWidth
                        disabled={loading}
                      />

                      <Input
                        label="State"
                        placeholder="Uttar Pradesh"
                        value={formData.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        required
                        fullWidth
                        disabled={loading}
                      />

                      <Input
                        label="PIN Code"
                        type="tel"
                        placeholder="243001"
                        value={formData.pincode}
                        onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        fullWidth
                        disabled={loading}
                        helperText="6 digits"
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Emergency Contact */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Emergency Contact</h3>
                    
                    <Input
                      label="Contact Person Name"
                      placeholder="Emergency contact name"
                      value={formData.emergency_contact}
                      onChange={(e) => updateField('emergency_contact', e.target.value)}
                      required
                      fullWidth
                      disabled={loading}
                    />

                    <Input
                      label="Contact Phone"
                      type="tel"
                      placeholder="9876543210"
                      value={formData.emergency_phone}
                      onChange={(e) => updateField('emergency_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                      fullWidth
                      disabled={loading}
                      helperText="10-digit mobile number"
                    />

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.relationship}
                        onChange={(e) => updateField('relationship', e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Uncle">Uncle</option>
                        <option value="Aunt">Aunt</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <Input
                      label="Aadhar Number (Optional)"
                      type="tel"
                      placeholder="123456789012"
                      value={formData.aadhar_number}
                      onChange={(e) => updateField('aadhar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                      fullWidth
                      disabled={loading}
                      helperText="12-digit Aadhar number"
                    />

                    {/* Summary */}
                    <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
                      <h4 className="font-bold text-purple-900 mb-3">Registration Summary</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Name:</p>
                          <p className="font-semibold text-gray-900">{formData.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Phone:</p>
                          <p className="font-semibold text-gray-900">{formData.phone}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Study Plan:</p>
                          <p className="font-semibold text-gray-900">{selectedPlan?.label}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Monthly Fee:</p>
                          <p className="text-lg font-bold text-purple-600">₹{selectedPlan?.fee}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrev}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
              
              <div className="flex-1" />
              
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Adding Student...' : (
                    <>
                      <Check className="w-4 h-4" />
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