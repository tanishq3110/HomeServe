import React from 'react';

/**
 * Standardized Skeleton Loader for cards and content
 */
export const SkeletonLoader = ({
  variant = 'card',
  count = 1,
  className = '',
}) => {
  const renderItem = (key) => {
    if (variant === 'card') {
      return (
        <div
          key={key}
          className={`bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse shadow-sm ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="h-5 bg-slate-200 rounded w-20" />
            <div className="h-8 bg-slate-200 rounded-xl w-24" />
          </div>
        </div>
      );
    }

    if (variant === 'row') {
      return (
        <div
          key={key}
          className={`bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 animate-pulse ${className}`}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-slate-200" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-200 rounded w-1/2" />
              <div className="h-2.5 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
          <div className="h-7 bg-slate-200 rounded-lg w-20" />
        </div>
      );
    }

    // Default line
    return (
      <div key={key} className={`space-y-2 animate-pulse ${className}`}>
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    );
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => renderItem(i))}
    </>
  );
};

export default SkeletonLoader;
