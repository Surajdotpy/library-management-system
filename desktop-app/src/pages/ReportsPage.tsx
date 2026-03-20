import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Building2,
  Loader2,
  AlertCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, Badge } from '@/components/ui';
import { reportsApi } from '@/lib/api/reports';
import type {
  OverviewStats,
  RevenueTrendItem,
  StudentGrowthItem,
  BranchComparisonItem,
  AttendancePatternItem,
} from '@/lib/api/reports';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ReportsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [studentGrowth, setStudentGrowth] = useState<StudentGrowthItem[]>([]);
  const [branchComparison, setBranchComparison] = useState<BranchComparisonItem[]>([]);
  const [attendancePatterns, setAttendancePatterns] = useState<AttendancePatternItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, revenueData, growthData, branchData, attendanceData] =
        await Promise.all([
          reportsApi.getOverview(),
          reportsApi.getRevenueTrend(6),
          reportsApi.getStudentGrowth(6),
          reportsApi.getBranchComparison(),
          reportsApi.getAttendancePatterns(30),
        ]);

      setOverview(overviewData);
      setRevenueTrend(revenueData);
      setStudentGrowth(growthData);
      setBranchComparison(branchData);
      setAttendancePatterns(attendanceData);
    } catch (err: any) {
      console.error('Failed to fetch reports data:', err);
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Chart configurations
  const revenueChartData = {
    labels: revenueTrend.map((item) => item.month),
    datasets: [
      {
        label: 'Revenue',
        data: revenueTrend.map((item) => item.revenue),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const studentGrowthChartData = {
    labels: studentGrowth.map((item) => item.month),
    datasets: [
      {
        label: 'New Students',
        data: studentGrowth.map((item) => item.students),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const branchRevenueChartData = {
    labels: branchComparison.map((item) => item.branch_name),
    datasets: [
      {
        label: 'Monthly Revenue',
        data: branchComparison.map((item) => item.monthly_revenue),
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
      },
    ],
  };

  const attendanceChartData = {
    labels: attendancePatterns.map((item) => item.date),
    datasets: [
      {
        label: 'Unique Students',
        data: attendancePatterns.map((item) => item.unique_students),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <MainLayout>
        <Card>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">Loading reports...</span>
          </div>
        </Card>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Card>
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Error loading reports</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                Reports & Analytics
              </h1>
              <p className="mt-1 text-gray-600">
                Comprehensive insights across all branches
              </p>
            </div>
            <Badge variant="info">Superadmin Only</Badge>
          </div>
        </motion.div>

        {/* Overview Stats */}
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-purple-600">
                    Total Revenue
                  </p>
                  <p className="text-3xl font-bold text-purple-900">
                    {formatCurrency(overview.total_revenue)}
                  </p>
                  <p className="mt-1 text-xs text-purple-700">This month</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-blue-600">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    {overview.total_students}
                  </p>
                  <p className="mt-1 text-xs text-blue-700">Active now</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-green-600">
                    Avg Occupancy
                  </p>
                  <p className="text-3xl font-bold text-green-900">
                    {overview.avg_occupancy.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-xs text-green-700">Across branches</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500">
                  <Percent className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-amber-600">
                    Growth Rate
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-amber-900">
                      {Math.abs(overview.growth_rate).toFixed(1)}%
                    </p>
                    {overview.growth_rate >= 0 ? (
                      <ArrowUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowDown className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-amber-700">vs last month</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
                <Badge variant="default">Last 6 Months</Badge>
              </div>
              <div className="h-72">
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </Card>
          </motion.div>

          {/* Student Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Student Growth</h3>
                <Badge variant="default">Last 6 Months</Badge>
              </div>
              <div className="h-72">
                <Bar data={studentGrowthChartData} options={chartOptions} />
              </div>
            </Card>
          </motion.div>

          {/* Branch Revenue Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Branch Revenue Comparison
                </h3>
                <Badge variant="default">This Month</Badge>
              </div>
              <div className="h-72">
                <Bar data={branchRevenueChartData} options={chartOptions} />
              </div>
            </Card>
          </motion.div>

          {/* Attendance Patterns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Attendance Patterns
                </h3>
                <Badge variant="default">Last 30 Days</Badge>
              </div>
              <div className="h-72">
                <Line data={attendanceChartData} options={chartOptions} />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Branch Performance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card noPadding>
            <div className="border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900">
                Branch Performance Details
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Branch
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Students
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Currently Inside
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Occupancy
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Monthly Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branchComparison.map((branch, index) => (
                    <motion.tr
                      key={branch.branch_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {branch.branch_name}
                            </p>
                            <p className="text-xs text-gray-500">{branch.branch_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {branch.active_students}
                          </p>
                          <p className="text-xs text-gray-500">
                            of {branch.total_students} total
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {branch.currently_inside}
                        </p>
                        <p className="text-xs text-gray-500">
                          / {branch.total_capacity} capacity
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${branch.occupancy_rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {branch.occupancy_rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-purple-700">
                          {formatCurrency(branch.monthly_revenue)}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}