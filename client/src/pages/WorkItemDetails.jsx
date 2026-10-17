import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
  Calendar,
  Building2,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Edit2,
  Save,
  X,
  History,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  workItemService,
  ALLOWED_TRANSITIONS,
  STATUSES,
  PRIORITIES,
  WORK_ITEM_TYPES,
} from '../services/workItemService';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { LoadingSpinner } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { isDemoMode, MOCK_WORK_ITEMS, MOCK_ACTIVITIES } from '../services/mockAdapter';

export function WorkItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeTeam, teams } = useAuth();

  const [item, setItem] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conflictError, setConflictError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Inline editing state for description/title
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState('OPERATIONAL');
  const [editPriority, setEditPriority] = useState('MEDIUM');

  // Assignee selection state
  const [selectedAssignee, setSelectedAssignee] = useState('');

  // Comment composer state
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !item) return;
    setCommentLoading(true);
    try {
      if (isDemoMode()) {
        setActivities((prev) => [
          {
            id: `act-${Date.now()}`,
            action: 'COMMENT_ADDED',
            actor: user,
            metadata: { comment: commentText.trim() },
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setCommentText('');
        setSuccessMessage('Comment posted.');
        return;
      }
      await workItemService.addComment(item.id, commentText.trim());
      setCommentText('');
      setSuccessMessage('Comment added to work item.');
      const actRes = await workItemService.getWorkItemActivities(item.id);
      setActivities(actRes.activities || []);
    } catch (err) {
      setError(err);
    } finally {
      setCommentLoading(false);
    }
  };

  const fetchItemDetails = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      setConflictError(null);

      if (isDemoMode()) {
        const found = MOCK_WORK_ITEMS.find((w) => w.id === id) || MOCK_WORK_ITEMS[0];
        setItem(found);
        setEditTitle(found.title);
        setEditDescription(found.description);
        setEditType(found.type);
        setEditPriority(found.priority);
        setSelectedAssignee(found.assignee?._id || found.assignee?.id || '');
        setActivities(MOCK_ACTIVITIES);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await workItemService.getWorkItemById(id);
        setItem(data);
        setEditTitle(data.title);
        setEditDescription(data.description);
        setEditType(data.type);
        setEditPriority(data.priority);
        setSelectedAssignee(data.assignee?._id || data.assignee?.id || '');

        // Fetch activity trail
        try {
          const actRes = await workItemService.getWorkItemActivities(id);
          setActivities(actRes.activities || []);
        } catch (actErr) {
          console.warn('Could not load activity trail:', actErr.message);
        }
      } catch (err) {
        console.error('Failed to load work item:', err);
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchItemDetails();
  }, [fetchItemDetails]);

  // Handle Workflow Status Transition
  const handleTransition = async (nextStatus) => {
    if (!item) return;
    setActionLoading(true);
    setConflictError(null);
    setSuccessMessage('');

    try {
      if (isDemoMode()) {
        setItem((prev) => ({
          ...prev,
          status: nextStatus,
          version: (prev?.version || 0) + 1,
        }));
        setSuccessMessage(`Work item transitioned to ${nextStatus}`);
        setActivities((prev) => [
          {
            id: `act-${Date.now()}`,
            action: 'STATUS_CHANGED',
            actor: user,
            changes: [{ field: 'status', oldValue: item.status, newValue: nextStatus }],
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        return;
      }

      const updated = await workItemService.transitionWorkItem(item.id, {
        status: nextStatus,
        expectedVersion: item.version,
      });

      setItem(updated);
      setSuccessMessage(`Status successfully updated to ${nextStatus}.`);

      // Refresh activity log
      const actRes = await workItemService.getWorkItemActivities(item.id);
      setActivities(actRes.activities || []);
    } catch (err) {
      if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
        setConflictError(err);
      } else {
        setError(err);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Atomic Assignment
  const handleAssign = async (targetAssigneeId) => {
    if (!item) return;
    setActionLoading(true);
    setConflictError(null);
    setSuccessMessage('');

    try {
      if (isDemoMode()) {
        setItem((prev) => ({
          ...prev,
          assignee: targetAssigneeId ? { name: 'Assigned Operator' } : null,
          version: (prev?.version || 0) + 1,
        }));
        setSuccessMessage('Assignee updated.');
        return;
      }

      const updated = await workItemService.assignWorkItem(item.id, {
        assignee: targetAssigneeId || null,
        expectedVersion: item.version,
      });

      setItem(updated);
      setSelectedAssignee(updated.assignee?._id || updated.assignee?.id || '');
      setSuccessMessage('Assignee successfully updated.');

      const actRes = await workItemService.getWorkItemActivities(item.id);
      setActivities(actRes.activities || []);
    } catch (err) {
      if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
        setConflictError(err);
      } else {
        setError(err);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save of General Edits with OCC Version check
  const handleSaveEdits = async (e) => {
    e.preventDefault();
    if (!item) return;
    setActionLoading(true);
    setConflictError(null);
    setSuccessMessage('');

    try {
      if (isDemoMode()) {
        setItem((prev) => ({
          ...prev,
          title: editTitle,
          description: editDescription,
          type: editType,
          priority: editPriority,
          version: (prev?.version || 0) + 1,
        }));
        setIsEditing(false);
        setSuccessMessage('Item details saved.');
        return;
      }

      const updated = await workItemService.updateWorkItem(item.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        type: editType,
        priority: editPriority,
        version: item.version, // Required OCC field!
      });

      setItem(updated);
      setIsEditing(false);
      setSuccessMessage('Changes saved successfully with updated version.');

      const actRes = await workItemService.getWorkItemActivities(item.id);
      setActivities(actRes.activities || []);
    } catch (err) {
      if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
        setConflictError(err);
      } else {
        setError(err);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const allowedNextStatuses = item ? ALLOWED_TRANSITIONS[item.status] || [] : [];

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

  // Compile team member options for assignment
  const currentTeam = item?.team || activeTeam;
  const teamMembers = [];
  if (currentTeam?.owner) {
    const o = currentTeam.owner;
    teamMembers.push({ id: o._id || o.id, name: `${o.name} (Owner)` });
  }
  if (currentTeam?.members) {
    currentTeam.members.forEach((m) => {
      const u = m.user;
      if (u && (u._id || u.id)) {
        const uid = u._id || u.id;
        if (!teamMembers.some((existing) => existing.id === uid)) {
          teamMembers.push({ id: uid, name: `${u.name} (${m.role})` });
        }
      }
    });
  }

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner message="Loading work item details and audit timeline..." size={28} />
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="page-container">
        <ErrorState
          error={error}
          onRetry={() => fetchItemDetails()}
          title="Could not load work item"
        />
        <div className="mt-4">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/work-items')}>
            Back to Work Items
          </Button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-container">
        <p className="text-secondary">Work item not found.</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/work-items')}>
          Back to Work Items
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container details-page">
      {/* Breadcrumb Back Bar */}
      <div className="details-nav-bar">
        <Link to="/work-items" className="breadcrumb-back-link">
          <ArrowLeft size={15} />
          <span>Back to Work Items</span>
        </Link>
        <span className="text-tertiary">/</span>
        <span className="font-mono text-xs text-secondary">
          #{item.id.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* 409 Conflict Notification Banner */}
      {conflictError && (
        <ErrorState
          error={conflictError}
          onRefresh={() => fetchItemDetails(true)}
          title="Version Conflict: Item Was Modified"
          message="Another operator or background process modified this work item after you loaded it. To protect data integrity and avoid lost updates, your edit was prevented. Refresh below to inspect the latest state."
          className="mb-4"
        />
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="form-success-banner mb-4" role="status">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="details-header-card">
        <div className="details-header-main">
          <div className="details-header-badges">
            <span className="font-mono text-xs id-badge">
              #{item.id.slice(-6).toUpperCase()}
            </span>
            <span className="type-tag">{item.type || 'OPERATIONAL'}</span>
            <StatusBadge status={item.status} size="md" />
            <PriorityBadge priority={item.priority} size="md" />
            <span className="version-pill" title="Optimistic Concurrency Version">
              <GitCommit size={12} />
              <span>v{item.version}</span>
            </span>
          </div>

          <h1 className="details-title">{item.title}</h1>

          <div className="details-metadata-row">
            <div className="meta-cell">
              <Building2 size={14} className="text-secondary" />
              <span>{item.team?.name || activeTeam?.name || 'Workspace'}</span>
            </div>
            <div className="meta-cell">
              <User size={14} className="text-secondary" />
              <span>
                Reported by <strong>{item.createdBy?.name || 'Operator'}</strong>
              </span>
            </div>
            <div className="meta-cell">
              <Clock size={14} className="text-secondary" />
              <span>Created {formatDate(item.createdAt)}</span>
            </div>
            {item.dueDate && (
              <div className="meta-cell">
                <Calendar size={14} className="text-secondary" />
                <span>Target Due: {formatDate(item.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="details-header-actions">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchItemDetails(true)}
            title="Refresh item and activity"
          >
            Refresh
          </Button>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              icon={Edit2}
              onClick={() => setIsEditing(true)}
            >
              Edit Details
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Content Layout */}
      <div className="details-grid">
        {/* Left Column: Description & Audit Timeline */}
        <div className="details-left-col">
          {/* Description Section */}
          <div className="content-card">
            <div className="card-header-row">
              <h3 className="card-section-title">Description & Scope</h3>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdits} className="inline-edit-form">
                <div className="form-field">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>

                <div className="form-row-grid">
                  <div className="form-field">
                    <label className="form-label">Work Item Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                    >
                      {WORK_ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Detailed Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={6}
                    required
                    maxLength={5000}
                  />
                </div>

                <div className="inline-edit-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={X}
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={actionLoading}
                    icon={Save}
                  >
                    Save Changes (v{item.version})
                  </Button>
                </div>
              </form>
            ) : (
              <div className="description-body">
                <p className="description-text">{item.description}</p>
              </div>
            )}
          </div>

          {/* Audit Activity Timeline */}
          <div className="content-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <History size={16} className="text-secondary" />
                <h3 className="card-section-title">Audit Activity Trail & Comments</h3>
              </div>
              <span className="count-pill">{activities.length} entries</span>
            </div>

            {/* Comment Composer */}
            <form onSubmit={handleAddComment} className="comment-composer-form mb-4">
              <div className="comment-input-row">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post an operational update or comment on this ticket..."
                  className="comment-text-input"
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={commentLoading}
                  disabled={!commentText.trim()}
                  icon={Send}
                >
                  Comment
                </Button>
              </div>
            </form>

            <div className="audit-timeline-container">
              {activities.length === 0 ? (
                <p className="text-tertiary text-sm py-4">
                  No activity history recorded for this work item yet.
                </p>
              ) : (
                <ol className="audit-timeline">
                  {activities.map((act) => (
                    <li key={act.id} className="audit-timeline-entry">
                      <div className={`timeline-marker ${act.action === 'COMMENT_ADDED' ? 'marker-comment' : ''}`} />
                      <div className="timeline-entry-content">
                        <div className="timeline-entry-header">
                          <span className="timeline-actor">
                            {act.actor?.name || 'Operator'}
                          </span>
                          <span className="timeline-action-label">
                            {act.action === 'COMMENT_ADDED'
                              ? 'commented'
                              : act.action === 'STATUS_CHANGED'
                              ? 'transitioned status'
                              : act.action === 'ASSIGNEE_CHANGED'
                              ? 'updated assignment'
                              : act.action === 'WORK_ITEM_CREATED'
                              ? 'created this work item'
                              : 'updated properties'}
                          </span>
                          <span className="timeline-timestamp">
                            {formatDate(act.createdAt)}
                          </span>
                        </div>

                        {act.action === 'COMMENT_ADDED' && act.metadata?.comment && (
                          <div className="timeline-comment-bubble">
                            <p className="comment-bubble-text">{act.metadata.comment}</p>
                          </div>
                        )}

                        {act.changes && act.changes.length > 0 && (
                          <div className="timeline-diff-box">
                            {act.changes.map((ch, idx) => (
                              <div key={idx} className="diff-row">
                                <span className="diff-field">{ch.field}:</span>
                                <span className="diff-old">
                                  {ch.oldValue ? String(ch.oldValue) : '(none)'}
                                </span>
                                <ArrowRight size={11} className="diff-arrow" />
                                <span className="diff-new">
                                  {ch.newValue ? String(ch.newValue) : '(none)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Workflow Transitions & Ownership */}
        <div className="details-right-col">
          {/* Finite State Machine Transitions */}
          <div className="content-card transition-card">
            <h3 className="card-section-title">Workflow State Machine</h3>
            <p className="text-secondary text-xs mb-3">
              Only transitions permitted by the operational finite state machine are enabled.
            </p>

            <div className="current-state-pill">
              <span className="text-secondary text-xs">Current State:</span>
              <StatusBadge status={item.status} size="md" />
            </div>

            {allowedNextStatuses.length === 0 ? (
              <div className="terminal-state-notice">
                <CheckCircle2 size={15} className="text-secondary" />
                <span className="text-xs text-secondary">
                  Ticket has reached terminal status ({item.status}). No further transitions allowed.
                </span>
              </div>
            ) : (
              <div className="transition-buttons-group">
                <span className="text-xs text-secondary font-medium mb-1">
                  Available Transitions (OCC v{item.version}):
                </span>
                {allowedNextStatuses.map((nextSt) => (
                  <Button
                    key={nextSt}
                    variant="outline"
                    size="sm"
                    loading={actionLoading}
                    icon={ArrowRight}
                    onClick={() => handleTransition(nextSt)}
                    className="transition-btn"
                  >
                    Transition to <strong>{nextSt.replace(/_/g, ' ')}</strong>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Operational Ownership / Assignee */}
          <div className="content-card">
            <h3 className="card-section-title">Ownership & Assignment</h3>
            <p className="text-secondary text-xs mb-3">
              Atomic concurrent claim: competing updates with mismatched version are rejected.
            </p>

            <div className="form-field">
              <label className="form-label">Current Assignee</label>
              <select
                value={selectedAssignee}
                onChange={(e) => {
                  setSelectedAssignee(e.target.value);
                  handleAssign(e.target.value);
                }}
                disabled={actionLoading}
                className="form-select"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ownership-meta text-xs text-secondary mt-2">
              <span>Expected OCC version: </span>
              <span className="font-mono text-primary font-medium">v{item.version}</span>
            </div>
          </div>

          {/* Operational Metadata Card */}
          <div className="content-card">
            <h3 className="card-section-title">System Properties</h3>
            <dl className="property-list">
              <div className="property-item">
                <dt>Work Item ID</dt>
                <dd className="font-mono text-xs">{item.id}</dd>
              </div>
              <div className="property-item">
                <dt>Concurrency Version</dt>
                <dd className="font-mono text-xs">v{item.version}</dd>
              </div>
              <div className="property-item">
                <dt>Workspace Team</dt>
                <dd>{item.team?.name || activeTeam?.name || '—'}</dd>
              </div>
              <div className="property-item">
                <dt>Approval Status</dt>
                <dd>
                  {item.approval?.required
                    ? item.approval.status || 'PENDING'
                    : 'Not required'}
                </dd>
              </div>
              <div className="property-item">
                <dt>Created Timestamp</dt>
                <dd className="text-xs">{formatDate(item.createdAt)}</dd>
              </div>
              <div className="property-item">
                <dt>Last Mutation</dt>
                <dd className="text-xs">{formatDate(item.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
