import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';
import { Mail, Lock, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      
      // Save token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Floating Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl"
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-5xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="grid md:grid-cols-2">
          
          {/* Left Side - Form */}
          <div className="p-8 md:p-12">
            
            {/* Logo & Brand */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  REERUI
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Login</h1>
              <p className="text-gray-600">
                Welcome to your background management system
              </p>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
              >
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Login Form */}
            <motion.form
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              
              <Input
                label="Email"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                placeholder="1138278073@qq.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />

              <Input
                label="Password"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                placeholder="Please enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={loading}
              >
                {loading ? 'Logging in...' : 'LOGIN'}
              </Button>

            </motion.form>

            {/* Test Credentials Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl"
            >
              <p className="text-sm text-blue-800 font-medium mb-1">Test Credentials:</p>
              <p className="text-xs text-blue-600">
                Email: superadmin@library.com<br />
                Password: admin123
              </p>
            </motion.div>

          </div>

          {/* Right Side - Illustration */}
          <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 p-12 relative">
            
            {/* Illustration */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="relative w-full max-w-md"
            >
              
              {/* Dashboard Mockup */}
              <div className="relative">
                
                {/* Main Dashboard Card */}
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="bg-white rounded-2xl shadow-2xl p-6 space-y-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="h-3 w-32 bg-gray-200 rounded"></div>
                      <div className="h-2 w-24 bg-gray-100 rounded"></div>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full"></div>
                  </div>

                  {/* Chart */}
                  <div className="space-y-2">
                    <div className="flex items-end gap-2 h-32">
                      <div className="w-1/4 bg-gradient-to-t from-blue-400 to-blue-300 rounded-t-lg h-3/4"></div>
                      <div className="w-1/4 bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-lg h-full"></div>
                      <div className="w-1/4 bg-gradient-to-t from-indigo-400 to-indigo-300 rounded-t-lg h-2/3"></div>
                      <div className="w-1/4 bg-gradient-to-t from-blue-400 to-blue-300 rounded-t-lg h-4/5"></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="h-2 w-12 bg-blue-200 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-blue-300 rounded"></div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="h-2 w-12 bg-purple-200 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-purple-300 rounded"></div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="h-2 w-12 bg-indigo-200 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-indigo-300 rounded"></div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Elements */}
                <motion.div
                  animate={{
                    rotate: [0, 5, 0],
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-300 rounded-2xl shadow-lg"
                />

                <motion.div
                  animate={{
                    rotate: [0, -5, 0],
                    y: [0, 5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                  className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-pink-300 to-rose-300 rounded-xl shadow-lg"
                />

              </div>

              {/* People Illustrations */}
              <div className="absolute -bottom-8 left-0 flex gap-4">
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-16 h-24 bg-gradient-to-b from-blue-400 to-blue-500 rounded-t-full rounded-b-lg"
                />
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3
                  }}
                  className="w-16 h-24 bg-gradient-to-b from-purple-400 to-purple-500 rounded-t-full rounded-b-lg"
                />
              </div>

            </motion.div>

          </div>

        </div>
      </motion.div>

    </div>
  );
}