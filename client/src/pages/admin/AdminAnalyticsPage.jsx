import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { adminAnalyticsService } from '../../services/api';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';

// ── Star Display Helper ───────────────────────────────────────────────────────
const StarDisplay = ({ rating, size = 'w-3.5 h-3.5' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`${size} ${
          star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
        }`}
      />
    ))}
  </div>
);

// ── Colors & Constants ────────────────────────────────────────────────────────
const BRAND_ORANGE = '#FF5A1F';
const CHARCOAL = '#1E232A';

const STATUS_COLORS = {
  REQUESTED: '#F59E0B',
  ACCEPTED: '#3B82F6',
  TECHNICIAN_ASSIGNED: '#8B5CF6',
  ON_THE_WAY: '#06B6D4',
  ARRIVED: '#6366F1',
  SERVICE_STARTED: '#FF5A1F',
  COMPLETED: '#10B981',
  CANCELLED: '#F43F5E',
};

const TECH_STATUS_COLORS = {
  Approved: '#10B981',
  'Pending Approval': '#F59E0B',
  Rejected: '#F43F5E',
};

// ── Formatters ────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ── Custom Tooltip for Recharts ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E232A] text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs space-y-1.5">
        <p className="font-bold text-slate-300 border-b border-white/10 pb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-extrabold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Summary KPI Card ──────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtext, icon: Icon, colorCls, iconBgCls }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between gap-3 mb-3">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgCls}`}>
        <Icon className={`w-5 h-5 ${colorCls}`} />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</span>
      {subtext && <span className="text-xs font-semibold text-slate-400">{subtext}</span>}
    </div>
  </div>
);

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const fetchAnalytics = useCallback(async (days = selectedDays, isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await adminAnalyticsService.getOverview({ days });
      if (response?.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(response?.message || 'Failed to load analytics.');
      }
    } catch (err) {
      console.error('[AdminAnalyticsPage] Error:', err);
      setError(err?.response?.data?.message || err.message || 'Error loading analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    fetchAnalytics(selectedDays);
  }, [selectedDays, fetchAnalytics]);

  const handleRangeChange = (days) => {
    setSelectedDays(days);
  };

  const handleRefresh = () => {
    fetchAnalytics(selectedDays, true);
  };

  // ── Loading Skeleton ────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-96 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <SkeletonLoader variant="card" count={7} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white rounded-2xl border border-slate-200 p-6 animate-pulse" />
            <div className="h-80 bg-white rounded-2xl border border-slate-200 p-6 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <ErrorState
          title="Could Not Load Analytics"
          message={error}
          onRetry={() => fetchAnalytics(selectedDays)}
          retryLabel="Retry Loading"
          fullPage
        />
      </div>
    );
  }

  const {
    overview = {},
    bookingStatusDistribution = [],
    technicianStatusDistribution = [],
    trends = [],
    recentActivity = { bookings: [], reviews: [] },
  } = data || {};

  // Formatted data for status bar chart
  const statusChartData = bookingStatusDistribution
    .filter((item) => item.count > 0 || ['COMPLETED', 'CANCELLED', 'REQUESTED'].includes(item.status))
    .map((item) => ({
      status: item.status.replace(/_/g, ' '),
      count: item.count,
      rawStatus: item.status,
    }));

  // Formatted data for tech status pie chart
  const techChartData = technicianStatusDistribution
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.label,
      value: item.count,
    }));

  const hasAnyData =
    overview.totalBookings > 0 ||
    overview.totalCustomers > 0 ||
    overview.totalTechnicians > 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ── Top Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-orange-100 text-brand-accent uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5" />
                Live Overview
              </span>
              <span className="text-xs text-slate-400 font-semibold">Phase 12</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Admin Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Authoritative platform metrics, service utilization, booking performance, and technician approvals.
            </p>
          </div>

          {/* Action buttons & range filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              {[
                { label: '7 Days', val: 7 },
                { label: '30 Days', val: 30 },
                { label: '90 Days', val: 90 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleRangeChange(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDays === val
                      ? 'bg-[#1E232A] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-accent' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* ── Empty State for Fresh Installs ──────────────────────────────── */}
        {!hasAnyData ? (
          <EmptyState
            icon={Layers}
            title="No Activity Recorded Yet"
            description="Your HomeServe marketplace is newly initialized. As customers request bookings and technicians register, live charts and trends will automatically populate here."
          />
        ) : (
          <>
            {/* ── Summary KPI Grid ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
              <StatCard
                title="Customers"
                value={overview.totalCustomers ?? 0}
                icon={Users}
                colorCls="text-blue-600"
                iconBgCls="bg-blue-50"
              />
              <StatCard
                title="Technicians"
                value={overview.totalTechnicians ?? 0}
                icon={Wrench}
                colorCls="text-violet-600"
                iconBgCls="bg-violet-50"
              />
              <StatCard
                title="Approvals"
                value={overview.pendingApprovals ?? 0}
                subtext={overview.pendingApprovals > 0 ? 'Pending' : 'Clear'}
                icon={Clock}
                colorCls="text-amber-600"
                iconBgCls="bg-amber-50"
              />
              <StatCard
                title="Bookings"
                value={overview.totalBookings ?? 0}
                icon={Calendar}
                colorCls="text-brand-accent"
                iconBgCls="bg-orange-50"
              />
              <StatCard
                title="Completed"
                value={overview.completedBookings ?? 0}
                subtext={`${
                  overview.totalBookings > 0
                    ? Math.round((overview.completedBookings / overview.totalBookings) * 100)
                    : 0
                }%`}
                icon={CheckCircle2}
                colorCls="text-emerald-600"
                iconBgCls="bg-emerald-50"
              />
              <StatCard
                title="Reviews"
                value={overview.totalReviews ?? 0}
                icon={MessageSquare}
                colorCls="text-indigo-600"
                iconBgCls="bg-indigo-50"
              />
              <StatCard
                title="Avg Rating"
                value={overview.averageRating > 0 ? `${overview.averageRating} ★` : '—'}
                subtext={overview.totalReviews > 0 ? `${overview.totalReviews} total` : 'No reviews'}
                icon={Star}
                colorCls="text-amber-500"
                iconBgCls="bg-amber-50"
              />
            </div>

            {/* ── Charts Section ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trend Chart (2 columns on lg) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-brand-accent" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900">
                          Booking Trends (Last {selectedDays} Days)
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          Daily volume with zero-day continuity
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chart rendering */}
                  <div className="h-72 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trends}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={BRAND_ORANGE} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={BRAND_ORANGE} stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          tickLine={false}
                          axisLine={{ stroke: '#CBD5E1' }}
                          minTickGap={20}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          tickLine={false}
                          axisLine={{ stroke: '#CBD5E1' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                          iconType="circle"
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Total Bookings"
                          stroke={BRAND_ORANGE}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorTotal)"
                        />
                        <Area
                          type="monotone"
                          dataKey="completed"
                          name="Completed"
                          stroke="#10B981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorCompleted)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Technician Status Breakdown (1 col) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <PieChartIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Technician Verification
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Approval status of {overview.totalTechnicians} profiles
                      </p>
                    </div>
                  </div>

                  {techChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-semibold">
                      No technician profiles registered
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={techChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                          >
                            {techChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={TECH_STATUS_COLORS[entry.name] || '#94A3B8'}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Pending queue</span>
                  <Link
                    to="/admin/technicians"
                    className="font-bold text-brand-accent hover:underline inline-flex items-center gap-1"
                  >
                    Manage ({overview.pendingApprovals || 0}) <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Status Distribution Bar Chart ────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Booking Status Distribution
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      All-time distribution across active, completed, and terminal booking lifecycle states
                    </p>
                  </div>
                </div>
                <Link
                  to="/admin/bookings"
                  className="text-xs font-bold text-brand-accent hover:underline inline-flex items-center gap-1"
                >
                  View Bookings <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Bookings" radius={[6, 6, 0, 0]}>
                      {statusChartData.map((entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={STATUS_COLORS[entry.rawStatus] || BRAND_ORANGE}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Recent Activity Feeds (Safe projections, no PII) ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Bookings */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-brand-accent" />
                      </div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Recent Bookings
                      </h2>
                    </div>
                    <Link
                      to="/admin/bookings"
                      className="text-xs font-bold text-brand-accent hover:underline inline-flex items-center gap-1"
                    >
                      All <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {recentActivity.bookings?.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium py-6 text-center">
                      No bookings created yet
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {recentActivity.bookings.map((booking) => (
                        <div key={booking.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                              {booking.serviceName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Customer: <span className="text-slate-700 font-bold">{booking.customerName}</span> · {formatDate(booking.scheduledDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={booking.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 font-medium">
                    Protected admin view · Client PII withheld
                  </p>
                </div>
              </div>

              {/* Recent Reviews */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Star className="w-4 h-4 text-indigo-600" />
                      </div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Recent Customer Reviews
                      </h2>
                    </div>
                    <Link
                      to="/admin/reviews"
                      className="text-xs font-bold text-brand-accent hover:underline inline-flex items-center gap-1"
                    >
                      Moderate <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {recentActivity.reviews?.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium py-6 text-center">
                      No customer reviews submitted yet
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {recentActivity.reviews.map((rev) => (
                        <div key={rev.id} className="py-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-900">
                                {rev.customerName}
                              </span>
                              <span className="text-[10px] text-slate-400">for</span>
                              <span className="text-xs font-semibold text-slate-700">
                                {rev.technicianName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                              {formatTimeAgo(rev.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <StarDisplay rating={rev.rating} />
                            <span className="text-xs font-bold text-slate-700">{rev.rating}.0</span>
                          </div>

                          {rev.comment ? (
                            <p className="text-xs text-slate-600 font-medium italic line-clamp-2">
                              "{rev.comment}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No comment provided</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 font-medium">
                    Verified reviews tied to completed bookings
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
