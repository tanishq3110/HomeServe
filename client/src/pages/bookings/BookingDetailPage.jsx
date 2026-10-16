import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Wrench,
  User,
  Phone,
  Home,
  Star,
  ArrowRight,
  Ban,
  ChevronRight,
  Navigation,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { bookingService, reviewService, walletService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBookingSocket } from '../../hooks/useBookingSocket';
import ConnectionStatusBadge from '../../components/common/ConnectionStatusBadge';
import LiveTrackingMap from '../../components/maps/LiveTrackingMap';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import MobileBottomNav from '../../components/common/MobileBottomNav';
import ReviewSection from '../../components/reviews/ReviewSection';

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  REQUESTED: { label: 'Requested', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, color: 'text-amber-500' },
  ACCEPTED: { label: 'Accepted', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2, color: 'text-blue-500' },
  TECHNICIAN_ASSIGNED: { label: 'Technician Assigned', cls: 'bg-violet-50 text-violet-700 border-violet-200', icon: User, color: 'text-violet-500' },
  ON_THE_WAY: { label: 'On the Way', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: ArrowRight, color: 'text-cyan-500' },
  ARRIVED: { label: 'Arrived', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: MapPin, color: 'text-indigo-500' },
  SERVICE_STARTED: { label: 'Service In Progress', cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: Wrench, color: 'text-orange-500' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, color: 'text-emerald-500' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle, color: 'text-rose-500' },
};

const STATUS_ORDER = [
  'REQUESTED', 'ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED', 'COMPLETED',
];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
const Row = ({ icon: Icon, label, value, valueClass = '' }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div>
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className={`text-sm font-bold text-slate-800 ${valueClass}`}>{value}</p>
    </div>
  </div>
);

