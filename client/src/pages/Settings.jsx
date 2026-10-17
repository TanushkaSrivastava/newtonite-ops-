import React from 'react';
import {
  User,
  Shield,
  Building2,
  Key,
  LogOut,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export function Settings() {
  const { user, teams, logout, activeTeam } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'NO';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="page-container settings-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Operator Profile & Settings</h1>
          <p className="page-description text-secondary">
            Account identity, team memberships, and system configuration.
          </p>
        </div>

        <div className="page-actions">
          <Button variant="danger" size="md" icon={LogOut} onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="settings-grid">
        {/* User Account Profile */}
        <div className="content-card">
          <div className="card-header-row">
            <h3 className="card-section-title">Account Details</h3>
          </div>

          <div className="profile-hero-section">
            <div className="profile-large-avatar">{getInitials(user?.name)}</div>
            <div className="profile-hero-details">
              <h2 className="profile-hero-name">{user?.name || 'Operator'}</h2>
              <span className="profile-hero-email text-secondary">
                {user?.email || 'user@newtonite.io'}
              </span>
              <span className="user-id-badge font-mono text-xs">
                User ID: {user?.id || '—'}
              </span>
            </div>
          </div>

          <div className="settings-divider" />

          <dl className="property-list">
            <div className="property-item">
              <dt>Authentication Method</dt>
              <dd>JWT Bearer Token (Stateless)</dd>
            </div>
            <div className="property-item">
              <dt>Password Encryption</dt>
              <dd>Bcrypt (12 Rounds Salt)</dd>
            </div>
            <div className="property-item">
              <dt>Session Duration</dt>
              <dd>7 Days Valid</dd>
            </div>
          </dl>
        </div>

        {/* Team & Role Memberships */}
        <div className="content-card">
          <div className="card-header-row">
            <h3 className="card-section-title">Team Workspace Roles</h3>
            <span className="count-pill">{teams?.length || 0} teams</span>
          </div>

          <p className="text-secondary text-xs mb-3">
            Your role within each team determines your authorization boundary according to backend RBAC rules.
          </p>

          <ul className="settings-teams-list">
            {teams?.map((t) => {
              const isCurrent = activeTeam?.id === t.id;
              const mem = user?.memberships?.find(
                (m) => (m.teamId?.id || m.teamId || '').toString() === t.id.toString()
              );
              const isOwner = t.owner?._id === user?.id || t.owner === user?.id;
              const roleName = isOwner ? 'ADMIN (Owner)' : mem?.role || 'MEMBER';

              return (
                <li key={t.id} className="settings-team-item">
                  <div className="team-item-left">
                    <Building2 size={16} className="text-secondary" />
                    <div>
                      <strong className="text-sm">{t.name}</strong>
                      {isCurrent && (
                        <span className="active-tag ml-2">Current Active</span>
                      )}
                    </div>
                  </div>
                  <span className={`role-pill role-${roleName.toLowerCase().replace(/[^a-z]/g, '')}`}>
                    {roleName}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* System Architecture & Correctness Guarantees */}
        <div className="content-card full-span-card">
          <div className="card-header-row">
            <h3 className="card-section-title">System Architecture & Correctness Protocol</h3>
          </div>

          <div className="architecture-grid">
            <div className="arch-card">
              <div className="arch-header">
                <CheckCircle2 size={16} className="text-success" />
                <strong>Atomic Assignment</strong>
              </div>
              <p className="text-xs text-secondary">
                Conditional atomic queries ensure only one engineer claims an unassigned ticket. Competing requests receive <code>409 Conflict</code>.
              </p>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <CheckCircle2 size={16} className="text-success" />
                <strong>Optimistic Concurrency Control</strong>
              </div>
              <p className="text-xs text-secondary">
                Mutation requests require item <code>version</code>. Stale updates are detected and rejected to eliminate lost-update anomalies.
              </p>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <CheckCircle2 size={16} className="text-success" />
                <strong>Finite State Machine</strong>
              </div>
              <p className="text-xs text-secondary">
                Enforces validated state transitions (<code>OPEN</code> ➔ <code>IN_PROGRESS</code> ➔ <code>RESOLVED</code> ➔ <code>CLOSED</code>). Invalid state jumps are rejected with <code>422 Unprocessable Content</code>.
              </p>
            </div>

            <div className="arch-card">
              <div className="arch-header">
                <CheckCircle2 size={16} className="text-success" />
                <strong>Audit Trail Logging</strong>
              </div>
              <p className="text-xs text-secondary">
                Every ticket mutation records immutable before/after diffs, actor ID, and timestamps for operational accountability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
