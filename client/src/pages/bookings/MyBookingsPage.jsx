import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MapPin,
  Zap,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Wrench,
  Filter,
  PackageOpen,
  ArrowRight,
  User,
} from 'lucide-react';
import { bookingService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import ConnectionStatusBadge from '../../components/common/ConnectionStatusBadge';
import StatusBadge from '../../components/common/StatusBadge';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import MobileBottomNav from '../../components/common/MobileBottomNav';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const TABS = [
  { label: 'All', value: '' },
  { label: 'Requested', value: 'REQUESTED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

// Active bookings filter (multiple statuses)
const ACTIVE_STATUSES = ['ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED'];

// ─── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard = ({ booking }) => {
  const service = booking.serviceId;
  const tech = booking.technicianId;

  return (
    <Link
      to={`/bookings/${booking._id}`}
      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-[#FF5A1F]/40 transition-all group block"
    >
      {/* Top Status Pill matching Screen 4 */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <StatusBadge status={booking.status} size="sm" />
        <span className="text-[10px] text-slate-400 font-mono">
          #{booking._id?.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* Main Row: Service Icon, Details & Big Price on Right matching Screen 4 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 text-sm sm:text-base truncate group-hover:text-[#FF5A1F] transition-colors">
              {service?.name || booking.serviceName || 'Service'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>{formatDate(booking.scheduledDate)}</span>
              <span>•</span>
              <span>{booking.scheduledTime}</span>
              {booking.urgency === 'URGENT' && (
                <span className="text-[#FF5A1F] font-bold text-[11px] bg-orange-50 px-1.5 py-0.2 rounded">Urgent</span>
              )}
            </p>
            {tech?.userId?.name && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Technician: <strong className="text-slate-600">{tech.userId.name}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Large Price on Right matching Screen 4 */}
        <div className="text-right flex-shrink-0">
          <p className="text-lg sm:text-xl font-black text-slate-900">
            ₹{booking.totalPrice}
          </p>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#FF5A1F] group-hover:underline mt-0.5">
            Details &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingService.getMyBookings();
      setBookings(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Phase 7: Real-time Socket.IO status updates & creations
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdated = (payload) => {
      if (!payload?.bookingId) return;
      setBookings((prev) =>
        prev.map((b) => {
          if (b._id === payload.bookingId) {
            return {
              ...b,
              status: payload.status,
              updatedAt: payload.updatedAt || new Date().toISOString(),
              ...(payload.booking?.technicianId !== undefined ? { technicianId: payload.booking.technicianId } : {}),
            };
          }
          return b;
        })
      );
    };

    const handleCreated = (payload) => {
      if (payload?.booking) {
        setBookings((prev) => {
          if (prev.some((b) => b._id === payload.booking._id)) return prev;
          return [payload.booking, ...prev];
        });
      } else {
        fetchBookings();
      }
    };

    const handleReconnect = () => {
      fetchBookings();
    };

    socket.on('booking:status_updated', handleStatusUpdated);
    socket.on('booking:created', handleCreated);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('booking:status_updated', handleStatusUpdated);
      socket.off('booking:created', handleCreated);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, fetchBookings]);

  // Filter bookings by tab
  const filtered = bookings.filter((b) => {
    if (!activeTab) return true;
    if (activeTab === 'ACTIVE') return ACTIVE_STATUSES.includes(b.status);
    return b.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-16">
      {/* Header */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">My Bookings</span>
            </div>
            <ConnectionStatusBadge onRefresh={fetchBookings} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your Service History</h1>
          <p className="text-slate-400 text-sm mt-1">Track and manage all your HomeServe bookings in real-time.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 space-y-5">
        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.value
                  ? 'bg-brand-accent text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.value === '' && bookings.length > 0 && (
                <span className="ml-1.5 bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{bookings.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <ErrorState
            title="Failed to Load Bookings"
            message={error}
            actionLabel="Try Again"
            onAction={fetchBookings}
          />
        )}

        {/* Loading state with skeletons */}
        {loading && (
          <div className="space-y-4">
            <SkeletonLoader variant="card" count={3} />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title="No Bookings Found"
            message={activeTab ? `You have no ${activeTab.toLowerCase()} bookings at the moment.` : "You haven't made any service bookings yet."}
            actionLabel="Browse Services"
            actionLink="/services"
          />
        )}

        {/* Booking cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={fetchBookings}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
            {filtered.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Responsive Navigation Bar matching Screen 4 */}
      <MobileBottomNav />
    </div>
  );
};

export default MyBookingsPage;
