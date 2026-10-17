# Newtonite Ops — Operations Management System

A robust, enterprise-grade backend for the Newtonite Operations Management System built with **Node.js**, **Express**, **MongoDB**, and **Mongoose**.

Newtonite Ops enforces strict multi-tenant access control, preserves comprehensive audit activity history, handles concurrent race conditions via atomic updates and optimistic concurrency control (OCC), validates state-machine workflow transitions, and supports server-side pagination, search, and dashboard aggregation.

---

## Key Features

- **Authentication & RBAC:** User registration, password hashing with bcrypt, JWT token authentication, and team role-based authorization (`ADMIN`, `MANAGER`, `MEMBER`).
- **Team Isolation:** Strict multi-tenant boundaries preventing cross-team data access or unauthorized operations.
- **Atomic Concurrency (Scenario 1):** Simultaneous assignment requests for the same unassigned item permit at most one winner, returning HTTP `409 Conflict` to competing requests.
- **Optimistic Concurrency Control (Scenario 2):** Prevents lost updates using item `version` numbers. Outdated updates are rejected with `409 Conflict` (`VERSION_CONFLICT`).
- **Finite State Machine (Scenario 3):** Strict workflow transition rules (`OPEN` ➔ `IN_PROGRESS` ➔ `RESOLVED` ➔ `CLOSED`), rejecting invalid jumps with `422 Unprocessable Content`.
- **Audit Activity Trail:** Automatically captures who made a change, what fields changed (with before/after diffs), and when it occurred.
- **Idempotency Support:** Deduplicates retried create operations using `Idempotency-Key` headers.
- **Optimized Dashboard:** Computes incident metrics using database-side MongoDB aggregation pipelines without loading full datasets into server memory.

---

## Technology Stack

- **Runtime:** Node.js (v18+)
- **Server Framework:** Express.js 5
- **Database:** MongoDB Community Server (v6+) with Mongoose 9
- **Validation:** Zod 4
- **Security:** Helmet, CORS, bcryptjs, jsonwebtoken
- **Testing:** Vitest & Supertest
- **Frontend Client:** React 19 + Vite 8

---

## Directory Structure

```
newtonite-ops/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection & graceful shutdown
│   │   ├── models/
│   │   │   ├── User.js               # User accounts & memberships
│   │   │   ├── Team.js               # Team ownership & roster
│   │   │   ├── WorkItem.js           # Work items with OCC versioning & indexes
│   │   │   └── Activity.js           # Immutable audit log
│   │   ├── routes/
│   │   │   ├── auth.routes.js        # Authentication endpoints
│   │   │   ├── team.routes.js        # Team management endpoints
│   │   │   ├── workItem.routes.js    # Work item CRUD & lifecycle endpoints
│   │   │   └── dashboard.routes.js   # Analytics & summary endpoints
│   │   ├── controllers/              # Request parsing & standardized JSON responses
│   │   ├── services/                 # Business logic, state machines & concurrency
│   │   ├── middleware/
│   │   │   ├── authenticate.js       # JWT extraction & identity verification
│   │   │   ├── authorize.js          # Role & team access enforcement
│   │   │   ├── validate.js           # Zod schema request validation
│   │   │   └── errorHandler.js       # Centralized error handling & status codes
│   │   ├── validators/               # Input schemas (Zod)
│   │   ├── utils/
│   │   │   └── asyncHandler.js       # Async wrapper
│   │   ├── app.js                    # Express app configuration
│   │   └── server.js                 # Server startup & process listeners
│   ├── tests/
│   │   ├── setup.js                  # Test database lifecycle
│   │   ├── auth.test.js              # Auth & session tests
│   │   ├── authorization.test.js     # Team isolation & RBAC tests
│   │   ├── workItem.test.js          # CRUD, pagination, search & audit tests
│   │   ├── concurrency.test.js       # Concurrency, OCC & state transition tests
│   │   └── dashboard.test.js         # Aggregation metrics tests
│   ├── .env.example                  # Environment configuration template
│   └── package.json
├── client/                           # React + Vite frontend
├── ENGINEERING_DECISIONS.md          # Architectural rationale & correctness scenarios
└── package.json                      # Root scripts
```

---

## Prerequisites

1. **Node.js:** Ensure Node.js (v18 or higher) is installed.
2. **MongoDB Community Server:** Ensure MongoDB Community Server is installed and running locally on port `27017`.

---

## Setup & Installation

### 1. Configure Environment Variables

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

---

## Running the Application

### Start Backend Development Server
```bash
npm run server:dev
# Server will run on http://localhost:5000
```

### Start Frontend Client
```bash
npm run client:dev
# Client will run on http://localhost:5173 (with /api proxy to backend)
```

### Run Automated Test Suite
```bash
npm run test
# Executes all 5 Vitest suites (17 tests covering auth, RBAC, OCC, concurrency, and workflows)
```

---

## API Reference

All API routes are prefixed with `/api`. Protected routes require the `Authorization: Bearer <token>` header.

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
| `POST` | `/api/teams` | Authenticated | Create a new team (creator becomes `ADMIN`) |
| `GET` | `/api/teams/:id` | Team Member | Retrieve team details & roster |
| `POST` | `/api/teams/:id/members` | Team Admin | Add or update a member's role |

### Work Items (`/api/work-items`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/work-items?team=<teamId>` | Team Member | List, filter (`status`, `priority`, `assignee`), search, and paginate work items |
| `POST` | `/api/work-items` | Team Member | Create work item (supports `Idempotency-Key` header) |
| `GET` | `/api/work-items/:id` | Team Member | Get work item details |
| `PATCH` | `/api/work-items/:id` | Team Member | Partial update of allowlisted fields with OCC `version` check |
| `POST` | `/api/work-items/:id/assign` | Team Member | Atomic assignment to a team member with `expectedVersion` |
| `POST` | `/api/work-items/:id/transition` | Team Member | Transition workflow status with `expectedVersion` validation |
| `GET` | `/api/work-items/:id/activity` | Team Member | Fetch chronological audit activity history |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary?team=<teamId>` | Team Member | Aggregated incident counts & recently updated items |

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "660c1d...",
    "title": "Resolve latency in payment webhook",
    "status": "OPEN",
    "version": 0
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This item was changed by another user. Refresh and try again."
  }
}
```

---

## Verification & Test Results

Run `npm test` from the root directory:

```
 ✓ tests/auth.test.js (7 tests)
 ✓ tests/authorization.test.js (3 tests)
 ✓ tests/concurrency.test.js (3 tests)
 ✓ tests/workItem.test.js (3 tests)
 ✓ tests/dashboard.test.js (1 test)

 Test Files  5 passed (5)
      Tests  17 passed (17)
```
