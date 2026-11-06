import React from 'react';
import { PriorityLevel, QueueStatus, TriageUrgencyCategory } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'slate';
  status?: QueueStatus;
  priority?: PriorityLevel;
  triageUrgency?: TriageUrgencyCategory;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  priority,
  triageUrgency,
  size = 'md',
  className = '',
}) => {
  let badgeClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = children;

  if (triageUrgency) {
    switch (triageUrgency) {
      case 'emergency_warning':
        badgeClasses = 'bg-red-600 text-white border-red-700 animate-pulse font-bold';
        label = label || 'Emergency Warning';
        break;
      case 'urgent_review':
        badgeClasses = 'bg-amber-600 text-white border-amber-700 font-bold';
        label = label || 'Urgent Review';
        break;
      case 'normal_priority':
        badgeClasses = 'bg-blue-600 text-white border-blue-700 font-medium';
        label = label || 'Routine Priority';
        break;
      case 'priority_pending':
      default:
        badgeClasses = 'bg-slate-200 text-slate-700 border-slate-300 font-medium';
        label = label || 'Triage Pending';
        break;
    }
  } else if (priority) {
    switch (priority) {
      case 'emergency':
        badgeClasses = 'bg-red-100 text-red-800 border-red-300 animate-pulse font-semibold';
        label = label || 'Emergency';
        break;
      case 'urgent':
        badgeClasses = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
        label = label || 'Urgent';
        break;
      case 'normal':
      default:
        badgeClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        label = label || 'Normal';
        break;
    }
  } else if (status) {
    switch (status) {
      case 'waiting':
        badgeClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        label = label || 'Waiting';
        break;
      case 'calling':
        badgeClasses = 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse font-bold';
        label = label || 'Calling Now';
        break;
      case 'consulting':
        badgeClasses = 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
        label = label || 'In Consultation';
        break;
      case 'completed':
        badgeClasses = 'bg-green-100 text-green-800 border-green-300';
        label = label || 'Completed';
        break;
      case 'absent':
        badgeClasses = 'bg-red-50 text-red-700 border-red-200';
        label = label || 'Absent';
        break;
      case 'cancelled':
        badgeClasses = 'bg-slate-100 text-slate-500 border-slate-200 line-through';
        label = label || 'Cancelled';
        break;
    }
  } else if (variant) {
    const map = {
      primary: 'bg-blue-50 text-blue-700 border-blue-200',
      secondary: 'bg-teal-50 text-teal-700 border-teal-200',
      success: 'bg-green-50 text-green-700 border-green-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      danger: 'bg-red-50 text-red-700 border-red-200',
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    badgeClasses = map[variant];
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${badgeClasses} ${sizeClass} ${className}`}>
      {label}
    </span>
  );
};
