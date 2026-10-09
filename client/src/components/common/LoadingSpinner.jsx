import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Standardized Loading Spinner & Screen Component
 */
export const LoadingSpinner = ({
  size = 'md',
  message,
  fullPage = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <RefreshCw className={`${sizeClasses[size] || sizeClasses.md} text-brand-accent animate-spin`} />
      {message && <p className="text-xs font-semibold text-slate-500">{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="min-h-[60vh] flex items-center justify-center p-6">{content}</div>;
  }

  return content;
};

export default LoadingSpinner;
