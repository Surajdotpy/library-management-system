import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { STUDY_PLANS } from '@/types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
}

export function AddStudentModal({ isOpen, onClose, onSubmit }: AddStudentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    study_plan: '2_hours' as '2_hours' | '4_hours' | 'unlimited',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.phone.trim() || formData.phone.length !== 10) {
      setError('Valid 10-digit phone number is required');
      setLoading(false);
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      setError('Valid email is required');
      setLoading(false);
      return;
    }

    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user) {
        setError('Please login again');
        setLoading(false);
        return;
      }

      // For superadmin, default to branch 1, for branch admin use their branch
      const branch_id = user.branch_id || 1;

      const result = await onSubmit({
        ...formData,
        branch_id,
        email: formData.email || null,
      });

      if (result.success) {
        // Reset form
        setFormData({ name: '', phone: '', email: '', study_plan: '2_hours' });
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
      setFormData({ name: '', phone: '', email: '', study_plan: '2_hours' });
      setError('');
      onClose();
    }
  };

  const selectedPlan = STUDY_PLANS.find(p => p.value === formData.study_plan);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="min-h-screen px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header - Fixed */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
            <h2 className="text-xl font-bold text-white">Add New Student</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                >
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </motion.div>
              )}

              {/* Name */}
              <Input
                label="Full Name"
                placeholder="e.g., Rahul Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                disabled={loading}
              />

              {/* Phone */}
              <Input
                label="Phone Number"
                type="tel"
                placeholder="9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                required
                fullWidth
                disabled={loading}
                helperText="10-digit mobile number"
              />

              {/* Email */}
              <Input
                label="Email Address (Optional)"
                type="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                disabled={loading}
              />

              {/* Study Plan */}
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
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                        }
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <input
                        type="radio"
                        name="study_plan"
                        value={plan.value}
                        checked={formData.study_plan === plan.value}
                        onChange={(e) => setFormData({ ...formData, study_plan: e.target.value as any })}
                        disabled={loading}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900">{plan.label}</span>
                          <span className="text-lg font-bold text-purple-600">₹{plan.fee}</span>
                        </div>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedPlan && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Monthly Fee</p>
                      <p className="text-2xl font-bold text-blue-600">₹{selectedPlan.fee}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-900">Plan</p>
                      <p className="text-lg font-semibold text-blue-700">{selectedPlan.label}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons - Fixed at bottom */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 rounded-b-2xl">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                fullWidth
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={loading}
                disabled={loading}
              >
                {loading ? 'Adding Student...' : 'Add Student'}
              </Button>
            </div>
          </form>

        </motion.div>
      </div>
    </div>
  );
}