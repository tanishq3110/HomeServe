import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

/**
 * Standardized Empty State Component
 */
export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description,
  message,
  actionLabel,
  onAction,
  actionTo,
  actionLink,
  className = '',
}) => {
  const text = description || message || 'There are no items to display at this time.';
  const link = actionLink || actionTo;

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-orange-50 text-brand-accent flex items-center justify-center mx-auto">
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
          {text}
        </p>
      </div>

      {(actionLabel && onAction) && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}

      {(actionLabel && link && !onAction) && (
        <div className="pt-2">
          <a
            href={link}
            className="inline-flex items-center justify-center font-bold text-xs px-4 py-2 rounded-xl bg-brand-accent text-white hover:bg-orange-600 transition shadow-sm"
          >
            {actionLabel}
          </a>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
