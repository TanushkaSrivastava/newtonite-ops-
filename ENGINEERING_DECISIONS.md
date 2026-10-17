# Newtonite Ops — Engineering Decisions & Correctness Architecture

This document outlines the architectural choices, data integrity mechanisms, correctness scenarios, and trade-offs implemented in the Newtonite Operations Management System backend.

---

## 1. Architectural Philosophy & Layer Separation

To maintain testability, maintainability, and clean separation of concerns, the backend is strictly decoupled into distinct functional layers:

```
HTTP Request
     │
     ▼
[Middleware Layer]  ──► Helmet (Security), CORS, Rate Limiting, Authenticate (JWT), Authorize (RBAC), Validate (Zod)
     │
     ▼
[Controllers Layer] ──► Parse parameters, extract idempotency tokens, delegate to services, format standardized JSON
     │
     ▼
[Services Layer]    ──► Core business logic, workflow state machines, concurrency guards, audit logging
     │
     ▼
[Models Layer]      ──► Mongoose schema constraints, compound indexes, type validation
     │
     ▼
[MongoDB Engine]    ──► Atomic conditional queries, partial unique indexes, aggregation pipelines
```

- **Routes (`src/routes/`)**: Define RESTful HTTP verbs and route paths.
- **Middleware (`src/middleware/`)**: Enforce security headers, JWT validation, resource-level authorization, request validation, and centralized error handling.
- **Controllers (`src/controllers/`)**: Translate HTTP requests into service function calls and return standard response envelopes.
- **Services (`src/services/`)**: Encapsulate all business rules, optimistic concurrency checks, state transitions, and audit generation.
- **Models (`src/models/`)**: Define database schemas, compound indexing, validation constraints, and transformations.

---

## 2. Correctness Scenarios Beyond Simple CRUD

As required by the Newtonite Software Engineering Challenge, the backend implements automated correctness guarantees for three critical real-world concurrency and workflow challenges:

### Scenario 1: Atomic Concurrent Assignment
* **The Problem:** In a busy operations center, two engineers view the same unassigned incident simultaneously and both attempt to claim it. A naive "read-modify-write" allows both requests to succeed or results in undefined ownership.
* **Backend Implementation:**
  The assignment operation is performed atomically using a single conditional query:
  ```javascript
  const updated = await WorkItem.findOneAndUpdate(
    {
      _id: id,
      version: expectedVersion, // Verifies item hasn't mutated since client fetched it
    },
    {
      $set: { assignee: targetAssigneeId },
      $inc: { version: 1 },
    },
    { returnDocument: "after", runValidators: true }
  );
  ```
* **Guaranteed Outcome:** Exactly one worker succeeds with `200 OK`. The competing request receives `409 Conflict` (`VERSION_CONFLICT`). An `ASSIGNEE_CHANGED` audit record is created for the successful claim.

### Scenario 2: Stale Update Protection via Optimistic Concurrency Control (OCC)
* **The Problem:** User A and User B open a work item at version `0`. User A updates the description and saves (version becomes `1`). User B then submits an edit based on the stale version `0`. An unconditional write would silently erase User A's work ("lost update" anomaly).
* **Backend Implementation:**
  Every write operation requires a `version` field from the client. Updates verify both `_id` and `version: expectedVersion`, and increment `version` by 1:
  ```javascript
  const updated = await WorkItem.findOneAndUpdate(
    { _id: id, version: expectedVersion },
    { $set: allowedUpdates, $inc: { version: 1 } },
    { returnDocument: "after", runValidators: true }
  );
  if (!updated) {
    throw new AppError("This item was changed by another user. Refresh and try again.", 409, "VERSION_CONFLICT");
  }
  ```
* **Guaranteed Outcome:** The stale request is rejected with `409 Conflict`, leaving User A's changes intact.

