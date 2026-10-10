/**
 * AdminReviewsPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 11 — Admin interface for viewing and moderating customer reviews.
 *
 * Features:
 *   • Paginated review list with search/filter by rating
 *   • Delete inappropriate reviews with confirmation
 *   • Shows customer name, email (admin-only), technician, booking, date
 *   • Sensible empty state and loading skeleton
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  User,
  Wrench,
} from 'lucide-react';
import { reviewService } from '../../services/api';
import MobileBottomNav from '../../components/common/MobileBottomNav';

// ─── Star Row ─────────────────────────────────────────────────────────────────
const StarRow = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`w-3.5 h-3.5 ${
          s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
        }`}
      />
    ))}
  </div>
);

// ─── Confirm Delete Dialog ─────────────────────────────────────────────────────
const DeleteConfirmDialog = ({ onConfirm, onClose, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900">Remove Review</h3>
          <p className="text-xs text-slate-500">This action cannot be undone.</p>
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-5">
        Are you sure you want to permanently remove this review? The technician's rating will be recalculated.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2.5 rounded-xl transition disabled:opacity-60"
        >
          Keep Review
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" />Remove</>}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [ratingFilter, setRatingFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (ratingFilter) params.rating = ratingFilter;
      const res = await reviewService.adminGetAll(params);
      setReviews(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    setSuccessMsg('');
    try {
      await reviewService.adminDelete(deletingId);
      setSuccessMsg('Review removed successfully.');
      setDeletingId(null);
      fetchReviews();
    } catch (err) {
      setError(err.message || 'Failed to remove review.');
      setDeletingId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h1 className="text-2xl font-black tracking-tight">Review Management</h1>
          </div>
          <p className="text-slate-400 text-sm">View and moderate customer reviews · Phase 11</p>

          {/* Nav links to other admin pages */}
          <div className="flex gap-6 border-b border-white/10 mt-6 -mb-6">
            <Link
              to="/admin/technicians"
              className="pb-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-white transition-all"
            >
              Technicians
            </Link>
            <Link
              to="/admin/bookings"
              className="pb-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-white transition-all"
            >
              Bookings
            </Link>
            <span className="pb-3 text-xs font-bold border-b-2 border-[#FF5A1F] text-[#FF5A1F]">
              Reviews
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Notifications */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2 text-sm text-rose-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2 text-sm text-emerald-700 font-bold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Filters + Refresh */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Filter</span>
            </div>

            {/* Rating filter */}
            <select
              id="admin-review-rating-filter"
              value={ratingFilter}
              onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
              className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30 focus:border-[#FF5A1F] bg-white"
            >
              <option value="">All Ratings</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} Stars</option>
              ))}
            </select>

            <button
              onClick={fetchReviews}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#FF5A1F] hover:underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary badge */}
        {pagination && (
          <p className="text-xs text-slate-400 font-medium px-1">
            Showing {reviews.length} of {pagination.total} review{pagination.total !== 1 ? 's' : ''}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded w-1/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && reviews.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
            <Star className="w-12 h-12 text-slate-200 fill-slate-100 mx-auto mb-4" />
            <p className="font-bold text-slate-500">No reviews found</p>
            <p className="text-xs text-slate-400 mt-1">
              {ratingFilter ? `No ${ratingFilter}-star reviews match your filter.` : 'No customer reviews have been submitted yet.'}
            </p>
          </div>
        )}

        {/* Review Cards */}
        {!loading && reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((review) => {
              const techName = review.technicianId?.userId?.name || 'Technician';
              const serviceName = review.bookingId?.serviceName || '—';
              const bookingDate = formatDate(review.bookingId?.scheduledDate);
              const customerName = review.customerId?.name || 'Customer';
              const customerEmail = review.customerId?.email || '';

              return (
                <div
                  key={review._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  {/* Left: Rating + meta */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Header row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <StarRow rating={review.rating} />
                      <span className="text-sm font-extrabold text-slate-800">{review.rating}/5</span>
                      <span className="text-[10px] text-slate-400">{formatDate(review.createdAt)}</span>
                    </div>

                    {/* Customer info (admin sees email) */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{customerName}</span>
                      {customerEmail && <span className="text-slate-400">({customerEmail})</span>}
                    </div>

                    {/* Technician + Service */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{techName}</span>
                      <span className="text-slate-400">·</span>
                      <span>{serviceName}</span>
                      {bookingDate !== '—' && <span className="text-slate-400">· {bookingDate}</span>}
                    </div>

                    {/* Comment */}
                    {review.comment ? (
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic pl-5">No comment provided.</p>
                    )}
                  </div>

                  {/* Right: Delete action */}
                  <div className="flex-shrink-0 self-start">
                    <button
                      id={`admin-delete-review-${review._id}`}
                      onClick={() => setDeletingId(review._id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#FF5A1F] disabled:opacity-40 disabled:cursor-not-allowed transition px-3 py-2 rounded-xl hover:bg-orange-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-xs text-slate-400 font-medium">
              Page {page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages || loading}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#FF5A1F] disabled:opacity-40 disabled:cursor-not-allowed transition px-3 py-2 rounded-xl hover:bg-orange-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={handleDelete}
          onClose={() => setDeletingId(null)}
          loading={deleteLoading}
        />
      )}

      <MobileBottomNav />
    </div>
  );
};

export default AdminReviewsPage;
