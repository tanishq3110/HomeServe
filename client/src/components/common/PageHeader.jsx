import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Standardized PageHeader component
 * Renders consistent dark brand hero background (#121417) with title, subtitle, back navigation, and right-side action slot.
 */
export const PageHeader = ({
  title,
  subtitle,
  badge,
  badgeContent,
  showBack = false,
  onBack,
  backText = 'Back',
  actions,
  children,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-8 pb-14 border-b border-white/5 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {showBack && (
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-4 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>{backText}</span>
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {title}
              </h1>
              {badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-accent/20 text-brand-accent border border-brand-accent/30 px-2.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              {badgeContent}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2.5 flex-shrink-0">{actions}</div>}
        </div>

        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
