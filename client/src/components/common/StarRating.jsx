import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating = 5, totalStars = 5, size = 'w-4 h-4', showScore = false, reviewCount = null }) => {
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-0.5 text-amber-400">
        {[...Array(totalStars)].map((_, index) => {
          const filled = index + 1 <= Math.floor(rating);
          const half = !filled && index < rating;

          return (
            <Star
              key={index}
              className={`${size} ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : half
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'text-slate-200 fill-slate-100'
              }`}
            />
          );
        })}
      </div>
      {showScore && (
        <span className="text-xs font-bold text-slate-800">
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== null && (
        <span className="text-xs text-slate-400">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export default StarRating;

