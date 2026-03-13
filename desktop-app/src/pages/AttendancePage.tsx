import { MainLayout } from '@/components/layout/MainLayout';
import { Card, Badge } from '@/components/ui';
import { CheckSquare, UserCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AttendancePage() {
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
              <CheckSquare className="w-8 h-8 text-green-600" />
              Attendance Management
            </h1>
            <p className="text-gray-600 mt-1">Track student check-ins and check-outs</p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              <UserCheck className="w-5 h-5" />
              Mark Entry
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              <UserCheck className="w-5 h-5" />
              Mark Exit
            </button>
          </div>
        </motion.div>

        {/* Currently Inside Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Currently Inside</p>
                <h2 className="text-4xl font-bold text-gray-900">187 Students</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Occupancy Rate</p>
                <h2 className="text-4xl font-bold text-green-600">62%</h2>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Currently Inside List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card noPadding>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Students Inside Now</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Entry Time</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">Rahul Kumar</p>
                        <p className="text-sm text-gray-500">LIB-B1-001</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">9:15 AM</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">2h 30m</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="success">Inside</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-red-600 hover:text-red-700 font-medium text-sm">
                        Mark Exit
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