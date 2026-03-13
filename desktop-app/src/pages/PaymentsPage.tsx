import { MainLayout } from '@/components/layout/MainLayout';
import { Card, Badge } from '@/components/ui';
import { DollarSign, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-600" />
              Payments Management
            </h1>
            <p className="text-gray-600 mt-1">Track and collect monthly fees</p>
          </div>
          
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
            <Plus className="w-5 h-5" />
            Record Payment
          </button>
        </motion.div>

        {/* Payment Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card>
            <p className="text-sm text-gray-600 mb-1">Today's Collection</p>
            <h2 className="text-3xl font-bold text-gray-900">₹8,400</h2>
            <p className="text-sm text-green-600 mt-1">+12 payments</p>
          </Card>

          <Card>
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <h2 className="text-3xl font-bold text-gray-900">₹1,24,500</h2>
            <p className="text-sm text-gray-500 mt-1">285 payments</p>
          </Card>

          <Card>
            <p className="text-sm text-gray-600 mb-1">Pending Amount</p>
            <h2 className="text-3xl font-bold text-amber-600">₹12,600</h2>
            <p className="text-sm text-amber-600 mt-1">36 students</p>
          </Card>
        </motion.div>

        {/* Payments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card noPadding>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Recent Payments</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Month</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">Priya Sharma</p>
                        <p className="text-sm text-gray-500">LIB-B1-002</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">March 2026</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹350</td>
                    <td className="px-6 py-4 text-sm text-gray-600">13 Mar 2026</td>
                    <td className="px-6 py-4">
                      <Badge variant="success">Paid</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-purple-600 hover:text-purple-700 font-medium text-sm">
                        View
                      </button>
                    </td>
                  </tr>
                  {/* More rows... */}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

      </div>
    </MainLayout>
  );
}