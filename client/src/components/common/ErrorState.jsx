import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

/**
 * Standardized Error State Component
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'We encountered an error loading this information. Please try again.',
  onRetry,
  onAction,
  retryLabel = 'Try Again',
  actionLabel,
  actionLink,
  fullPage = false,
  className = '',
}) => {
  const handleAction = onAction || onRetry;
  const btnLabel = actionLabel || retryLabel;

  const content = (
    <div
      className={`bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 text-center max-w-md mx-auto space-y-4 shadow-sm ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
      </div>

      {handleAction && (
        <div className="pt-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={handleAction}>
            {btnLabel}
          </Button>
        </div>
      )}

      {actionLink && !handleAction && (
        <div className="pt-2">
          <a
            href={actionLink}
            className="inline-flex items-center justify-center font-bold text-xs px-4 py-2 rounded-xl bg-brand-accent text-white hover:bg-orange-600 transition shadow-sm"
          >
            {btnLabel}
          </a>
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return <div className="min-h-[60vh] flex items-center justify-center p-6">{content}</div>;
  }

  return content;
};

export default ErrorState;
