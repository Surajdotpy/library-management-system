import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
  delay?: number;
}

export function StatCard({ title, value, icon: Icon, trend, color, delay = 0 }: StatCardProps) {
  const iconBgClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    amber: 'bg-amber-100',
    rose: 'bg-rose-100',
  };

  const iconTextClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card hover className="cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
            
            {trend && (
              <div className="flex items-center gap-1">
                <svg
                  className={`w-4 h-4 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  {trend.isPositive ? (
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                  )}
                </svg>
                <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.value}
                </span>
                <span className="text-sm text-gray-500">vs last month</span>
              </div>
            )}
          </div>

          {/* Icon */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`${iconBgClasses[color]} ${iconTextClasses[color]} p-3 rounded-xl`}
          >
            <Icon className="w-6 h-6" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
