import { request } from './api';

export const ALLOWED_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'BLOCKED', 'CLOSED'],
  IN_PROGRESS: ['BLOCKED', 'PENDING_APPROVAL', 'RESOLVED', 'OPEN'],
  BLOCKED: ['IN_PROGRESS', 'OPEN'],
  PENDING_APPROVAL: ['RESOLVED', 'IN_PROGRESS'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

export const WORK_ITEM_TYPES = [
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'CUSTOMER_ISSUE', label: 'Customer Issue' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'OTHER', label: 'Other' },
];

export const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export const workItemService = {
  async getWorkItems(params = {}) {
    const query = {
      team: params.teamId || params.team,
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
      priority: params.priority && params.priority !== 'ALL' ? params.priority : undefined,
      assignee: params.assignee && params.assignee !== 'ALL' ? params.assignee : undefined,
      search: params.search?.trim() || undefined,
      sortBy: params.sortBy || 'updatedAt',
      order: params.order || 'desc',
      page: params.page || 1,
      limit: params.limit || 20,
    };

    const res = await request('/work-items', { params: query });
    return {
      items: res.data || [],
      pagination: res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    };
  },

  async getWorkItemById(id) {
    const res = await request(`/work-items/${id}`);
    return res.data;
  },

  async createWorkItem(data, idempotencyKey = null) {
    // Generate idempotency key if not provided to guarantee retry safety
    const key = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    const res = await request('/work-items', {
      method: 'POST',
      body: data,
      idempotencyKey: key,
    });
    return {
      item: res.data,
      isDuplicate: !!res.isDuplicate,
    };
  },

  async updateWorkItem(id, updates) {
    // updates must include 'version' for OCC verification
    const res = await request(`/work-items/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    return res.data;
  },

  async assignWorkItem(id, { assignee, expectedVersion }) {
    const res = await request(`/work-items/${id}/assign`, {
      method: 'POST',
      body: { assignee, expectedVersion },
    });
    return res.data;
  },

  async transitionWorkItem(id, { status, expectedVersion }) {
    const res = await request(`/work-items/${id}/transition`, {
      method: 'POST',
      body: { status, expectedVersion },
    });
    return res.data;
  },

  async getWorkItemActivities(id, params = {}) {
    const res = await request(`/work-items/${id}/activity`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
      },
    });
    return {
      activities: res.data || [],
      pagination: res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    };
  },
};
