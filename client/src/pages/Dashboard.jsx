import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowRight,
  Flame,
  UserCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { workItemService } from '../services/workItemService';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { SkeletonMetrics, SkeletonRows } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { CreateWorkItemModal } from '../components/work-items/CreateWorkItemModal';
import { isDemoMode, MOCK_WORK_ITEMS, MOCK_ACTIVITIES } from '../services/mockAdapter';

export function Dashboard() {
  const navigate = useNavigate();
  const { user, activeTeam, teams } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [myWorkItems, setMyWorkItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const currentTeamId = activeTeam?.id || teams?.[0]?.id;

    if (!currentTeamId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isDemoMode()) {
      setMetrics({
        open: 2,
        inProgress: 1,
        criticalOrUrgent: 2,
        assignedToMe: 1,
        total: 5,
        blocked: 1,
        pendingApproval: 1,
        resolved: 1,
      });
      setRecentItems(MOCK_WORK_ITEMS.slice(0, 5));
      setMyWorkItems(MOCK_WORK_ITEMS.filter((i) => i.assignee?.name === user?.name || i.assignee === user?.id));
      setActivities(MOCK_ACTIVITIES);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const summary = await dashboardService.getDashboardSummary(currentTeamId);
      setMetrics(summary.metrics || {});
      setRecentItems(summary.recentlyUpdated || []);

      // Fetch user's assigned items
      try {
        const myItemsRes = await workItemService.getWorkItems({
          teamId: currentTeamId,
          assignee: user?.id,
          limit: 5,
        });
        setMyWorkItems(myItemsRes.items || []);
      } catch (e) {
        console.warn('Could not fetch user assigned items:', e.message);
      }

      // Fetch activities for the top recent work item
      if (summary.recentlyUpdated?.[0]?.id) {
        try {
          const actRes = await workItemService.getWorkItemActivities(
            summary.recentlyUpdated[0].id,
            { limit: 4 }
          );
          setActivities(actRes.activities || []);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeam, teams, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="page-container dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-context-pill">
            <Building2 size={13} />
            <span>{activeTeam?.name || 'Operations Workspace'}</span>
          </div>
          <h1 className="page-title">Operations Overview</h1>
          <p className="page-description text-secondary">
            Today is {currentDateFormatted}. Live operations telemetry and incident tracking.
          </p>
        </div>

        <div className="page-actions">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchDashboardData(true)}
            title="Refresh metrics"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Work Item
          </Button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={() => fetchDashboardData()} />}

      {/* Metric Cards Row */}
      {loading ? (
        <SkeletonMetrics count={4} />
      ) : (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Open Items</span>
              <span className="metric-badge metric-badge-open">
                <Clock size={13} />
              </span>
            </div>
            <div className="metric-value">{metrics?.open ?? 0}</div>
            <div className="metric-subtext">Awaiting resolution or triage</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">In Progress</span>
              <span className="metric-badge metric-badge-active">
                <CheckCircle2 size={13} />
              </span>
            </div>
            <div className="metric-value">{metrics?.inProgress ?? 0}</div>
            <div className="metric-subtext">Actively being worked on</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Urgent / Critical</span>
              <span className="metric-badge metric-badge-urgent">
                <Flame size={13} />
              </span>
            </div>
            <div className="metric-value text-danger">
              {metrics?.criticalOrUrgent ?? 0}
            </div>
            <div className="metric-subtext">High operational priority</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Assigned to Me</span>
              <span className="metric-badge metric-badge-assigned">
                <UserCheck size={13} />
              </span>
            </div>
            <div className="metric-value text-primary">
              {metrics?.assignedToMe ?? 0}
            </div>
            <div className="metric-subtext">Your active queue</div>
          </div>
        </div>
      )}

      {/* Main Work Area: 2 Columns */}
      <div className="dashboard-grid">
        {/* Left Column: Recent Work Items Table */}
        <section className="dashboard-main-col">
          <div className="section-header">
            <div>
              <h2 className="section-title">Recently Updated Items</h2>
              <p className="section-sub text-secondary">
                Latest updates across the {activeTeam?.name || 'team'} workspace
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/work-items')}
            >
              View All
            </Button>
          </div>

          <div className="data-table-container">
            {loading ? (
              <SkeletonRows rows={5} columns={6} />
            ) : recentItems.length === 0 ? (
              <EmptyState
                title="No work items in this workspace"
                description="Create the first operational work item or incident ticket to get started."
                actionLabel="Create Work Item"
                onAction={() => setCreateModalOpen(true)}
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>ID</th>
                    <th>Title</th>
                    <th style={{ width: '110px' }}>Type</th>
                    <th style={{ width: '130px' }}>Status</th>
                    <th style={{ width: '100px' }}>Priority</th>
                    <th style={{ width: '140px' }}>Assignee</th>
                    <th style={{ width: '90px' }}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => (
                    <tr
                      key={item.id}
                      className="table-row-clickable"
                      onClick={() => navigate(`/work-items/${item.id}`)}
                    >
                      <td className="font-mono text-xs text-secondary">
                        #{item.id.slice(-6).toUpperCase()}
                      </td>
                      <td>
                        <span className="item-title-cell" title={item.title}>
                          {item.title}
                        </span>
                      </td>
                      <td>
                        <span className="type-tag">{item.type || 'OPERATIONAL'}</span>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="text-sm text-secondary">
                        {item.assignee?.name || (
                          <span className="text-tertiary">Unassigned</span>
                        )}
                      </td>
                      <td className="text-xs text-secondary">
                        {formatDate(item.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Right Column: My Work + Recent Audit Activity */}
        <aside className="dashboard-side-col">
          {/* My Assigned Work */}
          <div className="dashboard-side-card">
            <div className="side-card-header">
              <h3 className="side-card-title">My Responsibilities</h3>
              <span className="count-pill">{myWorkItems.length}</span>
            </div>

            <div className="side-card-body">
              {myWorkItems.length === 0 ? (
                <p className="text-tertiary text-sm py-2">
                  No active items currently assigned to you.
                </p>
              ) : (
                <ul className="my-work-list">
                  {myWorkItems.map((item) => (
                    <li
                      key={item.id}
                      className="my-work-item"
                      onClick={() => navigate(`/work-items/${item.id}`)}
                    >
                      <div className="my-work-main">
                        <span className="my-work-title" title={item.title}>
                          {item.title}
                        </span>
                        <div className="my-work-meta">
                          <StatusBadge status={item.status} size="sm" />
                          {item.dueDate && (
                            <span className="due-date-meta">
                              Due {formatDate(item.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Operational Activity Stream */}
          <div className="dashboard-side-card">
            <div className="side-card-header">
              <h3 className="side-card-title">Recent Activity</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/activity')}
              >
                Trail →
              </Button>
            </div>

            <div className="side-card-body">
              {activities.length === 0 ? (
                <p className="text-tertiary text-sm py-2">
                  No recent operational changes logged yet.
                </p>
              ) : (
                <ul className="timeline-mini-list">
                  {activities.map((act) => (
                    <li key={act.id} className="timeline-mini-item">
                      <div className="timeline-mini-dot" />
                      <div className="timeline-mini-content">
                        <p className="timeline-mini-text">
                          <strong>{act.actor?.name || 'Operator'}</strong>{' '}
                          <span>
                            {act.action === 'STATUS_CHANGED'
                              ? 'updated status'
                              : act.action === 'ASSIGNEE_CHANGED'
                              ? 'reassigned work'
                              : act.action === 'WORK_ITEM_CREATED'
                              ? 'created ticket'
                              : 'modified work item'}
                          </span>
                        </p>
                        <span className="timeline-mini-time">
                          {formatTimeAgo(act.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Create Work Item Modal */}
      <CreateWorkItemModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onItemCreated={() => {
          fetchDashboardData(true);
        }}
      />
    </div>
  );
}
