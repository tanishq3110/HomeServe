import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Calendar, 
  LogOut, 
  ArrowLeft, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  if (!user) {
    return null;
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recent Member';

  return (
    <div className="min-h-[80vh] bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            Protected Account Area
          </span>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
          
          {/* Header Profile Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-8 border-b border-slate-100 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-accent shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-brand-accent text-white font-black text-2xl flex items-center justify-center shadow-md shadow-orange-950/20">
                  {initials}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900">
                    {user.name}
                  </h1>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : user.role === 'TECHNICIAN'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  HomeServe Account ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{user.id || user._id}</code>
                </p>
              </div>
            </div>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Account Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Email */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-accent" />
                Email Address
              </span>
              <p className="text-sm font-semibold text-slate-800 break-all">
                {user.email}
              </p>
            </div>

            {/* Phone */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-accent" />
                Contact Phone
              </span>
              <p className="text-sm font-semibold text-slate-800">
                {user.phone || 'Not provided'}
              </p>
            </div>

            {/* Role */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
                Platform Role
              </span>
              <p className="text-sm font-semibold text-slate-800">
                {user.role} Account
              </p>
            </div>

            {/* Member Since */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                Registration Date
              </span>
              <p className="text-sm font-semibold text-slate-800">
                {memberSince}
              </p>
            </div>

          </div>

          {/* Role-Specific Information Notice */}
          {user.role === 'TECHNICIAN' && (
            <div className="p-6 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-4">
              <div className="flex items-center gap-2 font-bold text-blue-800">
                <Wrench className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm">Service Professional Workspace</span>
              </div>
              <p className="text-xs leading-relaxed text-blue-900">
                Manage your verification credentials, skills, hourly rate, bio, and toggle your live availability (ONLINE / OFFLINE) from your dedicated dashboard.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <Link
                  to="/technician/dashboard"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Go to Technician Dashboard</span>
                </Link>
                <Link
                  to="/technician/profile"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-blue-800 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Edit Skills & KYC Documents</span>
                </Link>
              </div>
            </div>
          )}

          {user.role === 'ADMIN' && (
            <div className="p-6 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 space-y-4">
              <div className="flex items-center gap-2 font-bold text-purple-800">
                <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <span className="text-sm">Administrator Control Center</span>
              </div>
              <p className="text-xs leading-relaxed text-purple-900">
                Review pending technician onboarding applications, inspect uploaded ID and trade certificates, and approve or reject service professionals.
              </p>
              <div className="pt-1">
                <Link
                  to="/admin/technicians"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Open Technicians Management</span>
                </Link>
              </div>
            </div>
          )}

          {user.role === 'CUSTOMER' && (
            <div className="p-5 rounded-2xl bg-orange-50/70 border border-orange-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-brand-accent">
                <CheckCircle2 className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span>Customer Privileges Active</span>
              </div>
              <p className="text-[12px] leading-relaxed text-slate-600">
                You can browse verified home service technicians across electrical, plumbing, cleaning, AC repair, and carpentry.
              </p>
            </div>
          )}

          {/* Action Links */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              to="/services"
              className="flex-1 bg-brand-accent hover:bg-brand-600 text-white font-bold text-xs py-3 rounded-xl transition-colors text-center shadow-sm"
            >
              Explore Home Services
            </Link>
            <Link
              to="/"
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors text-center"
            >
              Return to Homepage
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfilePage;

