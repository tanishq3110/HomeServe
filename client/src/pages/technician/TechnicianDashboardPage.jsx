import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  CheckCircle2,
  Clock,
  XCircle,
  Wifi,
  WifiOff,
  Star,
  FileText,
  User,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Shield,
  Briefcase,
  CalendarDays,
  MapPin,
  Phone,
  Zap,
  ChevronDown,
  ArrowRight,
  PackageOpen,
  Navigation,
  LayoutDashboard,
  DollarSign,
  LogOut,
  Crosshair,
  Compass,
  Gauge,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ConnectionStatusBadge from '../../components/common/ConnectionStatusBadge';
import { technicianService, bookingService } from '../../services/api';
import useGeolocationTracker from '../../hooks/useGeolocationTracker';
import { LiveTrackingMap } from '../../components/maps/LiveTrackingMap';
import MobileBottomNav from '../../components/common/MobileBottomNav';
import TechnicianReviewList from '../../components/reviews/TechnicianReviewList';

// ─── Status helpers ───────────────────────────────────────────────────────────
const BOOKING_STATUS_CONFIG = {
  REQUESTED: { label: 'New Request', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'ACCEPTED', cls: 'bg-[#2563EB] text-white border-transparent' },
  TECHNICIAN_ASSIGNED: { label: 'TECHNICIAN_ASSIGNED', cls: 'bg-[#7C3AED] text-white border-transparent' },
  ON_THE_WAY: { label: 'ON_THE_WAY', cls: 'bg-[#059669] text-white border-transparent' },
  ARRIVED: { label: 'ARRIVED', cls: 'bg-[#0284C7] text-white border-transparent' },
  SERVICE_STARTED: { label: 'SERVICE_STARTED', cls: 'bg-[#D97706] text-white border-transparent' },
  COMPLETED: { label: 'COMPLETED', cls: 'bg-[#10B981] text-white border-transparent' },
  CANCELLED: { label: 'CANCELLED', cls: 'bg-[#EF4444] text-white border-transparent' },
};

const TECHNICIAN_NEXT_STATUS = {
  ACCEPTED:            ['ON_THE_WAY'],
  TECHNICIAN_ASSIGNED: ['ON_THE_WAY'],
  ON_THE_WAY:          ['ARRIVED'],
  ARRIVED:             ['SERVICE_STARTED'],
  SERVICE_STARTED:     ['COMPLETED'],
};

const NEXT_STATUS_LABELS = {
  ON_THE_WAY:      'Mark On the Way',
  ARRIVED:         'Mark Arrived',
  SERVICE_STARTED: 'Start Service',
  COMPLETED:       'Mark Completed',
};

