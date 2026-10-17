import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...', size = 20, className = '' }) {
  return (
    <div className={`loading-spinner-container ${className}`.trim()}>
      <Loader2 size={size} className="animate-spin text-primary" />
      {message && <span className="loading-message text-secondary text-sm">{message}</span>}
    </div>
  );
}

export function SkeletonRows({ rows = 5, columns = 6 }) {
  return (
    <div className="skeleton-table-wrapper" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="skeleton-cell"
              style={{
                width: cIdx === 0 ? '70px' : cIdx === 1 ? '40%' : `${10 + (cIdx * 5)}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetrics({ count = 4 }) {
  return (
    <div className="skeleton-metrics-grid" aria-busy="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-metric-card">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-number" />
          <div className="skeleton-line skeleton-sub" />
        </div>
      ))}
    </div>
  );
}
