import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';
import { Mail, Lock, Coffee, BookOpen } from 'lucide-react';

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
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl"
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-6xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="grid md:grid-cols-2 min-h-[600px]">
          
          {/* Left Side - Clean Login Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            
            {/* Brand Logo */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Coffee className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                    Coffee aur Kitaab
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">Study Library</p>
                </div>
              </div>

              {/* Welcome Message */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Welcome back! ☕
                </h2>
                <p className="text-gray-600">
                  Sign in to manage your library
                </p>
              </div>
            </motion.div>

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
                placeholder="admin@coffeeaurkitaab.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />

              <Input
                label="Password"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                placeholder="Enter your password"
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
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

            </motion.form>

            {/* Footer Quote */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-gray-200"
            >
              <p className="text-sm text-gray-500 text-center italic">
                "Every expert was once a beginner."
              </p>
            </motion.div>

          </div>

          {/* Right Side - Clean Study Illustration */}
          <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 p-12 relative overflow-hidden">
            
            {/* Person Studying Silhouette */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="absolute bottom-0 left-12 z-10"
            >
              <div className="relative">
                {/* Head */}
                <motion.div
                  animate={{ rotate: [0, -2, 2, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full mb-2"
                />
                {/* Body */}
                <div className="w-20 h-32 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-t-3xl"></div>
                {/* Arm */}
                <motion.div
                  animate={{ rotate: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-16 -right-8 w-16 h-6 bg-indigo-600 rounded-full origin-left"
                />
              </div>
            </motion.div>

            {/* Main Illustration Card */}
            <div className="relative w-full max-w-md">
              
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative"
              >
                
                {/* Study Card */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white rounded-3xl shadow-2xl p-8 space-y-6"
                >
                  
                  {/* Books Stack */}
                  <div className="flex gap-3 justify-center">
                    <motion.div
                      animate={{ rotate: [0, -2, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-16 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg"
                    />
                    <motion.div
                      animate={{ rotate: [0, 2, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity }}
                      className="w-16 h-20 bg-gradient-to-br from-rose-400 to-rose-600 rounded-lg shadow-lg"
                    />
                    <motion.div
                      animate={{ rotate: [0, -1, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-16 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-lg"
                    />
                  </div>

                  {/* Simple Notebook */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 shadow-inner">
                    <div className="space-y-2">
                      <div className="h-1 bg-gray-400 rounded w-full"></div>
                      <div className="h-1 bg-gray-400 rounded w-4/5"></div>
                      <div className="h-1 bg-gray-400 rounded w-11/12"></div>
                      <div className="h-1 bg-gray-400 rounded w-3/4"></div>
                    </div>
                  </div>

                  {/* Coffee Cup with Steam */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="flex justify-center"
                  >
                    <div className="relative">
                      {/* Steam - Rising Up */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
                        <motion.div
                          animate={{ 
                            y: [0, -15],
                            opacity: [0, 0.6, 0]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeOut"
                          }}
                          className="w-1 h-12 bg-gradient-to-t from-gray-400 to-transparent rounded-full"
                        />
                        <motion.div
                          animate={{ 
                            y: [0, -18],
                            opacity: [0, 0.5, 0]
                          }}
                          transition={{ 
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: 0.3
                          }}
                          className="w-1 h-14 bg-gradient-to-t from-gray-400 to-transparent rounded-full"
                        />
                      </div>
                      
                      {/* Cup */}
                      <div className="w-20 h-24 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-3xl rounded-t-lg shadow-xl">
                        <div className="absolute top-2 inset-x-2 h-16 bg-gradient-to-b from-amber-900 to-amber-950 rounded-lg"></div>
                      </div>
                      
                      {/* Handle */}
                      <div className="absolute right-0 top-8 w-6 h-8 border-4 border-amber-700 rounded-r-full"></div>
                    </div>
                  </motion.div>

                  {/* Text */}
                  <div className="text-center">
                    <p className="text-gray-800 font-bold text-lg">Your Success Space</p>
                    <p className="text-gray-600 text-sm">Where dreams meet dedication</p>
                  </div>

                </motion.div>

                {/* Floating Emojis */}
                <motion.div
                  animate={{ rotate: [0, 10, 0], y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-2xl shadow-xl flex items-center justify-center"
                >
                  <span className="text-3xl">☕</span>
                </motion.div>

                <motion.div
                  animate={{ rotate: [0, -10, 0], y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-br from-rose-300 to-pink-400 rounded-2xl shadow-xl flex items-center justify-center"
                >
                  <span className="text-2xl">📚</span>
                </motion.div>

                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute top-1/2 -right-12 w-12 h-12 bg-gradient-to-br from-blue-300 to-indigo-400 rounded-xl shadow-lg flex items-center justify-center"
                >
                  <span className="text-xl">✨</span>
                </motion.div>

              </motion.div>

            </div>

          </div>

        </div>
      </motion.div>

    </div>
  );
}
