import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthBrandingPanel from '../components/auth/AuthBrandingPanel';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
    return () => clearError();
  }, [isAuthenticated, navigate, redirectPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.success) {
      navigate(redirectPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Centered Split-Screen Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[32px] overflow-hidden shadow-2xl border border-slate-200/70 flex flex-col lg:flex-row min-h-[640px]">

        {/* Left Branding Panel */}
        <AuthBrandingPanel
          titlePrefix="Your Home."
          highlightWord="Our Experts."
          subtitle="Book trusted professionals for all your home service needs."
        />

        {/* Right Authentication Area */}
        <div className="lg:w-[54%] bg-white p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
          <div className="max-w-[460px] w-full mx-auto space-y-6">

            {/* Brand Header */}
            <div className="text-center space-y-2">
              <Link to="/" className="inline-flex items-center gap-2 group">
                <div className="w-11 h-11 rounded-2xl bg-brand-accent flex items-center justify-center text-white shadow-md shadow-orange-950/30 group-hover:scale-105 transition-transform">
                  <Home className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  Home<span className="text-brand-accent">Serve</span>
                </span>
              </Link>
              <h2 className="text-xl font-extrabold text-slate-900 pt-2">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-500">
                Sign in to manage bookings and request doorstep services.
              </p>
            </div>

            {/* Error Banner */}
            {(formError || error) && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{formError || error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email Address */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-[#121417] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-[#121417] placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#121417] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full text-xs sm:text-sm pl-10 pr-11 py-3 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-[#121417] placeholder:text-slate-400 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-accent focus:ring-brand-accent accent-brand-accent cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => alert('Password reset will be available with SMS/Email OTP in Phase 7.')}
                  className="font-medium text-brand-accent hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-brand-accent hover:bg-brand-600 active:scale-[0.99] text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-orange-500/25 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#D9DEE7]"></div>
              <span className="flex-shrink mx-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                OR
              </span>
              <div className="flex-grow border-t border-[#D9DEE7]"></div>
            </div>

            {/* Social / Alternative Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => alert('Google authentication will be integrated in future phases.')}
                className="w-full border border-[#D9DEE7] hover:bg-slate-50 text-slate-700 font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const emailInput = document.getElementById('login-email');
                  if (emailInput) emailInput.focus();
                }}
                className="w-full border border-[#D9DEE7] hover:bg-slate-50 text-slate-700 font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Continue with email</span>
              </button>
            </div>

            {/* Register CTA */}
            <div className="text-center pt-2 text-xs text-slate-600">
              <span>Don't have an account? </span>
              <Link
                to="/signup"
                className="font-bold text-brand-accent hover:text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Create an account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Trust assurance */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Encrypted with industry-standard bcrypt &amp; JWT</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
