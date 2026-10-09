import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  User,
  ArrowRight,
  MapPin,
  Wrench,
  AlertCircle,
  ShieldCheck,
  Ban,
} from 'lucide-react';

/**
 * Universal Status Badge Component for HomeServe
 * Supports booking statuses, technician verification statuses, and payment statuses.
 */
const STATUS_CONFIGS = {
  // Booking Statuses
  REQUESTED: {
    label: 'Requested',
    cls: 'bg-amber-50 text-amber-700 border-amber-200/80',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Accepted',
    cls: 'bg-blue-50 text-blue-700 border-blue-200/80',
    icon: CheckCircle2,
  },
  TECHNICIAN_ASSIGNED: {
    label: 'Technician Assigned',
    cls: 'bg-violet-50 text-violet-700 border-violet-200/80',
    icon: User,
  },
  ON_THE_WAY: {
    label: 'On the Way',
    cls: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    icon: ArrowRight,
  },
  ARRIVED: {
    label: 'Arrived',
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    icon: MapPin,
  },
  SERVICE_STARTED: {
    label: 'In Progress',
    cls: 'bg-orange-50 text-orange-700 border-orange-200/80',
    icon: Wrench,
  },
  COMPLETED: {
    label: 'Completed',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    cls: 'bg-rose-50 text-rose-700 border-rose-200/80',
    icon: XCircle,
  },

  // Verification Statuses
  PENDING: {
    label: 'Under Review',
    cls: 'bg-amber-50 text-amber-700 border-amber-200/80',
    icon: Clock,
  },
  APPROVED: {
    label: 'Verified & Approved',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    icon: ShieldCheck,
  },
  REJECTED: {
    label: 'Rejected',
    cls: 'bg-rose-50 text-rose-700 border-rose-200/80',
    icon: Ban,
  },

  // Payment Statuses
  PAID: {
    label: 'Paid',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Payment Failed',
    cls: 'bg-rose-50 text-rose-700 border-rose-200/80',
    icon: AlertCircle,
  },
};

export const StatusBadge = ({
  status = 'REQUESTED',
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const config = STATUS_CONFIGS[status] || {
    label: status,
    cls: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Clock,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  return (
    <span
      className={`
        inline-flex items-center font-bold rounded-full border shadow-2xs whitespace-nowrap
        ${config.cls}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `}
    >
      {showIcon && Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
