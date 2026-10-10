/**
 * ReviewSection.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 11 — Customer-facing Review Section embedded in BookingDetailPage.
 *
 * Behaviour:
 *   • Only renders for COMPLETED bookings.
 *   • If a review already exists, shows the saved review (read-only).
 *   • If no review exists, shows the interactive submission form.
 *   • Rating is an accessible, clickable star selector.
 *   • Comment is optional (max 500 chars with counter).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';
import { Star, Send, CheckCircle2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { reviewService } from '../../services/api';

// ─── Interactive Star Input ───────────────────────────────────────────────────
const StarInput = ({ value, onChange, disabled }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label="Select a star rating from 1 to 5"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            disabled={disabled}
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => !disabled && setHovered(0)}
            className={`transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/60 rounded-sm disabled:cursor-not-allowed ${
              disabled ? 'opacity-60' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <Star
              className={`w-8 h-8 transition-colors duration-150 ${
                active
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-200 fill-slate-100'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

// ─── Display-Only Star Row ────────────────────────────────────────────────────
const StarDisplay = ({ rating, size = 'w-5 h-5' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`${size} ${
          star <= rating
            ? 'fill-amber-400 text-amber-400'
            : 'text-slate-200 fill-slate-100'
        }`}
      />
    ))}
  </div>
);

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

// ─── Main ReviewSection Component ────────────────────────────────────────────
const ReviewSection = ({ booking, existingReview, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [savedReview, setSavedReview] = useState(existingReview || null);

  // Only show for COMPLETED bookings
  if (booking?.status !== 'COMPLETED') return null;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating before submitting.');
      return;
    }

    if (comment.trim().length > 500) {
      setError('Review comment cannot exceed 500 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reviewService.create({
        bookingId: booking._id,
        rating,
        comment: comment.trim(),
      });

      setSavedReview(res.data);
      setSubmitted(true);
      if (onReviewSubmitted) onReviewSubmitted(res.data);
    } catch (err) {
      if (err.status === 409) {
        setError('You have already submitted a review for this booking.');
      } else {
        setError(err.message || 'Failed to submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [booking._id, rating, comment, onReviewSubmitted]);

  // ── If review already exists (from DB or after submission) ──
  if (savedReview || submitted) {
    const review = savedReview;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm">Your Review</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <StarDisplay rating={review?.rating || rating} />
            <span className="text-sm font-bold text-slate-800">
              {RATING_LABELS[review?.rating || rating]}
            </span>
            <span className="ml-auto text-xs font-bold text-[#FF5A1F] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
              {review?.rating || rating}/5
            </span>
          </div>

          {(review?.comment || comment) ? (
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Comment</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{review?.comment || comment}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No comment provided.</p>
          )}

          {review?.createdAt && (
            <p className="text-[10px] text-slate-400">
              Submitted on {new Date(review.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Submission Form ──
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <Star className="w-4 h-4 text-[#FF5A1F]" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">Leave a Review</h3>
          <p className="text-[11px] text-slate-400">Share your experience with the technician</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Star Rating Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">
            Rating <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <StarInput value={rating} onChange={setRating} disabled={submitting} />
            {rating > 0 && (
              <span className="text-sm font-bold text-slate-800 transition-all">
                {RATING_LABELS[rating]}
              </span>
            )}
          </div>
        </div>

        {/* Comment Textarea */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Comment{' '}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Describe your experience — punctuality, quality of work, professionalism…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30 focus:border-[#FF5A1F] resize-none disabled:opacity-60 transition"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-[10px] font-medium ${comment.length > 480 ? 'text-amber-500' : 'text-slate-400'}`}>
              {comment.length}/500
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="w-full bg-[#FF5A1F] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20"
          aria-label="Submit your review"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Review
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ReviewSection;