### Scenario 3: State Machine & Workflow Integrity
* **The Problem:** Work items must move through a defined lifecycle. Unrestricted status updates allow operators to skip mandatory phases (e.g. jumping from `OPEN` directly to `RESOLVED` without `IN_PROGRESS`, or resurrecting a `CLOSED` ticket).
* **Backend Implementation:**
  A finite state machine matrix is defined in `workItem.service.js`:
  ```javascript
  const ALLOWED_TRANSITIONS = {
    OPEN: ["IN_PROGRESS", "BLOCKED", "CLOSED"],
    IN_PROGRESS: ["BLOCKED", "PENDING_APPROVAL", "RESOLVED", "OPEN"],
    BLOCKED: ["IN_PROGRESS", "OPEN"],
    PENDING_APPROVAL: ["RESOLVED", "IN_PROGRESS"],
    RESOLVED: ["CLOSED", "IN_PROGRESS"],
    CLOSED: [], // Terminal state
  };
  ```
  The transition service checks the current state against the transition matrix and atomically updates the database:
  ```javascript
  const updated = await WorkItem.findOneAndUpdate(
    { _id: id, status: current.status, version: expectedVersion },
    { $set: { status: nextStatus }, $inc: { version: 1 } },
    { returnDocument: "after", runValidators: true }
  );
  ```
* **Guaranteed Outcome:** Invalid transitions are rejected with `422 Unprocessable Content` (`INVALID_TRANSITION`). The item's state in the database remains unchanged.

---

## 3. Multi-Tenant Authorization & Access Control

1. **Team Isolation:** All work items are strictly scoped to a `Team`.
2. **Resource-Level Verification:** When accessing or modifying any resource (`/api/work-items/:id`), the user's membership in the associated team is validated against database records. An unauthorized user receives `403 Forbidden` (`FORBIDDEN`).
3. **Assignee Boundary Checks:** When assigning a work item, the backend validates that the target user is an active member or owner of that specific team. Outsiders cannot be assigned team items (`400 Bad Request`, `INVALID_ASSIGNEE`).
4. **Role Enforcement:** Team administrative actions (such as adding members or managing roles) require the `ADMIN` role.

---

## 4. Idempotency & Network Retry Safety

In unreliable network environments, clients may re-send work item creation requests upon timeout:
- The backend supports the `Idempotency-Key` (or `X-Idempotency-Key`) HTTP header.
- A compound unique partial index `{ team: 1, idempotencyKey: 1 }` is defined on `WorkItem`.
- Re-transmitting an identical request returns the already-created item with `isDuplicate: true` and status `200 OK` rather than generating duplicate tickets.

---

## 5. Indexing & Query Optimization Strategy

Indexes are tailored directly to dashboard aggregations and query patterns:

| Index | Type | Purpose |
| :--- | :--- | :--- |
| `{ email: 1 }` | Unique | Fast authentication lookup & uniqueness guarantee |
| `{ team: 1, status: 1, updatedAt: -1 }` | Compound | Filtered team listing & status board sorting |
| `{ team: 1, priority: 1, createdAt: -1 }` | Compound | Incident prioritization queries |
| `{ team: 1, assignee: 1, status: 1 }` | Compound | "Assigned to me" queries without in-memory scans |
| `{ team: 1, idempotencyKey: 1 }` | Unique Partial | Enforce idempotency without table scans |
| `{ workItem: 1, createdAt: -1 }` | Compound | Fast chronological audit history retrieval |
| `{ title: "text", description: "text" }` | Text | Efficient keyword search |

### Dashboard Aggregation Pipeline
Dashboard summaries (`GET /api/dashboard/summary`) use MongoDB `$facet` and `$group` aggregation pipelines directly on the database engine. This computes counts for `open`, `inProgress`, `blocked`, `resolved`, `criticalOrUrgent`, and `assignedToMe` without loading documents into Node.js application memory.

---

## 6. Known Limitations & Future Roadmap

1. **Multi-Document ACID Transactions:** Multi-document atomic transactions in MongoDB require a replica set. In standalone local Community Server deployments without replica set configuration, atomic conditional updates (`findOneAndUpdate`) are utilized for single-document atomicity.
2. **Real-time Event Streaming:** Currently, the system uses polling and REST endpoints. In high-frequency operational environments, WebSocket or Server-Sent Events (SSE) should be attached to the `Activity` log stream.
3. **Soft Deletes:** Items are archived using the terminal `CLOSED` state. If permanent deletion is needed, soft-deletion via `deletedAt` flags should be introduced.
