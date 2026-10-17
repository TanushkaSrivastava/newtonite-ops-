import React from 'react';

const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    className: 'badge-status-open',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'badge-status-inprogress',
  },
  BLOCKED: {
    label: 'Blocked',
    className: 'badge-status-blocked',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    className: 'badge-status-approval',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'badge-status-resolved',
  },
  CLOSED: {
    label: 'Closed',
    className: 'badge-status-closed',
  },
};

export function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    className: 'badge-status-closed',
  };

  return (
    <span className={`badge-status ${config.className} badge-${size}`}>
      <span className="badge-dot" />
      <span>{config.label}</span>
    </span>
  );
}
