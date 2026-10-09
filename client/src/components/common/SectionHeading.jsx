import React from 'react';

const SectionHeading = ({
  badge,
  title,
  highlight,
  titleEnd,
  subtitle,
  align = 'center',
  dark = false,
  className = '',
}) => {
  const isCentered = align === 'center';

  return (
    <div className={`space-y-3 ${isCentered ? 'text-center max-w-3xl mx-auto' : 'max-w-2xl'} ${className}`}>
      {badge && (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
          dark
            ? 'bg-brand-accent/15 text-brand-400 border border-brand-accent/30'
            : 'bg-orange-50 text-brand-accent border border-orange-200/60'
        }`}>
          <span>{badge}</span>
        </div>
      )}

      <h2 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight ${
        dark ? 'text-white' : 'text-slate-900'
      }`}>
        {title}{' '}
        {highlight && (
          <span className="text-brand-accent">
            {highlight}
          </span>
        )}{' '}
        {titleEnd}
      </h2>

      {subtitle && (
        <p className={`text-sm sm:text-base leading-relaxed ${
          dark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;

