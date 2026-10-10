/**
 * TechnicianReviewList.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 11 — Displays a technician's paginated review list with average rating.
 * Used on the Technician Dashboard and Technician Profile pages.
 *
 * Props:
 *   technicianId  — Technician profile ObjectId
 *   compact       — When true, show fewer items and a condensed layout
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, Users } from 'lucide-react';
import { reviewService } from '../../services/api';

// ─── Display-Only Stars ───────────────────────────────────────────────────────
const StarRow = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`${size} ${
          s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
        }`}
      />
    ))}
  </div>
);

// ─── Single Review Card ───────────────────────────────────────────────────────
const ReviewCard = ({ review }) => {
  const initials = (review.customerName || 'C')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const dateStr = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5 hover:border-slate-200 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Customer avatar — initial only, no sensitive data */}
          <div className="w-8 h-8 rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F] flex items-center justify-center flex-shrink-0 text-xs font-extrabold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{review.customerName || 'Customer'}</p>
            {dateStr && <p className="text-[10px] text-slate-400">{dateStr}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StarRow rating={review.rating} />
          <span className="text-xs font-extrabold text-slate-700">{review.rating}/5</span>
        </div>
      </div>

      {review.comment ? (
        <div className="flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic pl-5">No comment provided.</p>
      )}
    </div>
  );
};

// ─── Summary Banner ───────────────────────────────────────────────────────────
const RatingSummary = ({ avgRating, totalReviews }) => {
  const filled = Math.floor(avgRating);
  const half = avgRating - filled >= 0.25 && avgRating - filled < 0.75;

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
      <div className="text-center">
        <p className="text-3xl font-black text-[#FF5A1F] leading-none">
          {totalReviews === 0 ? '—' : avgRating.toFixed(1)}
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">out of 5</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {[1, 2, 3, 4, 5].map((s) => {
            const isHalf = !( s <= filled) && half && s === filled + 1;
            return (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= filled
                    ? 'fill-amber-400 text-amber-400'
                    : isHalf
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-700">{totalReviews}</span>
          <span>{totalReviews === 1 ? 'review' : 'reviews'}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TechnicianReviewList = ({ technicianId, compact = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = compact ? 3 : 5;

  const fetchReviews = useCallback(async () => {
    if (!technicianId) return;
    setLoading(true);
    setError('');
    try {
      const res = await reviewService.getForTechnician(technicianId, { page, limit });
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [technicianId, page, limit]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (!technicianId) return null;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      {data && (
        <RatingSummary
          avgRating={data.avgRating ?? 0}
          totalReviews={data.totalReviews ?? 0}
        />
      )}

      {/* Reviews Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-slate-900 text-sm">
          Customer Reviews
          {data?.totalReviews > 0 && (
            <span className="ml-1.5 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {data.totalReviews}
            </span>
          )}
        </h4>
        {loading && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4 animate-pulse">
              <div className="flex gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
              <div className="h-2.5 bg-slate-200 rounded w-full" />
              <div className="h-2.5 bg-slate-200 rounded w-2/3 mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.reviews.length === 0 && (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Star className="w-10 h-10 text-slate-200 mx-auto mb-3 fill-slate-100" />
          <p className="font-bold text-slate-500 text-sm">No reviews yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Reviews will appear here after customers rate their completed services.
          </p>
        </div>
      )}

      {/* Review Cards */}
      {!loading && data && data.reviews.length > 0 && (
        <div className="space-y-3">
          {data.reviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && data && data.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#FF5A1F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="text-[10px] text-slate-400 font-medium">
            Page {page} of {data.pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
            disabled={page >= data.pagination.pages}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#FF5A1F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TechnicianReviewList;
