import React, { useState, useEffect, useCallback } from 'react';
import {
  Users2,
  Plus,
  Shield,
  UserCheck,
  Building2,
  RefreshCw,
  Check,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { teamService } from '../services/teamService';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { SkeletonRows } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { isDemoMode, MOCK_TEAMS, MOCK_USERS } from '../services/mockAdapter';

export function Teams() {
  const { user, teams, activeTeam, setActiveTeam, refreshTeams, isTeamAdmin } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Create Team Modal
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Team Details & Member Roster Modal
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRole, setTargetRole] = useState('MEMBER');
  const [memberSuccessMsg, setMemberSuccessMsg] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshTeams();
    } catch (err) {
      setError(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!teamName.trim() || teamName.trim().length < 2) {
      setCreateError('Team name must be at least 2 characters.');
      return;
    }

    setCreateLoading(true);
    try {
      if (isDemoMode()) {
        const mockNew = {
          id: `team-demo-${Date.now()}`,
          name: teamName.trim(),
          description: teamDesc.trim(),
          owner: user,
          memberCount: 1,
          members: [{ user, role: 'ADMIN' }],
        };
        MOCK_TEAMS.push(mockNew);
        await refreshTeams();
        setCreateTeamModalOpen(false);
        return;
      }

      const created = await teamService.createTeam({
        name: teamName.trim(),
        description: teamDesc.trim(),
      });

      await refreshTeams();
      setActiveTeam(created);
      setCreateTeamModalOpen(false);
      setTeamName('');
      setTeamDesc('');
    } catch (err) {
      setCreateError(err.message || 'Failed to create team.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenRoster = (team) => {
    setSelectedTeam(team);
    setTargetUserId('');
    setTargetRole('MEMBER');
    setAddMemberError('');
    setMemberSuccessMsg('');
    setRosterModalOpen(true);
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setAddMemberError('');
    setMemberSuccessMsg('');

    if (!targetUserId.trim()) {
      setAddMemberError('Please specify a valid user ID.');
      return;
    }

    setAddMemberLoading(true);
    try {
      if (isDemoMode()) {
        setMemberSuccessMsg('Member added to team in demo mode.');
        setTimeout(() => setRosterModalOpen(false), 800);
        return;
      }

      const updated = await teamService.addTeamMember(selectedTeam.id, {
        userId: targetUserId.trim(),
        role: targetRole,
      });

      setSelectedTeam(updated);
      setMemberSuccessMsg('Team member added successfully.');
      setTargetUserId('');
      await refreshTeams();
    } catch (err) {
      setAddMemberError(
        err.message || 'Failed to add member. Only administrators can manage roster.'
      );
    } finally {
      setAddMemberLoading(false);
    }
  };

  const getUserRoleInTeam = (team) => {
    if (!user || !team) return 'MEMBER';
    if (team.owner?._id === user.id || team.owner === user.id) return 'ADMIN (Owner)';
    const mem = team.members?.find(
      (m) => (m.user?._id || m.user?.id || m.user)?.toString() === user.id.toString()
    );
    return mem?.role || 'MEMBER';
  };

  return (
    <div className="page-container teams-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Teams & Workspaces</h1>
          <p className="page-description text-secondary">
            Manage multi-tenant operational boundaries, team access controls, and member rosters.
          </p>
        </div>

        <div className="page-actions">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            loading={refreshing}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setCreateTeamModalOpen(true)}
          >
            Create Team
          </Button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={handleRefresh} />}

      {/* Teams Table */}
      <div className="data-table-container">
        {loading ? (
          <SkeletonRows rows={4} columns={5} />
        ) : !teams || teams.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No teams found"
            description="You are not currently enrolled in any operational team workspaces."
            actionLabel="Create Team Workspace"
            onAction={() => setCreateTeamModalOpen(true)}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Team Name</th>
                <th>Description</th>
                <th style={{ width: '130px' }}>Owner</th>
                <th style={{ width: '110px' }}>Members</th>
                <th style={{ width: '140px' }}>Your Role</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const isSelected = activeTeam?.id === t.id;
                const role = getUserRoleInTeam(t);
                const isAdmin = role.includes('ADMIN');

                return (
                  <tr key={t.id} className={isSelected ? 'table-row-highlight' : ''}>
                    <td>
                      <div className="team-cell-title">
                        <Building2 size={15} className="text-secondary" />
                        <div>
                          <strong className="team-name-text">{t.name}</strong>
                          {isSelected && (
                            <span className="active-tag">Active Workspace</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-secondary">
                      {t.description || <span className="text-tertiary">No description provided</span>}
                    </td>
                    <td className="text-sm">
                      {t.owner?.name || 'Admin'}
                    </td>
                    <td>
                      <span className="member-count-pill">
                        {t.members?.length || 1} members
                      </span>
                    </td>
                    <td>
                      <span className={`role-pill role-${role.toLowerCase().replace(/[^a-z]/g, '')}`}>
                        {role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-group">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenRoster(t)}
                        >
                          Roster
                        </Button>
                        {!isSelected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTeam(t)}
                          >
                            Switch To
                          </Button>
                        ) : (
                          <span className="current-badge">
                            <Check size={13} /> Selected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
        title="Create Team Workspace"
        subtitle="Establish an isolated multi-tenant operations workspace"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateTeamSubmit} className="create-item-form">
          {createError && (
            <div className="form-error-banner" role="alert">
              <AlertTriangle size={15} />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Team Name"
            id="team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Core Infrastructure & Reliability"
            required
            maxLength={100}
          />

          <div className="form-field">
            <label htmlFor="team-desc" className="form-label">
              Description (Optional)
            </label>
            <textarea
              id="team-desc"
              value={teamDesc}
              onChange={(e) => setTeamDesc(e.target.value)}
              placeholder="Scope of operations, on-call schedules, or team mandate..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="modal-actions-bar">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCreateTeamModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={createLoading}
              icon={Plus}
            >
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Team Roster Modal */}
      <Modal
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={`${selectedTeam?.name || 'Team'} — Roster`}
        subtitle="Member permissions and multi-tenant access control"
        maxWidth="600px"
      >
        <div className="roster-modal-content">
          {memberSuccessMsg && (
            <div className="form-success-banner mb-3" role="status">
              <CheckCircle2 size={15} />
              <span>{memberSuccessMsg}</span>
            </div>
          )}

          {addMemberError && (
            <div className="form-error-banner mb-3" role="alert">
              <AlertTriangle size={15} />
              <span>{addMemberError}</span>
            </div>
          )}

          <div className="roster-list-section">
            <h4 className="text-xs font-semibold text-secondary uppercase mb-2">
              Current Members ({selectedTeam?.members?.length || 0})
            </h4>

            <ul className="roster-list">
              {/* Owner Item */}
              {selectedTeam?.owner && (
                <li className="roster-item">
                  <div className="roster-user-info">
                    <span className="roster-user-name">
                      {selectedTeam.owner.name}
                    </span>
                    <span className="roster-user-email">
                      {selectedTeam.owner.email}
                    </span>
                  </div>
                  <span className="role-pill role-admin">ADMIN (Owner)</span>
                </li>
              )}

              {/* Members */}
              {selectedTeam?.members?.map((m, idx) => {
                const u = m.user;
                if (!u || u._id === selectedTeam?.owner?._id) return null;
                return (
                  <li key={idx} className="roster-item">
                    <div className="roster-user-info">
                      <span className="roster-user-name">{u.name || 'Member'}</span>
                      <span className="roster-user-email">{u.email || u}</span>
                    </div>
                    <span className={`role-pill role-${m.role.toLowerCase()}`}>
                      {m.role}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Add Member Form (Only if current user is ADMIN of this team) */}
          {selectedTeam && getUserRoleInTeam(selectedTeam).includes('ADMIN') && (
            <form onSubmit={handleAddMemberSubmit} className="roster-add-form">
              <h4 className="text-xs font-semibold text-secondary uppercase mb-2">
                Add Member or Update Role (Admin Only)
              </h4>
              <div className="form-row-grid">
                <Input
                  label="Target User ID"
                  id="target-user-id"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Paste user's ObjectId..."
                  required
                />

                <Select
                  label="Assigned Role"
                  id="target-user-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  options={[
                    { value: 'MEMBER', label: 'Member' },
                    { value: 'MANAGER', label: 'Manager' },
                    { value: 'ADMIN', label: 'Admin' },
                  ]}
                  required
                />
              </div>

              <div className="mt-2 text-right">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={addMemberLoading}
                  icon={UserPlus}
                >
                  Add to Team
                </Button>
              </div>
            </form>
          )}

          <div className="modal-actions-bar mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRosterModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
