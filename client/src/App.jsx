import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const ALLOWED_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'BLOCKED', 'CLOSED'],
  IN_PROGRESS: ['BLOCKED', 'PENDING_APPROVAL', 'RESOLVED', 'OPEN'],
  BLOCKED: ['IN_PROGRESS', 'OPEN'],
  PENDING_APPROVAL: ['RESOLVED', 'IN_PROGRESS'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

const CATEGORIES = [
  'ENGINEERING',
  'CUSTOMER_ISSUE',
  'PAYMENT',
  'INCIDENT',
  'COMPLIANCE',
  'OPERATIONAL',
  'OTHER',
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT'];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Teams & Workspaces
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Dashboard & Items
  const [metrics, setMetrics] = useState(null);
  const [workItems, setWorkItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemActivities, setItemActivities] = useState([]);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Create Item Form State
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemType, setItemType] = useState('OPERATIONAL');
  const [itemPriority, setItemPriority] = useState('MEDIUM');
  const [itemAssignee, setItemAssignee] = useState('');

  // Helper fetch with Authorization
  const apiFetch = useCallback(
    async (endpoint, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const res = await fetch(endpoint, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'API request failed');
      }
      return data;
    },
    [token]
  );

  // Handle Login / Register
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authMode === 'login'
          ? { email: authEmail, password: authPassword }
          : { name: authName, email: authEmail, password: authPassword };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setAuthEmail('admin@newtonite.io');
    setAuthPassword('Password123!');
    setAuthMode('login');
    setAuthLoading(true);
    setAuthError('');

    try {
      // Try login first
      let res;
      try {
        res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'admin@newtonite.io', password: 'Password123!' }),
        });
      } catch {
        // If demo user doesn't exist yet, register
        res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Newtonite Admin',
            email: 'admin@newtonite.io',
            password: 'Password123!',
          }),
        });
      }

      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentTeam(null);
    setTeams([]);
    setWorkItems([]);
    setMetrics(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };


  // Create Team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      const res = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newTeamName, description: newTeamDesc }),
      });
      const created = res.data;
      setTeams((prev) => [created, ...prev]);
      setCurrentTeam(created);
      setIsCreatingTeam(false);
      setNewTeamName('');
      setNewTeamDesc('');
    } catch (err) {
      alert(err.message);
    }
  };

  // Load Dashboard Metrics
  const loadMetrics = useCallback(async () => {
    if (!token || !currentTeam) return;
    try {
      const teamId = currentTeam.id || currentTeam._id;
      const res = await apiFetch(`/api/dashboard/summary?team=${teamId}`);
      setMetrics(res.data.metrics);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }, [token, currentTeam, apiFetch]);

  // Load Work Items
  const loadWorkItems = useCallback(async () => {
    if (!token || !currentTeam) return;
    try {
      const teamId = currentTeam.id || currentTeam._id;
      let url = `/api/work-items?team=${teamId}&limit=50`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (priorityFilter !== 'ALL') url += `&priority=${priorityFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await apiFetch(url);
      setWorkItems(res.data);
    } catch (err) {
      console.error('Failed to load work items:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [token, currentTeam, statusFilter, priorityFilter, searchQuery, apiFetch]);

  useEffect(() => {
    let active = true;
    if (token) {
      apiFetch('/api/teams')
        .then((res) => {
          if (active) {
            setTeams(res.data);
            if (res.data.length > 0 && !currentTeam) {
              setCurrentTeam(res.data[0]);
            }
          }
        })
        .catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [token, currentTeam, apiFetch]);

  useEffect(() => {
    let active = true;
    if (token && currentTeam) {
      const teamId = currentTeam.id || currentTeam._id;
      Promise.all([
        apiFetch(`/api/dashboard/summary?team=${teamId}`).then((res) => {
          if (active) setMetrics(res.data.metrics);
        }),
        apiFetch(
          `/api/work-items?team=${teamId}&limit=50${
            statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''
          }${priorityFilter !== 'ALL' ? `&priority=${priorityFilter}` : ''}${
            searchQuery.trim()
              ? `&search=${encodeURIComponent(searchQuery.trim())}`
              : ''
          }`
        ).then((res) => {
          if (active) setWorkItems(res.data);
        }),
      ]).catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [token, currentTeam, statusFilter, priorityFilter, searchQuery, apiFetch]);

  // Create Work Item
  const handleCreateWorkItem = async (e) => {
    e.preventDefault();
    if (!itemTitle.trim() || !itemDesc.trim()) return;
    setActionError('');

    try {
      const teamId = currentTeam.id || currentTeam._id;
      await apiFetch('/api/work-items', {
        method: 'POST',
        body: JSON.stringify({
          title: itemTitle,
          description: itemDesc,
          team: teamId,
          type: itemType,
          priority: itemPriority,
          assignee: itemAssignee || null,
        }),
      });

      setIsCreatingItem(false);
      setItemTitle('');
      setItemDesc('');
      setItemAssignee('');
      loadWorkItems();
      loadMetrics();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // Open Item Detail & Load Activity
  const openItemDetail = async (item) => {
    setSelectedItem(item);
    setActionError('');
    setActionSuccess('');
    try {
      const itemId = item.id || item._id;
      const res = await apiFetch(`/api/work-items/${itemId}/activity`);
      setItemActivities(res.data);
    } catch (err) {
      console.error('Failed to load item activity:', err);
    }
  };

  // Transition Workflow Status (State Machine)
  const handleTransition = async (nextStatus) => {
    if (!selectedItem) return;
    setActionError('');
    setActionSuccess('');

    try {
      const itemId = selectedItem.id || selectedItem._id;
      const res = await apiFetch(`/api/work-items/${itemId}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          status: nextStatus,
          expectedVersion: selectedItem.version,
        }),
      });

      const updated = res.data;
      setSelectedItem(updated);
      setActionSuccess(`Status transitioned to ${nextStatus}`);
      loadWorkItems();
      loadMetrics();
      // Refresh activities
      const actRes = await apiFetch(`/api/work-items/${itemId}/activity`);
      setItemActivities(actRes.data);
    } catch (err) {
      setActionError(err.message);
    }
  };

  // Assign Work Item (Atomic Assignment + OCC)
  const handleAssign = async (targetAssigneeId) => {
    if (!selectedItem) return;
    setActionError('');
    setActionSuccess('');

    try {
      const itemId = selectedItem.id || selectedItem._id;
      const res = await apiFetch(`/api/work-items/${itemId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          assignee: targetAssigneeId || null,
          expectedVersion: selectedItem.version,
        }),
      });

      const updated = res.data;
      setSelectedItem(updated);
      setActionSuccess('Assignee updated successfully');
      loadWorkItems();
      loadMetrics();
      const actRes = await apiFetch(`/api/work-items/${itemId}/activity`);
      setItemActivities(actRes.data);
    } catch (err) {
      setActionError(err.message);
    }
  };

  // ==========================================
  // RENDER: Unauthenticated (Auth Screen)
  // ==========================================
  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <div
              className="logo-badge"
              style={{ display: 'inline-block', marginBottom: '12px' }}
            >
              Newtonite Ops
            </div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#fff',
                margin: '4px 0',
              }}
            >
              Operations Management System
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Sign in to manage team workflows and incidents
            </p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
            >
              Create Account
            </button>
          </div>

          {authError && <div className="error-banner">{authError}</div>}

          <form
            onSubmit={handleAuthSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                placeholder="name@company.io"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
              disabled={authLoading}
            >
              {authLoading
                ? 'Processing...'
                : authMode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleDemoLogin}
            >
              ⚡ Quick 1-Click Demo Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Authenticated Dashboard
  // ==========================================
  const currentTeamId = currentTeam?.id || currentTeam?._id;
  const teamMembers = currentTeam?.members || [];

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <header className="navbar">
        <div className="brand-section">
          <span className="logo-badge">N</span>
          <div>
            <div className="brand-title">Newtonite Ops</div>
            <div className="brand-sub">Operations Center</div>
          </div>
        </div>

        <div className="nav-actions">
          {/* Team Switcher */}
          <div className="team-selector">
            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Team:</span>
            {teams.length > 0 ? (
              <select
                value={currentTeamId || ''}
                onChange={(e) => {
                  const found = teams.find(
                    (t) => (t.id || t._id).toString() === e.target.value
                  );
                  if (found) setCurrentTeam(found);
                }}
              >
                {teams.map((t) => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '13px' }}>No teams</span>
            )}
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setIsCreatingTeam(true)}
            >
              + New
            </button>
          </div>

          {/* User Profile & Logout */}
          <div className="user-badge">
            <div className="avatar-circle">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{user?.name}</span>
            <span className="role-pill">Active</span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                color: 'var(--text-dim)',
                fontSize: '12px',
                marginLeft: '6px',
              }}
              title="Logout"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="main-content">
        {/* If no team exists, invite user to create one */}
        {teams.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h2 style={{ color: '#fff', marginBottom: '8px' }}>
              Welcome to Newtonite Ops!
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Create your first team workspace to start organizing work items and tracking activity.
            </p>
            <button
              className="btn-primary"
              onClick={() => setIsCreatingTeam(true)}
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          <>
            {/* Real-time Metrics Grid */}
            <section className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">Total Items</span>
                <span className="metric-value">{metrics?.total || 0}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label" style={{ color: 'var(--status-open)' }}>
                  Open
                </span>
                <span className="metric-value">{metrics?.open || 0}</span>
              </div>
              <div className="metric-card">
                <span
                  className="metric-label"
                  style={{ color: 'var(--status-inprogress)' }}
                >
                  In Progress
                </span>
                <span className="metric-value">{metrics?.inProgress || 0}</span>
              </div>
              <div className="metric-card">
                <span
                  className="metric-label"
                  style={{ color: 'var(--status-blocked)' }}
                >
                  Blocked
                </span>
                <span className="metric-value">{metrics?.blocked || 0}</span>
              </div>
              <div className="metric-card">
                <span
                  className="metric-label"
                  style={{ color: 'var(--status-resolved)' }}
                >
                  Resolved
                </span>
                <span className="metric-value">{metrics?.resolved || 0}</span>
              </div>
              <div className="metric-card">
                <span
                  className="metric-label"
                  style={{ color: 'var(--priority-urgent)' }}
                >
                  Critical / Urgent
                </span>
                <span className="metric-value">
                  {metrics?.criticalOrUrgent || 0}
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label" style={{ color: '#a5b4fc' }}>
                  Assigned To Me
                </span>
                <span className="metric-value">{metrics?.assignedToMe || 0}</span>
              </div>
            </section>

            {/* Filter and Control Bar */}
            <section className="controls-bar">
              <div className="search-filter-group">
                <input
                  type="text"
                  placeholder="Search work items by keyword..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="status-tabs">
                  {[
                    'ALL',
                    'OPEN',
                    'IN_PROGRESS',
                    'BLOCKED',
                    'RESOLVED',
                    'CLOSED',
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`status-tab ${statusFilter === s ? 'active' : ''}`}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="ALL">All Priorities</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActionError('');
                  setIsCreatingItem(true);
                }}
              >
                + Create Work Item
              </button>
            </section>

            {/* Work Items Cards Grid */}
            {loadingItems ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading work items...
              </div>
            ) : workItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h3 style={{ color: '#fff', marginBottom: '6px' }}>
                  No work items match your filter
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  Create a new task or adjust your status/priority filters.
                </p>
              </div>
            ) : (
              <section className="items-grid">
                {workItems.map((item) => {
                  const itemId = item.id || item._id;
                  return (
                    <div
                      key={itemId}
                      className="item-card"
                      onClick={() => openItemDetail(item)}
                    >
                      <div className="item-header">
                        <span className="item-type-badge">{item.type}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge status-${item.status}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                          <span className="version-pill">v{item.version}</span>
                        </div>
                      </div>

                      <div className="item-title">{item.title}</div>
                      <div className="item-desc">{item.description}</div>

                      <div className="item-footer">
                        <span className={`priority-${item.priority}`} style={{ fontSize: '12px' }}>
                          ● {item.priority}
                        </span>

                        <div className="assignee-info">
                          <span>
                            {item.assignee ? item.assignee.name : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      {/* ==========================================
          MODAL: Create Team
          ========================================== */}
      {isCreatingTeam && (
        <div className="modal-overlay" onClick={() => setIsCreatingTeam(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Team Workspace</h3>
              <button
                className="close-btn"
                onClick={() => setIsCreatingTeam(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure Ops"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="What is this team responsible for?"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreatingTeam(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: Create Work Item
          ========================================== */}
      {isCreatingItem && (
        <div className="modal-overlay" onClick={() => setIsCreatingItem(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Work Item</h3>
              <button
                className="close-btn"
                onClick={() => setIsCreatingItem(false)}
              >
                ✕
              </button>
            </div>

            {actionError && <div className="error-banner">{actionError}</div>}

            <form onSubmit={handleCreateWorkItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  placeholder="Brief summary of the issue or task"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={4}
                  placeholder="Detailed instructions or incident context..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={itemPriority}
                    onChange={(e) => setItemPriority(e.target.value)}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assignee (Optional)</label>
                <select
                  value={itemAssignee}
                  onChange={(e) => setItemAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.user?._id || m.user} value={m.user?._id || m.user}>
                      {m.user?.name || 'Member'} ({m.role})
                    </option>
                  ))}
                  {currentTeam?.owner && (
                    <option value={currentTeam.owner?._id || currentTeam.owner}>
                      {currentTeam.owner?.name || 'Owner'} (ADMIN)
                    </option>
                  )}
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreatingItem(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: Item Detail & Lifecycle Operations
          ========================================== */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="item-type-badge">{selectedItem.type}</span>
                <span className="version-pill" style={{ marginLeft: '8px' }}>
                  OCC Version: {selectedItem.version}
                </span>
              </div>
              <button
                className="close-btn"
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
              {selectedItem.title}
            </h3>

            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              {selectedItem.description}
            </p>

            {actionError && <div className="error-banner">{actionError}</div>}
            {actionSuccess && <div className="success-banner">{actionSuccess}</div>}

            {/* Lifecycle / State Machine Transitions */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                }}
              >
                Status & Permitted Workflow Transitions
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className={`badge status-${selectedItem.status}`}>
                  Current: {selectedItem.status.replace('_', ' ')}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>➔</span>

                {(ALLOWED_TRANSITIONS[selectedItem.status] || []).length > 0 ? (
                  ALLOWED_TRANSITIONS[selectedItem.status].map((nextSt) => (
                    <button
                      key={nextSt}
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                      onClick={() => handleTransition(nextSt)}
                    >
                      Move to {nextSt.replace('_', ' ')}
                    </button>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    (Terminal State: No further transitions)
                  </span>
                )}
              </div>
            </div>

            {/* Atomic Assignment */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                <strong>Assignee:</strong>{' '}
                {selectedItem.assignee?.name || 'Unassigned'}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {user && selectedItem.assignee?._id !== user.id && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => handleAssign(user.id)}
                  >
                    Claim This Task
                  </button>
                )}
                {selectedItem.assignee && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => handleAssign(null)}
                  >
                    Unassign
                  </button>
                )}
              </div>
            </div>

            {/* Activity History Audit Trail */}
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                }}
              >
                Immutable Activity Audit Trail
              </div>

              <div className="activity-list">
                {itemActivities.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    No audit records recorded yet.
                  </div>
                ) : (
                  itemActivities.map((act) => {
                    const actId = act.id || act._id;
                    const actorName = act.actor?.name || 'System';
                    const timeStr = new Date(act.createdAt).toLocaleString();
                    return (
                      <div key={actId} className="activity-item">
                        <div>
                          <div>
                            <span className="activity-actor">{actorName}</span>{' '}
                            <span style={{ color: 'var(--text-muted)' }}>
                              performed <strong>{act.action.replace(/_/g, ' ')}</strong>
                            </span>
                          </div>
                          {act.changes && act.changes.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                              {act.changes.map((c, idx) => (
                                <span key={idx}>
                                  {c.field}: {c.oldValue ? String(c.oldValue) : 'none'} ➔ {String(c.newValue)}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="activity-time">{timeStr}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
