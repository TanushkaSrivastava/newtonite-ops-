import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { workItemService, WORK_ITEM_TYPES, PRIORITIES } from '../../services/workItemService';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';
import { isDemoMode, MOCK_WORK_ITEMS } from '../../services/mockAdapter';

export function CreateWorkItemModal({ isOpen, onClose, onItemCreated }) {
  const { activeTeam, teams, user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('OPERATIONAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [teamId, setTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync teamId with activeTeam
  useEffect(() => {
    if (activeTeam?.id) {
      setTeamId(activeTeam.id);
    } else if (teams && teams.length > 0) {
      setTeamId(teams[0].id);
    }
  }, [activeTeam, teams, isOpen]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setType('OPERATIONAL');
      setPriority('MEDIUM');
      setAssigneeId('');
      setDueDate('');
      setApprovalRequired(false);
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  const currentSelectedTeam = teams?.find((t) => t.id === teamId) || activeTeam;

  // Extract team members list
  const memberOptions = [];
  if (currentSelectedTeam?.owner) {
    const ownerObj = currentSelectedTeam.owner;
    memberOptions.push({
      value: ownerObj._id || ownerObj.id,
      label: `${ownerObj.name} (Owner)`,
    });
  }
  if (currentSelectedTeam?.members) {
    currentSelectedTeam.members.forEach((m) => {
      const u = m.user;
      if (u && (u._id || u.id)) {
        const uId = u._id || u.id;
        if (!memberOptions.some((o) => o.value === uId)) {
          memberOptions.push({
            value: uId,
            label: `${u.name} (${m.role})`,
          });
        }
      }
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!teamId) {
      setError('Please select a team workspace.');
      return;
    }

    setLoading(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      team: teamId,
      assignee: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      approval: {
        required: approvalRequired,
        status: approvalRequired ? 'PENDING' : 'NOT_REQUIRED',
      },
    };

    try {
      if (isDemoMode()) {
        const mockNew = {
          id: `wi-${Math.floor(1000 + Math.random() * 9000)}`,
          title: payload.title,
          description: payload.description,
          type: payload.type,
          priority: payload.priority,
          status: 'OPEN',
          team: currentSelectedTeam,
          teamId: currentSelectedTeam?.id,
          createdBy: user,
          assignee: memberOptions.find((m) => m.value === assigneeId)
            ? { name: memberOptions.find((m) => m.value === assigneeId).label }
            : null,
          dueDate: payload.dueDate,
          version: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MOCK_WORK_ITEMS.unshift(mockNew);
        setSuccessMsg('Work item created successfully!');
        setTimeout(() => {
          onItemCreated?.(mockNew);
          onClose();
        }, 600);
        return;
      }

      const { item, isDuplicate } = await workItemService.createWorkItem(payload);
      if (isDuplicate) {
        setSuccessMsg('Retrieved existing work item matching this submission.');
      } else {
        setSuccessMsg('Work item created successfully!');
      }

      setTimeout(() => {
        onItemCreated?.(item);
        onClose();
      }, 600);
    } catch (err) {
      setError(err.message || 'Failed to create work item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Work Item"
      subtitle="Log an incident, engineering task, or operational ticket"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="create-item-form">
        {error && (
          <div className="form-error-banner" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="form-success-banner" role="status">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <Input
          label="Title"
          id="item-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of the issue or operation..."
          required
          maxLength={200}
        />

        <div className="form-row-grid">
          <Select
            label="Work Item Type"
            id="item-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={WORK_ITEM_TYPES}
            required
          />

          <Select
            label="Priority"
            id="item-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={PRIORITIES}
            required
          />
        </div>

        <div className="form-row-grid">
          <Select
            label="Team Workspace"
            id="item-team"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setAssigneeId('');
            }}
            required
          >
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>

          <Select
            label="Assignee (Optional)"
            id="item-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder="Unassigned (leave open)"
          >
            {memberOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="form-row-grid">
          <Input
            label="Target Due Date (Optional)"
            id="item-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="form-field checkbox-field">
            <label className="checkbox-label" htmlFor="item-approval">
              <input
                type="checkbox"
                id="item-approval"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
              />
              <span>Requires Manager Approval</span>
            </label>
            <span className="form-helper-msg">
              Blocks state transition until approved
            </span>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="item-desc" className="form-label">
            Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="item-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed background, expected vs observed behavior, and action steps..."
            rows={4}
            required
            maxLength={5000}
          />
        </div>

        <div className="modal-actions-bar">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            icon={Plus}
          >
            Create Work Item
          </Button>
        </div>
      </form>
    </Modal>
  );
}
