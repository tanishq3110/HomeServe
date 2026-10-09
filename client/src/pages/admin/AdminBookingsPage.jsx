import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  MapPin,
  User,
  Wrench,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronRight,
  ArrowRight,
  PackageOpen,
  Phone,
  Zap,
} from 'lucide-react';
import { bookingService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import ConnectionStatusBadge from '../../components/common/ConnectionStatusBadge';
import StatusBadge from '../../components/common/StatusBadge';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';

const PAYMENT_CONFIG = {
  PENDING: 'text-amber-600',
  PAID: 'text-emerald-600',
  FAILED: 'text-rose-600',
  REFUNDED: 'text-blue-600',
};

const STATUSES = ['', 'REQUESTED', 'ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED', 'COMPLETED', 'CANCELLED'];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Booking Row ──────────────────────────────────────────────────────────────
const BookingRow = ({ booking }) => {
  const [expanded, setExpanded] = useState(false);
  const service = booking.serviceId;
  const customer = booking.customerId;
  const tech = booking.technicianId;
  const addr = booking.address;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-brand-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 text-sm truncate">
                {service?.name || booking.serviceName || '—'}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                #{booking._id?.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={booking.status} />
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{customer?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDate(booking.scheduledDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{booking.scheduledTime}</span>
          </div>
          <div className="text-right font-black text-brand-accent">₹{booking.totalPrice}</div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Customer & Technician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Customer</p>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">{customer?.name || '—'}</span>
              </div>
              {customer?.email && (
                <p className="text-xs text-slate-500">{customer.email}</p>
              )}
              {customer?.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Technician</p>
              {tech && tech.userId ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{tech.userId?.name || '—'}</span>
                  </div>
                  {tech.userId?.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tech.userId.phone}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">Not yet assigned</p>
              )}
            </div>
          </div>

          {/* Address */}
          {addr && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Service Address</p>
              <p className="text-xs text-slate-700">
                {[addr.fullName, addr.addressLine, addr.landmark, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
              </p>
              {addr.phone && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {addr.phone}
                </p>
              )}
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Price Breakdown</p>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Base Fee</span><span className="font-semibold">₹{booking.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Urgency Charge</span>
                <span className={`font-semibold ${booking.urgencyCharge > 0 ? 'text-brand-accent' : 'text-emerald-600'}`}>
                  {booking.urgencyCharge > 0 ? `₹${booking.urgencyCharge}` : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Distance Charge</span>
                <span className="font-semibold text-emerald-600">{booking.distanceCharge > 0 ? `₹${booking.distanceCharge}` : 'None'}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Total</span><span className="text-brand-accent">₹{booking.totalPrice}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Payment</span>
                <span className={`font-bold ${PAYMENT_CONFIG[booking.paymentStatus] || 'text-slate-600'}`}>
                  {booking.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Urgency + Notes + Cancellation */}
          <div className="flex flex-wrap gap-2">
            {booking.urgency === 'URGENT' && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-brand-accent bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                <Zap className="w-3 h-3 fill-brand-accent" /> Urgent
              </span>
            )}
            {booking.status === 'CANCELLED' && booking.cancellationReason && (
              <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                Reason: {booking.cancellationReason}
              </span>
            )}
          </div>

          {booking.customerNotes && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
              <span className="font-bold text-slate-700">Customer notes:</span> {booking.customerNotes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await bookingService.adminGetAll(params);
      setBookings(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Phase 7: Real-time Socket.IO updates for Admin
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

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
              ...(payload.booking?.cancellationReason ? { cancellationReason: payload.booking.cancellationReason } : {}),
            };
          }
          return b;
        })
      );
    };

    const handleReconnect = () => {
      fetchBookings();
    };

    socket.on('booking:created', handleCreated);
    socket.on('booking:status_updated', handleStatusUpdated);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('booking:created', handleCreated);
      socket.off('booking:status_updated', handleStatusUpdated);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, fetchBookings]);

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-16">
      {/* Header */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">Admin Panel</span>
            </div>
            <ConnectionStatusBadge onRefresh={fetchBookings} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Bookings Management</h1>
          <p className="text-slate-400 text-sm mt-1">View and inspect all platform bookings with live real-time updates.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 space-y-5">

        {/* Stat chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: bookings.length, cls: 'bg-white border-slate-200 text-slate-900' },
            { label: 'Pending', value: (counts.REQUESTED || 0) + (counts.ACCEPTED || 0), cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { label: 'Active', value: (counts.ON_THE_WAY || 0) + (counts.ARRIVED || 0) + (counts.SERVICE_STARTED || 0), cls: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
            { label: 'Completed', value: counts.COMPLETED || 0, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl border p-4 shadow-sm ${stat.cls}`}>
              <p className="text-2xl font-extrabold">{stat.value}</p>
              <p className="text-xs font-semibold mt-0.5 opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            Filter by Status:
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  statusFilter === s
                    ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          <button onClick={fetchBookings} className="ml-auto flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <ErrorState
            title="Failed to Load Bookings"
            message={error}
            actionLabel="Try Again"
            onAction={fetchBookings}
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <SkeletonLoader variant="card" count={3} />
          </div>
        )}

        {/* Empty */}
        {!loading && !error && bookings.length === 0 && (
          <EmptyState
            title="No Bookings Found"
            message={statusFilter ? `No ${statusFilter.toLowerCase()} bookings found.` : 'No bookings have been created yet on the platform.'}
            actionLabel="Clear Filter"
            onAction={() => setStatusFilter('')}
          />
        )}

        {/* Desktop Table View matching Screen 7 */}
        {!loading && !error && bookings.length > 0 && (
          <>
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-5">Booking Details</th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Technician</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className="font-mono text-slate-400 text-[11px] block">#{b._id?.slice(-6).toUpperCase()}</span>
                        <span className="font-bold text-slate-900 block">{b.serviceId?.name || b.serviceName}</span>
                        <span className="text-slate-500 text-[11px]">{formatDate(b.scheduledDate)} · {b.scheduledTime}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-800 block">{b.customerId?.name || b.address?.fullName || '—'}</span>
                        <span className="text-slate-500 text-[11px]">{b.customerId?.phone || b.address?.phone || '—'}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        {b.technicianId?.userId?.name ? (
                          <>
                            <span className="font-bold text-slate-800 block">{b.technicianId.userId.name}</span>
                            <span className="text-slate-500 text-[11px]">⭐ {b.technicianId.rating ? b.technicianId.rating.toFixed(1) : '4.8'}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <StatusBadge status={b.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/bookings/${b._id}`}
                          className="inline-flex items-center gap-1 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
              <p className="text-xs font-bold text-slate-500">
                Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                {statusFilter ? ` with status ${statusFilter}` : ''}
              </p>
              {bookings.map((b) => (
                <BookingRow key={b._id} booking={b} />
              ))}
            </div>
          </>
        )}

        {/* Back to technicians */}
        <Link
          to="/admin/technicians"
          className="inline-flex items-center gap-2 text-xs font-bold text-brand-accent hover:underline"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Technicians
        </Link>
      </div>
    </div>
  );
};

export default AdminBookingsPage;
