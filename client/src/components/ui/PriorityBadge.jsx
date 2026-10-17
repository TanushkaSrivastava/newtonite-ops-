import React from 'react';

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low',
    className: 'badge-priority-low',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'badge-priority-medium',
  },
  HIGH: {
    label: 'High',
    className: 'badge-priority-high',
  },
  URGENT: {
    label: 'Urgent',
    className: 'badge-priority-urgent',
  },
  CRITICAL: {
    label: 'Critical',
    className: 'badge-priority-critical',
  },
};

export function PriorityBadge({ priority, size = 'sm' }) {
  const config = PRIORITY_CONFIG[priority] || {
    label: priority || 'Medium',
    className: 'badge-priority-medium',
  };

  return (
    <span className={`badge-priority ${config.className} badge-${size}`}>
      <span className="badge-dot" />
      <span>{config.label}</span>
    </span>
  );
}
