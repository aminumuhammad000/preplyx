import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_BASE_URL } from '../config/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      // Success Alert
      setAlert({
        type: 'success',
        message: `Welcome back, ${data.name || 'Student'}! Redirecting to your dashboard...`
      });

      login(data, data.token);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Invalid login credentials. Please check and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen w-full bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative">
      {/* Top Floating Modern Toast Banner */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ y: -50, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -50, opacity: 0, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white shadow-xl max-w-md w-[90%] ${
              alert.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 size={22} className="text-white shrink-0" />
            ) : (
              <ShieldAlert size={22} className="text-white shrink-0" />
            )}

            <div className="flex-1 text-xs sm:text-sm font-semibold leading-snug">
              {alert.message}
            </div>

            <button 
              onClick={() => setAlert(null)} 
              className="bg-white/20 hover:bg-white/30 rounded-full w-6 h-6 flex items-center justify-center text-white shrink-0 transition-all"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Soft Background Accent Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-secondary/8 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[400px] bg-white rounded-2xl p-7 sm:p-8 shadow-xl shadow-gray-200/50 border border-gray-100 relative z-10"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <img 
            src="/logo2.png" 
            alt="Preplyx Logo" 
            className="w-9 h-9 rounded-xl object-cover"
          />
          <span className="text-2xl font-black text-slate-800 tracking-tight">
            Preplyx
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Sign in to continue your CBT practice
          </p>
        </div>

        {/* In-Card Alert Feedback */}
        {alert && (
          <div className={`mb-5 p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 ${
            alert.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {alert.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert size={18} className="text-red-600 shrink-0" />
            )}
            <span className="leading-snug">{alert.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <Link 
                to="/forgot-password" 
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-dark to-primary text-white text-xs sm:text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
