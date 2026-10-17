import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  Filter,
  ArrowRight,
  Clock,
  User,
  CheckCircle2,
  RefreshCw,
  GitCommit,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { workItemService } from '../services/workItemService';
import { Button } from '../components/ui/Button';
import { SkeletonRows } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { isDemoMode, MOCK_ACTIVITIES } from '../services/mockAdapter';

export function Activity() {
  const { activeTeam, teams } = useAuth();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchActivities = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const targetTeamId = activeTeam?.id || teams?.[0]?.id;
    if (!targetTeamId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isDemoMode()) {
      let filtered = [...MOCK_ACTIVITIES];
      if (actionFilter !== 'ALL') {
        filtered = filtered.filter((a) => a.action === actionFilter);
      }
      setActivities(filtered);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Pull recent work items from active team and collect their audit logs
      const itemsRes = await workItemService.getWorkItems({
        teamId: targetTeamId,
        limit: 10,
        sortBy: 'updatedAt',
        order: 'desc',
      });

      const workItems = itemsRes.items || [];
      const activityPromises = workItems.map(async (w) => {
        try {
          const act = await workItemService.getWorkItemActivities(w.id, { limit: 5 });
          return (act.activities || []).map((a) => ({
            ...a,
            workItemObj: w,
          }));
        } catch {
          return [];
        }
      });

      const nested = await Promise.all(activityPromises);
      const flattened = nested.flat();

      // Sort descending by createdAt
      flattened.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setActivities(flattened);
    } catch (err) {
      console.error('Failed to load activity stream:', err);
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeam, teams, actionFilter]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const displayedActivities =
    actionFilter === 'ALL'
      ? activities
      : activities.filter((a) => a.action === actionFilter);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'STATUS_CHANGED':
        return <span className="act-badge act-status">Status Transition</span>;
      case 'ASSIGNEE_CHANGED':
        return <span className="act-badge act-assignee">Reassignment</span>;
      case 'WORK_ITEM_CREATED':
        return <span className="act-badge act-created">Ticket Created</span>;
      case 'WORK_ITEM_UPDATED':
        return <span className="act-badge act-updated">Property Update</span>;
      default:
        return <span className="act-badge act-default">{action.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div className="page-container activity-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-context-pill">
            <Building2 size={13} />
            <span>{activeTeam?.name || 'Workspace'}</span>
          </div>
          <h1 className="page-title">Operational Audit Trail</h1>
          <p className="page-description text-secondary">
            Immutable chronological record of all state transitions, reassignments, and ticket updates.
          </p>
        </div>

        <div className="page-actions">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchActivities(true)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={() => fetchActivities()} />}

      {/* Filter toolbar */}
      <div className="filters-toolbar">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-secondary" />
          <span className="text-sm font-medium text-secondary">Action Type:</span>
        </div>

        <div className="filters-select-group">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by Action Type"
          >
            <option value="ALL">All Operational Actions</option>
            <option value="STATUS_CHANGED">Status Transitions</option>
            <option value="ASSIGNEE_CHANGED">Reassignments</option>
            <option value="WORK_ITEM_CREATED">Ticket Creations</option>
            <option value="WORK_ITEM_UPDATED">Property Updates</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="content-card">
        {loading ? (
          <SkeletonRows rows={6} columns={4} />
        ) : displayedActivities.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No activity records found"
            description="Operational actions and state changes will be recorded here automatically."
          />
        ) : (
          <div className="activity-feed">
            {displayedActivities.map((act) => {
              const workItemId = act.workItem?._id || act.workItem?.id || act.workItemObj?.id || act.workItem;
              const workItemTitle = act.workItemObj?.title || act.workItem?.title || 'Operational Work Item';

              return (
                <div key={act.id} className="activity-feed-item">
                  <div className="activity-feed-marker">
                    <GitCommit size={15} />
                  </div>

                  <div className="activity-feed-body">
                    <div className="activity-feed-header">
                      <div className="activity-actor-info">
                        <strong>{act.actor?.name || 'Operator'}</strong>
                        <span className="text-secondary text-sm">
                          ({act.actor?.email || 'user@newtonite.io'})
                        </span>
                        {getActionBadge(act.action)}
                      </div>
                      <span className="activity-timestamp text-xs text-secondary">
                        {formatDate(act.createdAt)}
                      </span>
                    </div>

                    <div className="activity-target-item">
                      <span className="text-xs text-secondary">Target Work Item:</span>{' '}
                      <Link
                        to={`/work-items/${workItemId}`}
                        className="activity-item-link"
                      >
                        <span className="font-mono text-xs">
                          #{String(workItemId).slice(-6).toUpperCase()}
                        </span>{' '}
                        <span>{workItemTitle}</span>
                      </Link>
                    </div>

                    {act.changes && act.changes.length > 0 && (
                      <div className="activity-diff-container">
                        {act.changes.map((ch, idx) => (
                          <div key={idx} className="diff-chip">
                            <span className="diff-field-name">{ch.field}:</span>
                            <span className="diff-old-val">
                              {ch.oldValue ? String(ch.oldValue) : '(empty)'}
                            </span>
                            <ArrowRight size={11} className="diff-arrow" />
                            <span className="diff-new-val">
                              {ch.newValue ? String(ch.newValue) : '(empty)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
