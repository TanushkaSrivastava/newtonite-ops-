/**
 * Newtonite Ops Mock Data Adapter
 * Strictly separated fallback adapter for previewing UI states when offline
 * or testing edge-case transitions. Never silently mixes with live backend responses.
 */

export const IS_DEMO_MODE_KEY = 'newtonite_demo_mode_active';

export function isDemoMode() {
  return localStorage.getItem(IS_DEMO_MODE_KEY) === 'true';
}

export function setDemoMode(active) {
  if (active) {
    localStorage.setItem(IS_DEMO_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(IS_DEMO_MODE_KEY);
  }
}

export const MOCK_USERS = [
  { id: 'usr-admin-1', name: 'Newtonite Admin', email: 'admin@newtonite.io', role: 'ADMIN' },
  { id: 'usr-sarah-2', name: 'Sarah Chen', email: 'sarah.chen@newtonite.io', role: 'MANAGER' },
  { id: 'usr-marcus-3', name: 'Marcus Vance', email: 'marcus.vance@newtonite.io', role: 'MEMBER' },
  { id: 'usr-priya-4', name: 'Priya Patel', email: 'priya.patel@newtonite.io', role: 'ADMIN' },
];

export const MOCK_TEAMS = [
  {
    id: 'team-infra-01',
    name: 'Platform & Infrastructure Ops',
    description: 'Core infrastructure, cloud deployments, and 24/7 reliability response.',
    owner: MOCK_USERS[0],
    memberCount: 3,
    members: [
      { user: MOCK_USERS[0], role: 'ADMIN' },
      { user: MOCK_USERS[1], role: 'MANAGER' },
      { user: MOCK_USERS[2], role: 'MEMBER' },
    ],
  },
  {
    id: 'team-pay-02',
    name: 'Customer Reliability & Payments',
    description: 'Managing checkout flows, settlement disputes, and third-party gateway monitoring.',
    owner: MOCK_USERS[3],
    memberCount: 3,
    members: [
      { user: MOCK_USERS[3], role: 'ADMIN' },
      { user: MOCK_USERS[0], role: 'ADMIN' },
      { user: MOCK_USERS[1], role: 'MEMBER' },
    ],
  },
];

export const MOCK_WORK_ITEMS = [
  {
    id: 'wi-7801',
    title: 'Resolve intermittent timeout spikes on payment webhook gateway',
    description: 'Stripe webhook receiver service latency increased to 1200ms in us-east-1. Need connection pool tuning and index review.',
    type: 'INCIDENT',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    team: MOCK_TEAMS[1],
    teamId: 'team-pay-02',
    createdBy: MOCK_USERS[3],
    assignee: MOCK_USERS[1],
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    version: 3,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'wi-7802',
    title: 'Migrate Redis cluster to TLS 1.3 in production environment',
    description: 'Mandatory security compliance requirement. Validate node failover and coordinate 15-minute maintenance window.',
    type: 'ENGINEERING',
    status: 'PENDING_APPROVAL',
    priority: 'HIGH',
    team: MOCK_TEAMS[0],
    teamId: 'team-infra-01',
    createdBy: MOCK_USERS[1],
    assignee: MOCK_USERS[2],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'wi-7803',
    title: 'Audit SOC-2 access logs for third-party contractor accounts',
    description: 'Quarterly compliance audit checklist. Pull IAM session histories and flag inactive accounts exceeding 30 days.',
    type: 'COMPLIANCE',
    status: 'OPEN',
    priority: 'MEDIUM',
    team: MOCK_TEAMS[0],
    teamId: 'team-infra-01',
    createdBy: MOCK_USERS[0],
    assignee: null,
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    version: 0,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'wi-7804',
    title: 'Update rate limit thresholds for public merchant onboarding API',
    description: 'Adjust bucket capacity from 100 req/min to 250 req/min with burst allowance for verified partners.',
    type: 'OPERATIONAL',
    status: 'RESOLVED',
    priority: 'LOW',
    team: MOCK_TEAMS[1],
    teamId: 'team-pay-02',
    createdBy: MOCK_USERS[3],
    assignee: MOCK_USERS[0],
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    version: 4,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'wi-7805',
    title: 'Database connection pool saturation during peak settlement batch',
    description: 'Blocked waiting for read replica scale-out approval. Investigate deadlocks in ledger table.',
    type: 'INCIDENT',
    status: 'BLOCKED',
    priority: 'CRITICAL',
    team: MOCK_TEAMS[0],
    teamId: 'team-infra-01',
    createdBy: MOCK_USERS[2],
    assignee: MOCK_USERS[0],
    dueDate: new Date(Date.now() + 18000000).toISOString(),
    version: 2,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const MOCK_ACTIVITIES = [
  {
    id: 'act-01',
    action: 'STATUS_CHANGED',
    actor: MOCK_USERS[1],
    workItem: { id: 'wi-7801', title: 'Resolve intermittent timeout spikes on payment webhook gateway' },
    changes: [{ field: 'status', oldValue: 'OPEN', newValue: 'IN_PROGRESS' }],
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'act-02',
    action: 'ASSIGNEE_CHANGED',
    actor: MOCK_USERS[3],
    workItem: { id: 'wi-7801', title: 'Resolve intermittent timeout spikes on payment webhook gateway' },
    changes: [{ field: 'assignee', oldValue: null, newValue: 'Sarah Chen' }],
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'act-03',
    action: 'WORK_ITEM_CREATED',
    actor: MOCK_USERS[3],
    workItem: { id: 'wi-7801', title: 'Resolve intermittent timeout spikes on payment webhook gateway' },
    changes: [
      { field: 'status', oldValue: null, newValue: 'OPEN' },
      { field: 'priority', oldValue: null, newValue: 'URGENT' },
    ],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'act-04',
    action: 'STATUS_CHANGED',
    actor: MOCK_USERS[2],
    workItem: { id: 'wi-7805', title: 'Database connection pool saturation during peak settlement batch' },
    changes: [{ field: 'status', oldValue: 'IN_PROGRESS', newValue: 'BLOCKED' }],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];