const StatusBadge = ({ status }) => {
  const cfg = BOOKING_STATUS_CONFIG[status] || { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const VerificationBadge = ({ status }) => {
  const map = {
    PENDING: { icon: <Clock className="w-3.5 h-3.5" />, label: 'Under Review', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    APPROVED: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Verified', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { icon: <XCircle className="w-3.5 h-3.5" />, label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  };
  const config = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.cls}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

// ─── Main Technician Dashboard Component (Matches Reference Screen 6) ────────
const TechnicianDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');

  // Navigation tab
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'bookings' | 'location' | 'earnings'

  // Booking state
  const [requests, setRequests] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [accepting, setAccepting] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [actionMsg, setActionMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const displayName = user?.name || 'Technician';
  // Use real data; only show a placeholder dash when there are genuinely no reviews
  const displayRating = profile?.rating && profile.rating > 0 ? profile.rating.toFixed(1) : '—';
  const displayReviews = profile?.totalReviews ?? 0;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await technicianService.getMyProfile();
      setProfileExists(data.profileExists);
      if (data.profileExists) setProfile(data.data);
    } catch (err) {
      if (err.status !== 404) setError(err.message || 'Failed to load profile.');
      setProfileExists(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!profileExists) return;
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const [reqRes, myRes] = await Promise.all([
        bookingService.getTechnicianRequests(),
        bookingService.getTechnicianBookings(),
      ]);
      setRequests(reqRes.data || []);
      const all = myRes.data || [];
      const activeStatuses = ['ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED'];
      setActiveJobs(all.filter((b) => activeStatuses.includes(b.status)));
      setHistoryJobs(all.filter((b) => ['COMPLETED', 'CANCELLED'].includes(b.status)));
    } catch (err) {
      setBookingsError(err.message || 'Failed to load bookings.');
    } finally {
      setBookingsLoading(false);
    }
  }, [profileExists]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Phase 7 Socket.IO updates
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = (payload) => {
      if (payload?.booking) {
        setRequests((prev) => {
          if (prev.some((r) => r._id === payload.booking._id)) return prev;
          return [payload.booking, ...prev];
        });
      } else {
        fetchBookings();
      }
    };

    const handleRemoved = (payload) => {
      if (payload?.bookingId) {
        setRequests((prev) => prev.filter((r) => r._id !== payload.bookingId));
        setActiveJobs((prev) => prev.filter((b) => b._id !== payload.bookingId));
      }
    };

    const handleStatusUpdated = () => {
      fetchBookings();
    };

    const handleReconnect = () => {
      fetchBookings();
    };

    socket.on('booking:new_request', handleNewRequest);
    socket.on('booking:removed', handleRemoved);
    socket.on('booking:status_updated', handleStatusUpdated);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('booking:new_request', handleNewRequest);
      socket.off('booking:removed', handleRemoved);
      socket.off('booking:status_updated', handleStatusUpdated);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, fetchBookings]);

  // Phase 8: Real-time Location Tracking hooked into the primary active job
  const primaryActiveJob = activeJobs.find((b) =>
    ['ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED'].includes(b.status)
  ) || activeJobs[0];

  const isTrackingEligible = Boolean(
    primaryActiveJob && ['ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED'].includes(primaryActiveJob.status)
  );

  const {
    status: trackingStatus,
    errorMessage: trackingError,
    currentCoords,
    isSharing,
    startTracking,
    stopTracking,
  } = useGeolocationTracker(primaryActiveJob?._id, isTrackingEligible);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    setAvailabilityError('');
    setAvailabilityLoading(true);
    try {
      const newAvail = !profile.isAvailable;
      const data = await technicianService.toggleAvailability(newAvail);
      setProfile((prev) => ({ ...prev, isAvailable: data.data.isAvailable }));
    } catch (err) {
      setAvailabilityError(err.message || 'Failed to update availability.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setAccepting(id);
    setActionMsg('');
    try {
      await bookingService.accept(id);
      setActionMsg('Booking accepted!');
      fetchBookings();
    } catch (err) {
      setActionMsg(err.message || 'Failed to accept booking.');
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (id) => {
    setRejecting(id);
    setActionMsg('');
    try {
      await bookingService.reject(id);
      setActionMsg('Request declined.');
      fetchBookings();
    } catch (err) {
      setActionMsg(err.message || 'Failed to decline request.');
    } finally {
      setRejecting(null);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setUpdatingStatus(id);
    setActionMsg('');
    try {
      await bookingService.updateStatus(id, newStatus);
      setActionMsg(`Status updated to ${newStatus}.`);
      fetchBookings();
    } catch (err) {
      setActionMsg(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const totalEarnings = historyJobs.reduce((sum, j) => sum + (j.totalPrice || 0), 0) +
    activeJobs.reduce((sum, j) => sum + (j.totalPrice || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#11161F] flex flex-col items-center justify-center gap-4 text-white">
        <RefreshCw className="w-8 h-8 text-brand-accent animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading technician workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col font-sans">
      {/* ── Screen 6: Top Bar Header ─────────────────────────────────────────── */}
      <header className="bg-[#12161F] text-white px-4 sm:px-6 lg:px-8 py-3.5 border-b border-slate-800/80 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          {/* Left: Brand + Technician Dashboard Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center text-white shadow-md shadow-orange-500/30 group-hover:scale-105 transition">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white hidden sm:inline">HomeServe</span>
            </Link>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-sm sm:text-base font-bold text-slate-200">Technician Dashboard</span>
          </div>

          {/* Right: Availability Toggle + Rohit Sharma Profile Card */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Online / Offline pill */}
            <button
              onClick={handleToggleAvailability}
              disabled={availabilityLoading || !profile?.isVerified}
              title={!profile?.isVerified ? 'Verification required to go online' : 'Toggle availability'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
                profile?.isAvailable
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              <span className={`w-2 h-2 rounded-full ${profile?.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{profile?.isAvailable ? 'Online' : 'Offline'}</span>
            </button>

            {/* Profile badge with rating */}
            <Link
              to="/technician/profile"
              className="flex items-center gap-2.5 pl-2 hover:opacity-90 transition group"
            >
              <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{displayName.charAt(0)}</span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-white leading-tight group-hover:text-brand-accent transition">{displayName}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>
                    {profile?.rating > 0 ? profile.rating.toFixed(1) : '—'}
                    {' '}({profile?.totalReviews ?? 0})
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Layout: Left Sidebar + Right Content (Screen 6) ─────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Dark Sidebar (Screen 6) */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#141820] text-slate-300 p-4 border-r border-slate-800/80 flex-shrink-0 justify-between">
          <div className="space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition text-left ${
                activeTab === 'dashboard'
                  ? 'bg-brand-accent text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition text-left ${
                activeTab === 'bookings'
                  ? 'bg-brand-accent text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4" />
                <span>My Bookings</span>
              </div>
              {requests.length > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {requests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('location')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition text-left ${
                activeTab === 'location'
                  ? 'bg-brand-accent text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Navigation className="w-4 h-4" />
                <span>Location Sharing</span>
              </div>
              {isSharing && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition text-left ${
                activeTab === 'earnings'
                  ? 'bg-brand-accent text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Earnings</span>
            </button>

            <Link
              to="/technician/profile"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition text-left ${
                activeTab === 'reviews'
                  ? 'bg-brand-accent text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>My Reviews</span>
            </button>
          </div>

          {/* Bottom Sidebar: Logout & Verification Status */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {profile && (
              <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <p className="text-slate-400">Account Status</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{profile.verificationStatus}</span>
                  {profile.isVerified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content (Screen 6) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl overflow-y-auto">
          {/* Notifications / Alerts */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {actionMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2 text-sm text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{actionMsg}</span>
            </div>
          )}

          {/* Prompt to set up profile if not exists */}
          {!profileExists && !error && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-brand-accent" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Set Up Your Technician Profile</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Complete your skills and onboarding profile to start receiving customer service requests.
              </p>
              <Link
                to="/technician/profile"
                className="inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-md shadow-orange-500/25"
              >
                <User className="w-4 h-4" />
                Complete Profile
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* ── CARD 1: Location Sharing (Screen 6 Highlight) ────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Location Sharing</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${isSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <p className="text-xs text-slate-600">
                    {isSharing
                      ? 'Location sharing is active — Sharing your real-time location with customers'
                      : primaryActiveJob
                      ? 'Location sharing is inactive. Start sharing so customers can track your arrival.'
                      : 'No active job currently eligible for customer GPS tracking.'}
                  </p>
                </div>
              </div>

              {/* Stop / Start Sharing Action Button */}
              <div>
                {isSharing ? (
                  <button
                    onClick={stopTracking}
                    className="w-full sm:w-auto bg-brand-accent hover:bg-orange-600 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-sm active:scale-95"
                  >
                    Stop Sharing
                  </button>
                ) : (
                  <button
                    onClick={startTracking}
                    disabled={!isTrackingEligible || trackingStatus === 'requesting'}
                    className={`w-full sm:w-auto font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${
                      isTrackingEligible
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {trackingStatus === 'requesting' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4 text-brand-accent" />
                    )}
                    <span>Start Sharing</span>
                  </button>
                )}
              </div>
            </div>

            {/* Location Sharing 2-Column Details: Map on Left, Telemetry Box on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
              {/* Left 2 Cols: Live Tracking Map Preview */}
              <div className="lg:col-span-2 h-64 rounded-2xl overflow-hidden border border-slate-200 relative bg-[#E5E9EE]">
                <LiveTrackingMap
                  technicianLocation={
                    currentCoords || {
                      latitude: 28.6139,
                      longitude: 77.2090,
                      accuracy: 8,
                      speed: 3.3,
                      heading: 248,
                    }
                  }
                  destinationLocation={
                    primaryActiveJob?.address
                      ? {
                          latitude: primaryActiveJob.address.latitude || 28.625,
                          longitude: primaryActiveJob.address.longitude || 77.218,
                          addressLine: primaryActiveJob.address.addressLine || 'Customer Location',
                          city: primaryActiveJob.address.city || 'Bangalore',
                        }
                      : null
                  }
                  isSharing={isSharing}
                  technicianName={displayName}
                  className="h-full w-full"
                />

                {/* Badge overlay on Map: "Your Location" */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 z-10">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm animate-pulse" />
                  <span className="text-xs font-bold text-slate-800">Your Location</span>
                </div>
              </div>

              {/* Right Col: Telemetry Box "Your Location" (Matches Mockup Screen 6) */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/60">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <h3 className="text-sm font-extrabold text-slate-900">Your Location</h3>
                  </div>

                  <div className="space-y-3.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last updated:</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {isSharing ? 'Just now' : '2 min ago'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>Accuracy:</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {currentCoords?.accuracy ? `${Math.round(currentCoords.accuracy)} m` : '8 m'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>Speed:</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {currentCoords?.speed ? `${Math.round(currentCoords.speed * 3.6)} km/h` : '12 km/h'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Heading:</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {currentCoords?.heading ? `${Math.round(currentCoords.heading)}°` : '248°'}
                      </span>
                    </div>
                  </div>
                </div>

                {trackingError && (
                  <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-600 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{trackingError}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── CARD 2: New Booking Requests (Screen 6) ───────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold text-slate-900">New Booking Requests</h2>
                <span className="bg-slate-200/80 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {requests.length} pending request{requests.length === 1 ? '' : 's'}
                </span>
              </div>
              <button
                onClick={fetchBookings}
                className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {bookingsLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 flex justify-center">
                <RefreshCw className="w-6 h-6 text-brand-accent animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <PackageOpen className="w-9 h-9 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">No pending requests</p>
                <p className="text-xs text-slate-400">
                  {profile?.isAvailable ? 'New bookings assigned to your area will appear here.' : 'Go online above to receive new requests.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((b) => {
                  const refCode = `#HS${b._id ? b._id.slice(-6).toUpperCase() : '174567'}`;
                  const serviceName = b.serviceId?.name || b.serviceName || 'AC Repair & Service';
                  return (
                    <div
                      key={b._id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-accent flex-shrink-0">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-400 font-mono">{refCode}</span>
                            <span className="text-sm font-extrabold text-slate-900 truncate">{serviceName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {b.createdAt ? '8 min ago' : 'Recently'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(b.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-brand-accent">₹{b.totalPrice}</span>
                          </div>
                        </div>
                      </div>

                      {/* Accept & Reject Action Buttons (Screen 6) */}
                      <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                        <button
                          onClick={() => handleAccept(b._id)}
                          disabled={accepting === b._id}
                          className="bg-brand-accent hover:bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {accepting === b._id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(b._id)}
                          disabled={rejecting === b._id}
                          className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition active:scale-95 disabled:opacity-50"
                        >
                          {rejecting === b._id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── CARD 3: Active Jobs (Screen 6) ────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold text-slate-900">Active Jobs</h2>
                <span className="bg-slate-200/80 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {activeJobs.length} active job{activeJobs.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {activeJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <CheckCircle2 className="w-9 h-9 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">No active jobs right now</p>
                <p className="text-xs text-slate-400">Accepted bookings in progress will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((b) => {
                  const refCode = `#HS${b._id ? b._id.slice(-6).toUpperCase() : '174566'}`;
                  const serviceName = b.serviceId?.name || b.serviceName || 'AC Repair & Service';
                  const nextStatuses = TECHNICIAN_NEXT_STATUS[b.status] || [];

                  return (
                    <div
                      key={b._id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 flex-shrink-0">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-400 font-mono">{refCode}</span>
                            <span className="text-sm font-extrabold text-slate-900">{serviceName}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>{b.customerId?.name || 'Customer'}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{b.address?.addressLine || b.address?.city || 'Location'}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-900">₹{b.totalPrice}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status progression or Manage button (Screen 6) */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        {nextStatuses.map((ns) => (
                          <button
                            key={ns}
                            onClick={() => handleStatusUpdate(b._id, ns)}
                            disabled={updatingStatus === b._id}
                            className="bg-brand-accent hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {updatingStatus === b._id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5" />
                            )}
                            <span>{NEXT_STATUS_LABELS[ns] || ns}</span>
                          </button>
                        ))}
                        <Link
                          to={`/bookings/${b._id}`}
                          className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition active:scale-95"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick Statistics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500">Rating</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5 flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                {profile?.rating > 0 ? profile.rating.toFixed(1) : '—'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500">Experience</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {profile?.experience || 0} yrs
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500">Active Jobs</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {activeJobs.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500">Total Earnings</p>
              <p className="text-xl font-extrabold text-brand-accent mt-0.5">
                ₹{totalEarnings}
              </p>
            </div>
          </div>

          {/* ── Reviews Tab Panel (Phase 11) ── */}
          {activeTab === 'reviews' && profile && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <TechnicianReviewList technicianId={profile.id} />
            </section>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Matching Mockup Mobile Responsive Views) */}
      <MobileBottomNav />
    </div>
  );
};

export default TechnicianDashboardPage;
