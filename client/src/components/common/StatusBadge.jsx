import React from 'react';
import { Clock, AlertCircle, CheckCircle2, AlertTriangle, XCircle, Bell } from 'lucide-react';

export const StatusBadge = ({ status, size = 'md', className = '' }) => {
  const norm = (status || 'UPCOMING').toUpperCase();

  const configs = {
    UPCOMING: {
      label: 'Upcoming',
      icon: Clock,
      classes: 'bg-sky-50 text-sky-700 border-sky-200',
      iconClass: 'text-sky-500',
    },
    DUE: {
      label: 'Due Now',
      icon: AlertCircle,
      classes: 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs',
      iconClass: 'text-amber-600 animate-pulse',
      isPulse: true,
    },
    TAKEN: {
      label: 'Taken',
      icon: CheckCircle2,
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconClass: 'text-emerald-600',
    },
    UNCONFIRMED: {
      label: 'Unconfirmed',
      icon: AlertTriangle,
      classes: 'bg-rose-50 text-rose-800 border-rose-200',
      iconClass: 'text-rose-600',
    },
    CANCELLED: {
      label: 'Cancelled',
      icon: XCircle,
      classes: 'bg-slate-100 text-slate-600 border-slate-200',
      iconClass: 'text-slate-400',
    },
  };

  const config = configs[norm] || configs.UPCOMING;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size] || 'text-xs font-medium px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.classes} ${sizeClasses} ${className}`}
      title={`Status: ${config.label}`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${config.iconClass}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};

export const EscalationStageBadge = ({ stage }) => {
  if (!stage || stage === 0) return null;

  const labels = {
    1: 'Stage 1: Reminder Sent',
    2: 'Stage 2: Follow-up Sent',
    3: 'Stage 3: Care Circle Alerted',
    4: 'Stage 4: Healthcare Contact Alerted',
  };

  const colors = {
    1: 'bg-blue-50 text-blue-700 border-blue-200',
    2: 'bg-amber-50 text-amber-700 border-amber-200',
    3: 'bg-orange-50 text-orange-800 border-orange-200',
    4: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[stage] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      <Bell className="w-3 h-3" />
      {labels[stage] || `Stage ${stage}`}
    </span>
  );
};
