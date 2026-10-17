# Newtonite Ops — Operations Management Platform

[![CI / Automated Tests](https://img.shields.io/badge/tests-17%20passed-success)](https://github.com/TanushkaSrivastava/newtonite-ops-)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite%208-blue)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/backend-Express%205%20%2B%20MongoDB%206%2B-green)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-ISC-lightgrey)](./package.json)

**Newtonite Ops** is an enterprise-grade internal operations and incident management platform designed to replace fragmented spreadsheets, emails, and manual follow-ups with a centralized, reliable system.

Built with **React 19**, **Vite 8**, **Node.js**, **Express 5**, and **MongoDB / Mongoose**, Newtonite Ops enforces strict multi-tenant access control, optimistic concurrency control (OCC), finite state machine workflow transitions, automated immutable audit trails, and server-side pagination, search, and dashboard aggregation.

---

## Table of Contents

1. [Key Features & Architectural Guarantees](#key-features--architectural-guarantees)
2. [Technology Stack](#technology-stack)
3. [Repository Architecture](#repository-architecture)
4. [Visual Design System & UX Standards](#visual-design-system--ux-standards)
5. [Application Pages & Workflows](#application-pages--workflows)
6. [Correctness Scenarios Beyond Simple CRUD](#correctness-scenarios-beyond-simple-crud)
7. [Getting Started & Installation](#getting-started--installation)
8. [Demo Credentials](#demo-credentials)
9. [Automated Verification & Test Suite](#automated-verification--test-suite)
10. [API Reference](#api-reference)

---

## Key Features & Architectural Guarantees

- **Authentication & RBAC:** User registration with bcrypt hashing (12 rounds), JWT stateless token authorization, and team-scoped roles (`ADMIN`, `MANAGER`, `MEMBER`).
- **Strict Multi-Tenant Isolation:** Team workspaces act as strict authorization boundaries; cross-team access or unauthorized ticket modification is prevented at the service layer.
- **Atomic Concurrent Assignment (Scenario 1):** Simultaneous assignment requests for the same unassigned item permit at most one winner, returning HTTP `409 Conflict` to competing requests.
- **Optimistic Concurrency Control (Scenario 2):** Prevents lost updates using item `version` numbers. Outdated updates are rejected with `409 Conflict` (`VERSION_CONFLICT`).
- **Finite State Machine (Scenario 3):** Strict workflow transition rules (`OPEN` ➔ `IN_PROGRESS` ➔ `RESOLVED` ➔ `CLOSED`), rejecting invalid jumps with `422 Unprocessable Content`.
- **Immutable Audit Activity Trail:** Automatically captures who made a change, what fields changed (with before/after diffs), and when it occurred.
- **Idempotency Support:** Deduplicates retried create operations using `Idempotency-Key` headers to ensure network retries never create duplicate tickets.
- **Optimized Dashboard:** Computes incident metrics using database-side MongoDB aggregation pipelines without loading full datasets into server memory.
- **Accessible & Restrained B2B Interface:** Designed with Inter typography, accessible status/priority badges, keyboard navigation, and responsive layouts across desktop, tablet, and mobile.

---

## Technology Stack

### Frontend Client
- **Framework:** React 19.2 + Vite 8.3
- **Routing:** React Router DOM 7
- **Icons:** Lucide React (clean outline iconography)
- **Styling:** Modular Vanilla CSS with semantic B2B design tokens & CSS variables
- **Typography:** Inter (Primary interface typeface) + JetBrains Mono (IDs and diffs)
- **Code Quality:** Oxlint (Fast linter)

### Backend Server
- **Runtime:** Node.js (v18+)
- **Server Framework:** Express.js 5
- **Database:** MongoDB Community Server (v6+) with Mongoose 9
- **Validation:** Zod 4
- **Security:** Helmet, CORS, bcryptjs, jsonwebtoken, express-rate-limit
- **Testing:** Vitest 5 & Supertest 7

---

## Repository Architecture

```
newtonite-ops/
├── client/                               # React 19 + Vite 8 Frontend
│   ├── index.html                        # Application entry point with Inter font setup
│   ├── vite.config.js                    # Vite configuration with /api proxy to localhost:5000
│   ├── package.json                      # Client dependencies & scripts
│   └── src/
│       ├── main.jsx                      # DOM mount
│       ├── App.jsx                       # Root router & protected route boundaries
│       ├── index.css                     # Global design tokens, color variables & reset
│       ├── App.css                       # Comprehensive enterprise styling system
│       ├── context/
│       │   └── AuthContext.jsx           # User session, JWT auth & active team state
│       ├── services/
│       │   ├── api.js                    # Centralized fetch client & error handling
│       │   ├── authService.js            # Login, register & session management
│       │   ├── teamService.js            # Teams list, creation & roster management
│       │   ├── workItemService.js        # Work items CRUD, OCC & state transitions
│       │   ├── dashboardService.js       # Live metrics aggregation endpoint
│       │   └── mockAdapter.js            # Isolated fallback adapter for offline preview
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.jsx         # Application shell with responsive sidebar
│       │   │   ├── Sidebar.jsx           # Fixed 236px desktop sidebar & mobile drawer
│       │   │   └── Topbar.jsx            # Breadcrumbs, global search & workspace switcher
│       │   ├── ui/
│       │   │   ├── Button.jsx            # Standardized button variants (primary, outline, danger)
│       │   │   ├── StatusBadge.jsx       # Semantic status badges with indicator dots
│       │   │   ├── PriorityBadge.jsx     # Restrained priority badges
│       │   │   ├── Input.jsx             # Form input and select controls
│       │   │   ├── Modal.jsx             # Accessible modal dialog with escape listener
│       │   │   ├── EmptyState.jsx        # Context-aware empty state cards
│       │   │   ├── LoadingState.jsx      # Skeleton loaders & spinners
│       │   │   └── ErrorState.jsx        # Error alert banner with 409 conflict refresh
│       │   └── work-items/
│       │       └── CreateWorkItemModal.jsx # Ticket creation modal with idempotency support
│       └── pages/
│           ├── Login.jsx                 # Sign-in page with 1-click persona quick fills
│           ├── Register.jsx              # Account registration with validation
│           ├── Dashboard.jsx             # Live metrics, recent tickets & personal queue
│           ├── WorkItems.jsx             # Filterable, sortable, paginated data table
│           ├── WorkItemDetails.jsx       # Details, OCC conflict resolver & audit diffs
│           ├── Teams.jsx                 # Multi-tenant workspace directory & roster
│           ├── Activity.jsx              # Chronological team audit feed
│           └── Settings.jsx              # Operator profile & architecture overview
├── server/                               # Node.js + Express 5 Backend
│   ├── src/
│   │   ├── config/db.js                  # MongoDB connection & graceful shutdown
│   │   ├── models/                       # Mongoose models (User, Team, WorkItem, Activity)
│   │   ├── routes/                       # Express routes (auth, team, workItem, dashboard)
│   │   ├── controllers/                  # Standardized JSON response formatting
│   │   ├── services/                     # Business logic, state machines & OCC guards
│   │   ├── middleware/                   # JWT auth, RBAC authorization, Zod validation
│   │   ├── validators/                   # Input validation schemas (Zod)
│   │   ├── utils/seed.js                 # Realistic seed data script
│   │   ├── app.js                        # Express app middleware configuration
│   │   └── server.js                     # Server entry point & process listeners
│   └── tests/                            # Vitest automated test suites
├── ENGINEERING_DECISIONS.md              # Architectural rationale & concurrency scenarios
└── package.json                          # Root repository scripts
```

---

## Visual Design System & UX Standards

Newtonite Ops avoids generic AI-generated aesthetics, decorative floating blobs, and oversaturated gradients in favor of a clean, restrained B2B enterprise design system:

### Color Tokens
- **Main Text:** `#17212F`
- **Secondary Text:** `#667085`
- **Primary Accent:** `#315EFB` (Hover: `#254EDB`, Subtle: `#EFF4FE`)
- **Sidebar Background:** `#182536`
- **Main Background:** `#F6F7F9`
- **Surface / Cards:** `#FFFFFF`
- **Border:** `#E4E7EC`
- **Success:** `#16805D`
- **Warning:** `#B76A12`
- **Danger / Urgent:** `#C63D43`

### Typography Scale (Inter Typeface)
- **Page Titles:** 26–30px, semibold (`font-weight: 600`)
- **Section Headings:** 17–19px, semibold
- **Body Text:** 14–15px, regular (`font-weight: 400`)
- **Table Content:** 13–14px
- **Form Controls & Buttons:** 13–14px, medium (`font-weight: 500`)
- **IDs & Versions:** 12–13px, `JetBrains Mono`

---

## Application Pages & Workflows

### 1. Login & Registration (`/login`, `/register`)
- Clean, focused enterprise authentication.
- Password input with visible/hidden toggle.
- Convenient **Fast Sign-in Personas** allowing reviewers to test Admin, Manager, and Member roles with 1 click.

### 2. Operations Dashboard (`/dashboard`)
Answers three critical questions immediately:
1. **What needs attention?** KPI cards for Open, In Progress, Urgent/Critical, and Assigned items.
2. **What work am I responsible for?** Dedicated "My Responsibilities" personal queue.
3. **What has changed recently?** Recently updated work items table and chronological activity highlights.

### 3. Work Items Management (`/work-items`)
- Practical search bar (by title, description, or ID).
- Multi-dimensional filters: Status, Priority, Work Item Type, and Assignee.
- Sortable table columns (`Title`, `Status`, `Priority`, `Due Date`, `Updated`).
- Server-side pagination with custom page sizes (10, 20, 50).
- "Clear filters" action with responsive mobile overflow wrapping.

### 4. Create Work Item Form (Modal)
- Fields: Title, Description, Type, Team Workspace, Priority, Assignee, Target Due Date, Approval Requirement.
- Form validation preventing blank or invalid entries.
- Automatically transmits a unique `Idempotency-Key` header with each submission to prevent duplicate work items upon network retries.

### 5. Work Item Details (`/work-items/:id`)
- Displays ticket metadata, current status, priority, and the active **OCC Version Badge** (e.g. `v0`, `v1`, `v2`).
- **Finite State Machine Actions:** Dynamically displays only the valid next statuses permitted by the backend transition matrix.
- **Atomic Assignment:** Assigns work items to team members with version validation.
- **OCC Conflict Resolver:** If another operator updates the ticket concurrently, a prominent warning alert informs the user that the item has been modified and provides an instant **"Refresh to Latest State"** button to eliminate lost updates.
- **Audit Activity Trail:** Chronological timeline showing who made changes, the exact fields modified, and before/after diffs (`oldValue ➔ newValue`).

### 6. Teams & Workspaces (`/teams`)
- Multi-tenant directory listing user teams, descriptions, member counts, and user roles.
- 1-click workspace switching updates the active context across the entire application.
- Team Roster drawer showing members and roles; team administrators can add new members and assign roles.

### 7. Audit Activity (`/activity`)
- Chronological audit feed across the organization.
- Filter by action type (`STATUS_CHANGED`, `ASSIGNEE_CHANGED`, `WORK_ITEM_CREATED`, `WORK_ITEM_UPDATED`).
- Displays clickable links directly to the affected work items.

### 8. Operator Profile & Settings (`/settings`)
- Displays current user profile, email, user ID, and active team workspace memberships.
- Summary of system architecture and correctness guarantees.
- Sign out action.

---

## Correctness Scenarios Beyond Simple CRUD

As detailed in [`ENGINEERING_DECISIONS.md`](./ENGINEERING_DECISIONS.md), the system guarantees correctness across critical real-world concurrency challenges:

### Scenario 1: Atomic Concurrent Assignment
- **Challenge:** Two engineers simultaneously attempt to claim the same unassigned incident ticket.
- **Guarantee:** An atomic conditional query (`findOneAndUpdate({ _id: id, version: expectedVersion })`) ensures at most one worker claims the ticket. The competing worker receives HTTP `409 Conflict`.

### Scenario 2: Stale Update Protection via OCC
- **Challenge:** User A and User B open the same item at version `0`. User A updates and saves (version becomes `1`). User B then submits changes based on stale version `0`.
- **Guarantee:** User B's request fails with HTTP `409 Conflict` (`VERSION_CONFLICT`). The UI alerts User B and provides a 1-click refresh to review latest changes before reapplying edits.

### Scenario 3: State Machine & Workflow Integrity
- **Challenge:** Operators skipping mandatory operational phases (e.g., jumping from `OPEN` directly to `RESOLVED` without `IN_PROGRESS`, or resurrecting a `CLOSED` ticket).
- **Guarantee:** A strict transition matrix enforced on the server rejects illegal status jumps with HTTP `422 Unprocessable Content` (`INVALID_TRANSITION`). The frontend only renders allowed transition buttons.

---

## Getting Started & Installation

### Prerequisites
1. **Node.js:** Ensure Node.js (v18 or higher) is installed.
2. **MongoDB Community Server:** Ensure MongoDB is running locally on port `27017` (or provide a remote URI).

### 1. Environment Configuration

In `server/`, create a `.env` file from `.env.example`:

```bash
cd server
copy .env.example .env
```

Default `.env` configuration:
```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/newtonite_ops
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/newtonite_ops_test
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
CLIENT_URL=http://localhost:5173
```

### 2. Install Dependencies

From the repository root:
```bash
npm install --prefix server
npm install --prefix client
```

### 3. Seed Realistic Demo Data

Populate MongoDB with demo teams, user personas, incident tickets, and audit history:
```bash
npm run seed
```

### 4. Run Both Servers

Start the backend API (port 5000):
```bash
npm run server:dev
```

In a second terminal, start the React frontend (port 5173):
```bash
npm run client:dev
```

Open your browser to: **`http://localhost:5173`**

---

## Demo Credentials

The database seed provides four pre-configured personas:

| Role | Name | Email | Password | Assigned Teams |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Newtonite Admin | `admin@newtonite.io` | `Password123!` | Platform & Infrastructure (Admin), Customer Payments (Admin) |
| **Manager** | Sarah Chen | `sarah.chen@newtonite.io` | `Password123!` | Platform & Infrastructure (Manager), Customer Payments (Member) |
| **Engineer** | Marcus Vance | `marcus.vance@newtonite.io` | `Password123!` | Platform & Infrastructure (Member) |
| **Support** | Priya Patel | `priya.patel@newtonite.io` | `Password123!` | Customer Payments (Admin) |

*(You can also click on the persona buttons on the Login page to sign in instantly without typing).*

---

## Automated Verification & Test Suite

### Run Backend Vitest Suite (17 Tests)
```bash
npm test
```

Test Results:
```
 ✓ tests/authorization.test.js (3 tests)
 ✓ tests/auth.test.js (7 tests)
 ✓ tests/concurrency.test.js (3 tests)
 ✓ tests/workItem.test.js (3 tests)
 ✓ tests/dashboard.test.js (1 test)

 Test Files  5 passed (5)
      Tests  17 passed (17)
```

### Run Frontend Linter & Production Build
```bash
# Fast lint check
npm run client:lint

# Production bundle build
npm run client:build
```

---

## API Reference

All API endpoints are prefixed with `/api`. Protected routes require the `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT |
| `GET` | `/api/auth/me` | Authenticated | Fetch current user profile & memberships |

### Teams (`/api/teams`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teams` | Authenticated | List all teams user belongs to |
| `POST` | `/api/teams` | Authenticated | Create a new team workspace (creator becomes `ADMIN`) |
| `GET` | `/api/teams/:id` | Team Member | Retrieve team details & roster |
| `POST` | `/api/teams/:id/members` | Team Admin | Add member or update member role |

### Work Items (`/api/work-items`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/work-items?team=<teamId>` | Team Member | Filter (`status`, `priority`, `assignee`), search & paginate |
| `POST` | `/api/work-items` | Team Member | Create work item (supports `Idempotency-Key` header) |
| `GET` | `/api/work-items/:id` | Team Member | Get work item details |
| `PATCH` | `/api/work-items/:id` | Team Member | Partial update of allowlisted fields with OCC `version` |
| `POST` | `/api/work-items/:id/assign` | Team Member | Atomic assignment to a member with `expectedVersion` |
| `POST` | `/api/work-items/:id/transition` | Team Member | Transition status with `expectedVersion` validation |
| `GET` | `/api/work-items/:id/activity` | Team Member | Fetch chronological audit activity history |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary?team=<teamId>` | Team Member | Aggregated incident counts & recently updated items |

---

## License

This project is licensed under the ISC License. See [`package.json`](./package.json) for details.
