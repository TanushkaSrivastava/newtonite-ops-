import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  error,
  onRetry,
  onRefresh,
  title,
  message,
  className = '',
}) {
  const isConflict =
    error?.status === 409 ||
    error?.code === 'VERSION_CONFLICT' ||
    (typeof error === 'string' && error.includes('changed by another user'));

  const isTransitionError =
    error?.status === 422 || error?.code === 'INVALID_TRANSITION';

  const defaultTitle = isConflict
    ? 'Concurrency Conflict (Stale Version)'
    : isTransitionError
    ? 'Invalid Workflow Transition'
    : 'Unable to Load Data';

  const defaultMessage = isConflict
    ? 'This work item was modified by another operator or session while you were viewing it. Refreshing will load the latest server state without losing data.'
    : error?.message || message || 'An unexpected error occurred while communicating with the server.';

  return (
    <div className={`error-alert-box ${isConflict ? 'is-conflict' : ''} ${className}`.trim()} role="alert">
      <div className="error-alert-header">
        <AlertTriangle size={18} className="error-alert-icon" />
        <div className="error-alert-text">
          <h4 className="error-alert-title">{title || defaultTitle}</h4>
          <p className="error-alert-description">{defaultMessage}</p>
        </div>
      </div>

      <div className="error-alert-actions">
        {isConflict && onRefresh && (
          <Button variant="primary" size="sm" icon={RefreshCw} onClick={onRefresh}>
            Refresh to Latest State
          </Button>
        )}
        {onRetry && !isConflict && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
