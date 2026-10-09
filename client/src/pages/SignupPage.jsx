import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Wrench,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthBrandingPanel from '../components/auth/AuthBrandingPanel';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' or 'TECHNICIAN'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, isAuthenticated, error, clearError } = useAuth();
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

    if (!name.trim() || name.trim().length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!email.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify.');
      return;
    }

    if (role !== 'CUSTOMER' && role !== 'TECHNICIAN') {
      setFormError('Invalid role selected.');
      return;
    }

    setSubmitting(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      role,
    });
    setSubmitting(false);

    if (result.success) {
      navigate(redirectPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Centered Split-Screen Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[32px] overflow-hidden shadow-2xl border border-slate-200/70 flex flex-col lg:flex-row min-h-[700px]">

        {/* Left Branding Panel */}
        <AuthBrandingPanel
          titlePrefix="Everything Your Home Needs."
          highlightWord="One Trusted Platform."
          subtitle="Find trusted professionals for repairs, cleaning, maintenance and more."
        />

        {/* Right Authentication Area */}
        <div className="lg:w-[54%] bg-white p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
          <div className="max-w-[460px] w-full mx-auto space-y-5">

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
                Create Your Account
              </h2>
              <p className="text-xs text-slate-500">
                Join HomeServe as a customer or service professional.
              </p>
            </div>

            {/* Role Segmented Control */}
            <div className="pt-1">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F1F3F7] rounded-xl border border-[#D9DEE7]/80">
                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    role === 'CUSTOMER'
                      ? 'bg-brand-accent text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('TECHNICIAN')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    role === 'TECHNICIAN'
                      ? 'bg-brand-accent text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Technician</span>
                </button>
              </div>
            </div>

            {role === 'TECHNICIAN' && (
              <p className="text-[11px] text-brand-accent font-medium bg-orange-50 p-2 rounded-xl border border-orange-200/60 leading-snug">
                ℹ️ Service professionals will register basic credentials now. Profile verification, skill onboarding, and document checks will occur in Phase 5.
              </p>
            )}

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

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* Full Name */}
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-semibold text-[#121417] mb-1"
                >
                  Full name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-[#121417] placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-[#121417] mb-1"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-[#121417] placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="signup-phone"
                  className="block text-xs font-semibold text-[#121417] mb-1"
                >
                  Phone number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your mobile number"
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-[#121417] placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-[#121417] mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password (min. 6 chars)"
                    className="w-full text-xs sm:text-sm pl-10 pr-11 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-[#121417] placeholder:text-slate-400 shadow-2xs"
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

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-xs font-semibold text-[#121417] mb-1"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full text-xs sm:text-sm pl-10 pr-11 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-[#121417] placeholder:text-slate-400 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Terms Notice */}
            <p className="text-[11px] text-center text-slate-500 leading-normal">
              By creating an account, you agree to our{' '}
              <span className="text-slate-700 underline cursor-pointer">Terms of Service</span> and{' '}
              <span className="text-slate-700 underline cursor-pointer">Privacy Policy</span>.
            </p>

            {/* Bottom Login CTA */}
            <div className="text-center pt-2 text-xs text-slate-600 border-t border-slate-100">
              <span>Already have an account? </span>
              <Link
                to="/login"
                className="font-bold text-brand-accent hover:text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Sign in</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Security assurance */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Never sharing your personal information with third parties</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
