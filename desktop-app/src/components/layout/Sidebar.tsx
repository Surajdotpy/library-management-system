import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  DollarSign, 
  BarChart3,
  Settings,
  LogOut,
  Coffee,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  userRole: 'superadmin' | 'admin';
}

export function Sidebar({ userRole }: SidebarProps) {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Students', path: '/students' },
    { icon: CheckSquare, label: 'Attendance', path: '/attendance' },
    { icon: DollarSign, label: 'Payments', path: '/payments' },
    ...(userRole === 'superadmin' ? [{ icon: BarChart3, label: 'Reports', path: '/reports' }] : []),
  ];

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-50"
    >
      {/* Logo */}
      <div className="p-6 border-b border-purple-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-2 h-2 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold">Coffee aur Kitaab</h1>
            <p className="text-xs text-purple-300">Study Library</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-purple-200 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-purple-700/50 space-y-2">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-200 hover:bg-white/5 hover:text-white transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </NavLink>
        
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </motion.aside>
  );
}