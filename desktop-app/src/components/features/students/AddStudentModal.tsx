import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
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
      // Get user's branch_id from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user?.branch_id) {
        setError('Branch information not found. Please login again.');
        setLoading(false);
        return;
      }

      const result = await onSubmit({
        ...formData,
        branch_id: user.branch_id,
        email: formData.email || null,
      });

      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          phone: '',
          email: '',
          study_plan: '2_hours',
        });
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

  const selectedPlan = STUDY_PLANS.find(p => p.value === formData.study_plan);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Student</h2>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                  >
                    {error}
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
                />

                {/* Study Plan */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Study Plan <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {STUDY_PLANS.map((plan) => (
                      <label
                        key={plan.value}
                        className={`
                          flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all
                          ${formData.study_plan === plan.value
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="study_plan"
                          value={plan.value}
                          checked={formData.study_plan === plan.value}
                          onChange={(e) => setFormData({ ...formData, study_plan: e.target.value as any })}
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

                {/* Summary */}
                {selectedPlan && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-900">
                      <strong>Monthly Fee:</strong> ₹{selectedPlan.fee}
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
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
        </>
      )}
    </AnimatePresence>
  );
}