// ─── Status Timeline ──────────────────────────────────────────────────────────
const StatusTimeline = ({ status }) => {
  const currentIdx = status === 'CANCELLED' ? -1 : STATUS_ORDER.indexOf(status);
  return (
    <div className="space-y-2">
      {status === 'CANCELLED' ? (
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-sm font-bold text-rose-600">Booking Cancelled</span>
        </div>
      ) : (
        STATUS_ORDER.map((s, i) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                  done ? 'bg-brand-accent border-brand-accent' : 'bg-white border-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${done ? 'text-white' : 'text-slate-300'}`} />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className={`text-xs font-semibold ${active ? 'text-brand-accent' : done ? 'text-slate-700' : 'text-slate-300'}`}>
                  {cfg.label}
                </span>
                {active && <span className="text-[10px] font-bold text-brand-accent bg-orange-50 px-2 py-0.5 rounded-full">Current</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ─── Cancel modal ─────────────────────────────────────────────────────────────
const CancelModal = ({ onConfirm, onClose, loading }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
            <Ban className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900">Cancel Booking</h3>
            <p className="text-xs text-slate-500">This action cannot be undone.</p>
          </div>
        </div>
        <textarea
          rows={3}
          placeholder="Reason for cancellation (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2.5 rounded-xl transition">Keep Booking</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" />Cancel Booking</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [activeTab, setActiveTab] = useState('Tracking');

  // Phase 14: Wallet Payment & Refund state
  const [walletBalance, setWalletBalance] = useState(null);
  const [payingWallet, setPayingWallet] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');

  // Phase 11: Review state
  const [existingReview, setExistingReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Phase 8: Technician Live GPS Tracking State
  const [technicianLocation, setTechnicianLocation] = useState(null);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [, setTick] = useState(0);

  // Periodically refresh relative time string
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bRes, locRes] = await Promise.all([
        bookingService.getById(id),
        bookingService.getLocation(id).catch(() => ({ data: null })),
      ]);
      setBooking(bRes.data);

      if (locRes?.data) {
        setIsLocationSharing(Boolean(locRes.data.isSharing));
        if (locRes.data.location) {
          setTechnicianLocation(locRes.data.location);
        } else if (bRes.data?.lastLocation) {
          setTechnicianLocation(bRes.data.lastLocation);
        }
      } else if (bRes.data?.lastLocation) {
        setTechnicianLocation(bRes.data.lastLocation);
        setIsLocationSharing(Boolean(bRes.data.lastLocation.isSharing));
      }

      // Phase 14: Fetch customer wallet balance
      if (user?.role === 'CUSTOMER') {
        walletService.getWallet()
          .then((wRes) => {
            if (wRes?.success) setWalletBalance(Number(wRes.data.balanceRupees));
          })
          .catch(() => {});
      }

      // Phase 11: Fetch existing review if booking is COMPLETED
      if (bRes.data?.status === 'COMPLETED') {
        setReviewLoading(true);
        reviewService.getByBookingId(id)
          .then((rRes) => setExistingReview(rRes.data || null))
          .catch(() => setExistingReview(null))
          .finally(() => setReviewLoading(false));
      }
    } catch (err) {
      setError(err.message || 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Real-time Socket.IO status updates & Phase 8 location updates
  const handleStatusUpdated = useCallback((payload) => {
    if (!payload) return;
    setBooking((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: payload.status,
        updatedAt: payload.updatedAt || new Date().toISOString(),
        ...(payload.booking?.technicianId !== undefined ? { technicianId: payload.booking.technicianId } : {}),
        ...(payload.booking?.cancellationReason ? { cancellationReason: payload.booking.cancellationReason } : {}),
        ...(payload.booking?.cancelledBy ? { cancelledBy: payload.booking.cancelledBy } : {}),
      };
    });

    // If status became terminal or ineligible, stop sharing state
    const INELIGIBLE = ['SERVICE_STARTED', 'COMPLETED', 'CANCELLED'];
    if (INELIGIBLE.includes(payload.status)) {
      setIsLocationSharing(false);
    }

    // Re-fetch populated data in background so full nested models remain consistent
    bookingService.getById(id).then((res) => {
      if (res?.data) setBooking(res.data);
    }).catch(() => {});
  }, [id]);

  // Phase 8: Location event callbacks
  const handleLocationUpdated = useCallback((payload) => {
    if (!payload) return;
    setTechnicianLocation({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      heading: payload.heading,
      speed: payload.speed,
      updatedAt: payload.timestamp || new Date().toISOString(),
    });
    setIsLocationSharing(true);
  }, []);

  const handleSharingStarted = useCallback(() => {
    setIsLocationSharing(true);
  }, []);

  const handleSharingStopped = useCallback(() => {
    setIsLocationSharing(false);
  }, []);

  useBookingSocket(id, handleStatusUpdated, fetchBooking, {
    onLocationUpdated: handleLocationUpdated,
    onSharingStarted: handleSharingStarted,
    onSharingStopped: handleSharingStopped,
  });

  const handleCancel = async (reason) => {
    setCancelling(true);
    setCancelError('');
    try {
      await bookingService.cancel(id, reason);
      setShowCancelModal(false);
      fetchBooking();
    } catch (err) {
      setCancelError(err.message || 'Cancellation failed.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayWithWallet = async () => {
    setPayingWallet(true);
    setPaymentError('');
    setPaymentSuccess('');
    try {
      const res = await walletService.payForBooking(id);
      if (res.success) {
        setPaymentSuccess(res.message || 'Payment completed successfully from wallet!');
        fetchBooking();
      }
    } catch (err) {
      setPaymentError(err.message || 'Payment failed.');
    } finally {
      setPayingWallet(false);
    }
  };

  const handleClaimRefund = async () => {
    setRefunding(true);
    setPaymentError('');
    setRefundMessage('');
    try {
      const res = await walletService.refundBooking(id);
      if (res.success) {
        setRefundMessage(res.message || 'Refund credited back to your wallet.');
        fetchBooking();
      }
    } catch (err) {
      setPaymentError(err.message || 'Refund failed.');
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading booking details..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <ErrorState
          title="Booking Not Found"
          message={error || 'The requested booking could not be found or you may not have permission to view it.'}
          actionLabel="My Bookings"
          actionLink="/bookings"
        />
      </div>
    );
  }

  const service = booking.serviceId;
  const tech = booking.technicianId;
  const addr = booking.address;
  const cancellable = ['REQUESTED', 'ACCEPTED'].includes(booking.status) && user?.role === 'CUSTOMER';

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-16">
      {/* Header */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Booking</span>
                <span className="text-white text-base font-mono font-bold">
                  #{booking._id?.slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ConnectionStatusBadge onRefresh={fetchBooking} />
              </div>
            </div>
            <StatusBadge status={booking.status} size="md" />
          </div>

          {/* Screen 5 Navigation Tabs */}
          <div className="flex gap-6 border-b border-white/10 mt-6 -mb-6">
            {['Tracking', 'Details', 'Chat'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  if (tab === 'Chat') {
                    alert('Technician live chat is being prepared for the upcoming customer support release.');
                  } else {
                    setActiveTab(tab);
                  }
                }}
                className={`pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === tab
                    ? 'border-[#FF5A1F] text-[#FF5A1F]'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ── 2-Column Split matching Screen 5 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column (5 cols): Status Timeline, Service Info, Address, Actions */}
          <div className="lg:col-span-5 space-y-5">
            {/* ── Status Timeline Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Status Timeline</h3>
              <StatusTimeline status={booking.status} />
            </div>

            {/* ── Service Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{service?.name || booking.serviceName || '—'}</p>
                  <p className="text-xs text-slate-400">{service?.category || ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <Row icon={CalendarDays} label="Date" value={formatDate(booking.scheduledDate)} />
                <Row icon={Clock} label="Time" value={booking.scheduledTime} />
              </div>
              <div className="flex items-center gap-2">
                {booking.urgency === 'URGENT' ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-brand-accent bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                    <Zap className="w-3.5 h-3.5 fill-brand-accent" /> Urgent Service
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Normal Priority</span>
                )}
              </div>
            </div>

            {/* ── Address ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-extrabold text-slate-900 text-sm mb-3">Service Address</h3>
              <div className="space-y-3">
                <Row icon={User} label="Name" value={addr?.fullName || '—'} />
                <Row icon={Phone} label="Phone" value={addr?.phone || '—'} />
                <Row icon={Home} label="Address" value={[addr?.addressLine, addr?.landmark, addr?.city, addr?.state, addr?.postalCode].filter(Boolean).join(', ')} />
              </div>
            </div>

            {/* ── Customer Notes ── */}
            {booking.customerNotes && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-extrabold text-slate-900 text-sm mb-2">Your Notes</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{booking.customerNotes}</p>
              </div>
            )}

            {/* ── Cancellation Info ── */}
            {booking.status === 'CANCELLED' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <h3 className="font-extrabold text-rose-700 text-sm">Cancellation Details</h3>
                </div>
                {booking.cancellationReason && (
                  <p className="text-xs text-rose-600">Reason: {booking.cancellationReason}</p>
                )}
              </div>
            )}

            {/* ── Actions ── */}
            {cancelError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {cancelError}
              </div>
            )}

            <div className="flex gap-3">
              <Link
                to="/bookings"
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all text-center"
              >
                My Bookings
              </Link>
              {cancellable && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  Cancel Booking
                </button>
              )}
            </div>
          </div>

          {/* Right Column (7 cols): Live Tracking Map, Technician Profile, Price Breakdown */}
          <div className="lg:col-span-7 space-y-5">

            {/* ── Phase 9: Real-Time Live Tracking Map ── */}
            {['ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED'].includes(booking.status) && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-extrabold text-slate-800">
                      Live Tracking
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLocationSharing ? (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Sharing Location
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        Not Sharing
                      </span>
                    )}
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  </div>
                </div>

                <LiveTrackingMap
                  technicianLocation={technicianLocation}
                  destinationLocation={
                    addr?.latitude && addr?.longitude
                      ? {
                          latitude: addr.latitude,
                          longitude: addr.longitude,
                          addressLine: addr.addressLine,
                          city: addr.city,
                        }
                      : null
                  }
                  isSharing={isLocationSharing}
                  technicianName={tech?.userId?.name || 'Technician'}
                />

                <div className="text-center text-[11px] text-slate-400">
                  {(() => {
                    if (!technicianLocation?.updatedAt) {
                      return isLocationSharing ? 'Acquiring GPS fix...' : 'Technician will share location when travelling';
                    }
                    const diffSeconds = Math.max(
                      0,
                      Math.floor((Date.now() - new Date(technicianLocation.updatedAt).getTime()) / 1000)
                    );
                    if (diffSeconds > 60) return 'Location temporarily unavailable';
                    if (diffSeconds < 5) return 'Updated just now';
                    return `Updated ${diffSeconds}s ago`;
                  })()}
                </div>
              </div>
            )}

            {/* ── Technician Profile Card matching Screen 5 ── */}
            {tech && tech.userId && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-2xl bg-[#FF5A1F]/10 text-[#FF5A1F] flex items-center justify-center flex-shrink-0 font-bold text-lg">
                      {tech.userId?.name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {tech.userId?.name || 'Technician'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {tech.rating > 0 ? tech.rating.toFixed(1) : '4.8'}
                        </span>
                        <span>•</span>
                        <span>{tech.skills?.[0] || 'AC Service Expert'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Call Button in solid orange matching Screen 5 */}
                  <a
                    href={`tel:${tech.userId?.phone || ''}`}
                    className="inline-flex items-center gap-1.5 bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm shadow-orange-500/20 flex-shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            )}

            {/* ── Service Summary & Price Breakdown matching Screen 5 ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-extrabold text-slate-900 text-sm mb-4">Service Summary</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Base Price</span>
                  <span className="font-semibold text-slate-800">₹{booking.basePrice}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Urgency Charge</span>
                  <span className={`font-semibold ${booking.urgencyCharge > 0 ? 'text-[#FF5A1F]' : 'text-emerald-600'}`}>
                    {booking.urgencyCharge > 0 ? `+₹${booking.urgencyCharge}` : '₹0'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Distance Charge</span>
                  <span className="font-semibold text-emerald-600">
                    {booking.distanceCharge > 0 ? `+₹${booking.distanceCharge}` : '₹0'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-3 mt-1">
                  <span>Total</span>
                  <span className="text-[#FF5A1F] text-xl font-black">₹{booking.totalPrice}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Payment Status</span>
                <span className={`font-bold ${
                  booking.paymentStatus === 'PAID' ? 'text-emerald-600' :
                  booking.paymentStatus === 'REFUNDED' ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {booking.paymentStatus}
                </span>
              </div>

              {/* Phase 14: Payment Status Card & Wallet Payment Action */}
              {booking.paymentStatus === 'PAID' && (
                <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 block">Payment Completed</span>
                      <span className="text-[11px] text-emerald-700">Settled securely via HomeServe Wallet</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-700">₹{booking.totalPrice}</span>
                </div>
              )}

              {booking.paymentStatus === 'REFUNDED' && (
                <div className="mt-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-blue-900 block">Payment Refunded</span>
                      <span className="text-[11px] text-blue-700">Credited back to your wallet ledger</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-blue-700">₹{booking.totalPrice}</span>
                </div>
              )}

              {/* Claim Refund for cancelled booking if not yet refunded */}
              {booking.status === 'CANCELLED' && booking.paymentStatus === 'PAID' && user?.role === 'CUSTOMER' && (
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    This booking was cancelled. You can claim an immediate internal refund to your wallet.
                  </div>
                  <button
                    onClick={handleClaimRefund}
                    disabled={refunding}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${refunding ? 'animate-spin' : ''}`} />
                    {refunding ? 'Processing Refund...' : `Claim ₹${booking.totalPrice} Refund to Wallet`}
                  </button>
                </div>
              )}

              {/* Eligible for Payment from Wallet */}
              {user?.role === 'CUSTOMER' &&
                ['REQUESTED', 'ACCEPTED', 'TECHNICIAN_ASSIGNED'].includes(booking.status) &&
                booking.paymentStatus !== 'PAID' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-[#FF5A1F]" />
                        <span className="text-slate-600 font-medium">Your Wallet Balance:</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{walletBalance !== null ? walletBalance.toFixed(2) : '...'}
                      </span>
                    </div>

                    {paymentError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{paymentError}</span>
                      </div>
                    )}
                    {paymentSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{paymentSuccess}</span>
                      </div>
                    )}

                    {walletBalance !== null && walletBalance < booking.totalPrice ? (
                      <div className="space-y-1.5">
                        <button
                          disabled
                          className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Insufficient Wallet Balance (₹{walletBalance.toFixed(2)})
                        </button>
                        <p className="text-[11px] text-slate-400 text-center">
                          Wallet balance is insufficient.{' '}
                          <Link to="/wallet" className="text-[#FF5A1F] hover:underline font-bold">
                            View Wallet
                          </Link>
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handlePayWithWallet}
                        disabled={payingWallet}
                        className="w-full py-2.5 bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CreditCard className={`w-3.5 h-3.5 ${payingWallet ? 'animate-spin' : ''}`} />
                        {payingWallet ? 'Processing Payment...' : `Pay ₹${booking.totalPrice} with Wallet`}
                      </button>
                    )}
                  </div>
                )}
            </div>

            {/* ── Phase 11: Review Section (COMPLETED bookings only) ── */}
            {booking.status === 'COMPLETED' && user?.role === 'CUSTOMER' && !reviewLoading && (
              <ReviewSection
                booking={booking}
                existingReview={existingReview}
                onReviewSubmitted={(review) => setExistingReview(review)}
              />
            )}

          </div>

        </div>

        {showCancelModal && (
          <CancelModal
            onConfirm={handleCancel}
            onClose={() => setShowCancelModal(false)}
            loading={cancelling}
          />
        )}
      </div>

      {/* Mobile Responsive Navigation Bar matching Screen 5 */}
      <MobileBottomNav />
    </div>
  );
};

export default BookingDetailPage;
