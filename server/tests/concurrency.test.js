import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { setupTestDB, clearTestDB, teardownTestDB } from "./setup";
import WorkItem from "../src/models/WorkItem";

describe("Concurrency, Consistency & Correctness Scenarios", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  async function registerUser(name, email) {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name, email, password: "Password123!" });
    return { token: res.body.data.token, user: res.body.data.user };
  }

  // =========================================================================
  // SCENARIO 1: ATOMIC ASSIGNMENT CONCURRENCY
  // =========================================================================
  it("Scenario 1: Concurrent assignment of the same unassigned item permits at most one success", async () => {
    // 1. Create team owner and two team members
    const owner = await registerUser("Owner", "owner.team@newtonite.io");
    const engineer1 = await registerUser("Engineer One", "eng1@newtonite.io");
    const engineer2 = await registerUser("Engineer Two", "eng2@newtonite.io");

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "DevOps Crew" });

    const teamId = teamRes.body.data.id || teamRes.body.data._id;

    // Add both engineers to team
    await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: engineer1.user.id, role: "MEMBER" });

    await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: engineer2.user.id, role: "MEMBER" });

    // 2. Create unassigned work item
    const itemRes = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Major Outage Triage",
        description: "Respond to payment gateway failures",
        team: teamId,
        priority: "CRITICAL",
      });

    const item = itemRes.body.data;
    const itemId = item.id || item._id;
    const initialVersion = item.version; // 0

    // 3. Both engineers concurrently attempt to claim this item at version 0
    const [claim1, claim2] = await Promise.all([
      request(app)
        .post(`/api/work-items/${itemId}/assign`)
        .set("Authorization", `Bearer ${engineer1.token}`)
        .send({
          assignee: engineer1.user.id,
          expectedVersion: initialVersion,
        }),
      request(app)
        .post(`/api/work-items/${itemId}/assign`)
        .set("Authorization", `Bearer ${engineer2.token}`)
        .send({
          assignee: engineer2.user.id,
          expectedVersion: initialVersion,
        }),
    ]);

    const statuses = [claim1.status, claim2.status];

    // Exactly one must succeed (200), and the other must be rejected (409 Conflict)
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    // Verify database state: item has incremented version (1) and exactly one assignee
    const dbItem = await WorkItem.findById(itemId);
    expect(dbItem.version).toBe(1);
    expect(dbItem.assignee).not.toBeNull();
    const winningAssignee = dbItem.assignee.toString();
    expect([engineer1.user.id, engineer2.user.id]).toContain(winningAssignee);
  });

  // =========================================================================
  // SCENARIO 2: STALE UPDATE REJECTION VIA OPTIMISTIC CONCURRENCY
  // =========================================================================
  it("Scenario 2: Reject stale update with HTTP 409 when user submits outdated version", async () => {
    const owner = await registerUser("Owner OCC", "occ.owner@newtonite.io");

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "OCC Test Team" });

    const teamId = teamRes.body.data.id || teamRes.body.data._id;

    const itemRes = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Version Controlled Task",
        description: "Demonstrating optimistic concurrency protection",
        team: teamId,
      });

    const item = itemRes.body.data;
    const itemId = item.id || item._id;

    // Update 1: version 0 -> 1 succeeds
    const firstUpdate = await request(app)
      .patch(`/api/work-items/${itemId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Version Controlled Task - Edit 1",
        version: 0,
      });

    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body.data.version).toBe(1);

    // Update 2: Stale update using version 0 again -> must receive 409 Conflict
    const staleUpdate = await request(app)
      .patch(`/api/work-items/${itemId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Stale Overwrite Attempt",
        version: 0,
      });

    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.success).toBe(false);
    expect(staleUpdate.body.error.code).toBe("VERSION_CONFLICT");

    // Verify database state: was NOT overwritten by the stale update
    const dbItem = await WorkItem.findById(itemId);
    expect(dbItem.title).toBe("Version Controlled Task - Edit 1");
    expect(dbItem.version).toBe(1);
  });

  // =========================================================================
  // SCENARIO 3: WORKFLOW STATE TRANSITION VALIDATION
  // =========================================================================
  it("Scenario 3: Validate workflow transitions and reject invalid state transitions", async () => {
    const owner = await registerUser("Workflow Lead", "workflow@newtonite.io");

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Workflow Validation Team" });

    const teamId = teamRes.body.data.id || teamRes.body.data._id;

    // Create item in OPEN state
    const itemRes = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Strict Workflow Item",
        description: "Checking that transitions follow prescribed lifecycle",
        team: teamId,
      });

    const itemId = itemRes.body.data.id || itemRes.body.data._id;

    // 1. Attempt INVALID transition: OPEN -> RESOLVED (cannot bypass IN_PROGRESS)
    const invalidJump = await request(app)
      .post(`/api/work-items/${itemId}/transition`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        status: "RESOLVED",
        expectedVersion: 0,
      });

    expect(invalidJump.status).toBe(422);
    expect(invalidJump.body.success).toBe(false);
    expect(invalidJump.body.error.code).toBe("INVALID_TRANSITION");

    // Verify DB item remained OPEN at version 0
    let dbItem = await WorkItem.findById(itemId);
    expect(dbItem.status).toBe("OPEN");
    expect(dbItem.version).toBe(0);

    // 2. VALID transition: OPEN -> IN_PROGRESS
    const validStep1 = await request(app)
      .post(`/api/work-items/${itemId}/transition`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        status: "IN_PROGRESS",
        expectedVersion: 0,
      });

    expect(validStep1.status).toBe(200);
    expect(validStep1.body.data.status).toBe("IN_PROGRESS");
    expect(validStep1.body.data.version).toBe(1);

    // 3. VALID transition: IN_PROGRESS -> RESOLVED
    const validStep2 = await request(app)
      .post(`/api/work-items/${itemId}/transition`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        status: "RESOLVED",
        expectedVersion: 1,
      });

    expect(validStep2.status).toBe(200);
    expect(validStep2.body.data.status).toBe("RESOLVED");
    expect(validStep2.body.data.version).toBe(2);

    // 4. VALID transition: RESOLVED -> CLOSED
    const validStep3 = await request(app)
      .post(`/api/work-items/${itemId}/transition`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        status: "CLOSED",
        expectedVersion: 2,
      });

    expect(validStep3.status).toBe(200);
    expect(validStep3.body.data.status).toBe("CLOSED");

    // 5. Attempt transition out of terminal CLOSED state -> must be rejected
    const terminalAttempt = await request(app)
      .post(`/api/work-items/${itemId}/transition`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        status: "IN_PROGRESS",
        expectedVersion: 3,
      });

    expect(terminalAttempt.status).toBe(422);
    expect(terminalAttempt.body.success).toBe(false);
  });
});
