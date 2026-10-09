import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShieldCheck, ArrowLeft, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

const AuthPlaceholderPage = () => {
  const location = useLocation();
  const isSignUp = location.pathname.includes('signup');
  const [activeTab, setActiveTab] = useState(isSignUp ? 'signup' : 'login');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-[#F8FAFC]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl relative overflow-hidden">
        
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl pointer-events-none" />

        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-brand-accent flex items-center justify-center mx-auto shadow-sm">
            <Home className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {activeTab === 'signup' ? 'Create your Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-500">
            Access hyperlocal home services at your fingertips.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'signup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Placeholder UI form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone Number or Email
            </label>
            <input
              type="text"
              placeholder="+91 98765 43210 or user@example.com"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-brand-accent"
              disabled
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-brand-accent"
              disabled
            />
          </div>

          {/* Phase 2 Notification Card */}
          <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-brand-accent">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Phase 2 UI Notice</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-600">
              Authentication (JWT + bcrypt secure login, phone OTP, and role-based customer/technician sessions) is scheduled for the next development phase.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="w-full py-3 bg-slate-200 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>{activeTab === 'signup' ? 'Sign Up (Phase 3)' : 'Login (Phase 3)'}</span>
          </button>
        </div>

        {/* Trust Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>HomeServe Secure Customer Portal</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPlaceholderPage;

