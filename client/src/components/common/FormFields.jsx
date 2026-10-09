import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

/**
 * Standardized Input Field Component
 */
export const InputField = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  icon: Icon,
  endIcon: EndIcon,
  onEndIconClick,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const inputId = id || name || Math.random().toString(36).substring(7);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-brand-accent">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            block w-full rounded-xl border text-sm transition-all duration-150
            ${Icon ? 'pl-10' : 'pl-3.5'}
            ${EndIcon ? 'pr-10' : 'pr-3.5'}
            py-2.5
            ${
              error
                ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-brand-accent focus:ring-brand-accent/20'
            }
            focus:outline-none focus:ring-4
            disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200
            ${inputClassName}
          `}
          {...props}
        />

        {EndIcon && (
          <div
            onClick={onEndIconClick}
            className={`absolute inset-y-0 right-0 pr-3.5 flex items-center ${
              onEndIconClick ? 'cursor-pointer hover:text-slate-600' : 'pointer-events-none'
            } text-slate-400`}
          >
            <EndIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

/**
 * Standardized Select Field Component
 */
export const SelectField = ({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  const selectId = id || name || Math.random().toString(36).substring(7);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-brand-accent">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-sm">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            block w-full rounded-xl border text-sm py-2.5 pl-3.5 pr-10 appearance-none transition-all duration-150
            ${
              error
                ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-200 text-slate-900 focus:border-brand-accent focus:ring-brand-accent/20'
            }
            focus:outline-none focus:ring-4
            disabled:bg-slate-50 disabled:text-slate-500
          `}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

/**
 * Standardized Text Area Component
 */
export const TextAreaField = ({
  label,
  id,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  helperText,
  disabled = false,
  required = false,
  maxLength,
  className = '',
  ...props
}) => {
  const areaId = id || name || Math.random().toString(36).substring(7);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={areaId} className="block text-xs font-bold text-slate-700">
            {label} {required && <span className="text-brand-accent">*</span>}
          </label>
        )}
        {maxLength && (
          <span className="text-[10px] text-slate-400">
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        id={areaId}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        className={`
          block w-full rounded-xl border text-sm p-3 transition-all duration-150 resize-none
          ${
            error
              ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-brand-accent focus:ring-brand-accent/20'
          }
          focus:outline-none focus:ring-4
          disabled:bg-slate-50 disabled:text-slate-500
        `}
        {...props}
      />

      {error ? (
        <p className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

export default { InputField, SelectField, TextAreaField };
