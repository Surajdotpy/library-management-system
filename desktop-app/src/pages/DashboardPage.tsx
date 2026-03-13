import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/features/dashboard/StatCard';
import { Card, Badge } from '@/components/ui';
import { Users, UserCheck, DollarSign, TrendingUp, Clock, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  // Mock data (we'll connect to API later)
  const stats = {
    totalStudents: 312,
    currentlyInside: 187,
    todayRevenue: 8400,
    occupancy: 62,
  };

  const recentActivity = [
    { id: 1, type: 'entry', student: 'Rahul Kumar', time: '9:15 AM', action: 'Checked IN' },
    { id: 2, type: 'payment', student: 'Priya Sharma', time: '9:30 AM', action: 'Paid ₹350' },
    { id: 3, type: 'exit', student: 'Amit Singh', time: '10:45 AM', action: 'Checked OUT' },
    { id: 4, type: 'entry', student: 'Neha Gupta', time: '11:00 AM', action: 'Checked IN' },
  ];

  const pendingPayments = [
    { id: 1, student: 'Rahul Kumar', studentId: 'LIB-B1-001', month: 'Feb 2026', amount: 250 },
    { id: 2, student: 'Priya Sharma', studentId: 'LIB-B1-002', month: 'Jan 2026', amount: 350 },
    { id: 3, student: 'Amit Singh', studentId: 'LIB-B2-001', month: 'Feb 2026', amount: 400 },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            trend={{ value: '+12%', isPositive: true }}
            color="blue"
            delay={0.1}
          />
          <StatCard
            title="Currently Inside"
            value={stats.currentlyInside}
            icon={UserCheck}
            color="green"
            delay={0.2}
          />
          <StatCard
            title="Today's Revenue"
            value={`₹${stats.todayRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: '+18%', isPositive: true }}
            color="purple"
            delay={0.3}
          />
          <StatCard
            title="Occupancy Rate"
            value={`${stats.occupancy}%`}
            icon={TrendingUp}
            color="amber"
            delay={0.4}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Activity - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card noPadding>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    View All
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center
                        ${activity.type === 'entry' ? 'bg-green-100' : ''}
                        ${activity.type === 'exit' ? 'bg-red-100' : ''}
                        ${activity.type === 'payment' ? 'bg-purple-100' : ''}
                      `}>
                        {activity.type === 'entry' && <UserCheck className="w-5 h-5 text-green-600" />}
                        {activity.type === 'exit' && <UserCheck className="w-5 h-5 text-red-600" />}
                        {activity.type === 'payment' && <DollarSign className="w-5 h-5 text-purple-600" />}
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{activity.student}</p>
                        <p className="text-sm text-gray-600">{activity.action}</p>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{activity.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>

          {/* Pending Payments - Takes 1 column */}
          <div>
            <Card noPadding>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Pending Payments</h3>
                  <Badge variant="warning">{pendingPayments.length}</Badge>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {pendingPayments.map((payment, index) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{payment.student}</p>
                        <p className="text-xs text-gray-500">{payment.studentId}</p>
                      </div>
                      <Badge variant="warning" size="sm">{payment.month}</Badge>
                    </div>
                    <p className="text-lg font-bold text-amber-600">₹{payment.amount}</p>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <button className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium">
                  View All Pending
                </button>
              </div>
            </Card>
          </div>

        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl text-left transition-all group">
                <Users className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-gray-900">Add New Student</p>
                <p className="text-sm text-gray-600">Register a new member</p>
              </button>

              <button className="p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl text-left transition-all group">
                <UserCheck className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-gray-900">Mark Attendance</p>
                <p className="text-sm text-gray-600">Check-in or check-out</p>
              </button>

              <button className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl text-left transition-all group">
                <DollarSign className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-gray-900">Record Payment</p>
                <p className="text-sm text-gray-600">Collect monthly fees</p>
              </button>
            </div>
          </Card>
        </motion.div>

      </div>
    </MainLayout>
  );
}