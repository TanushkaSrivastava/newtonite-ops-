import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { setupTestDB, clearTestDB, teardownTestDB } from "./setup";

describe("Work Item CRUD, Pagination, Search & Audit Activity", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  async function registerAndCreateTeam() {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Dev Lead",
        email: "lead@newtonite.io",
        password: "Password123!",
      });

    const token = regRes.body.data.token;
    const user = regRes.body.data.user;

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Platform Core",
        description: "Core infrastructure engineering",
      });

    const team = teamRes.body.data;
    return { token, user, teamId: team.id || team._id };
  }

  it("should create, retrieve, and partially update a work item", async () => {
    const { token, teamId } = await registerAndCreateTeam();

    // 1. Create item
    const createRes = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Database latency investigation",
        description: "Diagnose 99th percentile query slowdowns",
        team: teamId,
        type: "ENGINEERING",
        priority: "HIGH",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const item = createRes.body.data;
    expect(item.status).toBe("OPEN");
    expect(item.version).toBe(0);

    const itemId = item.id || item._id;

    // 2. Retrieve by ID
    const getRes = await request(app)
      .get(`/api/work-items/${itemId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.title).toBe("Database latency investigation");

    // 3. Partial update with allowlist
    const patchRes = await request(app)
      .patch(`/api/work-items/${itemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Database latency investigation (resolved in staging)",
        priority: "CRITICAL",
        version: item.version,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.priority).toBe("CRITICAL");
    expect(patchRes.body.data.version).toBe(1);

    // 4. Verify audit activity was logged
    const activityRes = await request(app)
      .get(`/api/work-items/${itemId}/activity`)
      .set("Authorization", `Bearer ${token}`);

    expect(activityRes.status).toBe(200);
    expect(activityRes.body.data.length).toBeGreaterThanOrEqual(2);
    expect(activityRes.body.data[0].action).toBe("WORK_ITEM_UPDATED");
    expect(activityRes.body.data[1].action).toBe("WORK_ITEM_CREATED");
  });

  it("should support server-side pagination, sorting, and search filtering", async () => {
    const { token, teamId } = await registerAndCreateTeam();

    // Create 5 work items
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post("/api/work-items")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: `Task item ${i} - ${i % 2 === 0 ? "Urgent payment issue" : "Routine maintenance"}`,
          description: `Detailed description for task number ${i}`,
          team: teamId,
          priority: i % 2 === 0 ? "URGENT" : "LOW",
        });
    }

    // Paginated request: limit 2, page 1
    const p1Res = await request(app)
      .get(`/api/work-items?team=${teamId}&limit=2&page=1`)
      .set("Authorization", `Bearer ${token}`);

    expect(p1Res.status).toBe(200);
    expect(p1Res.body.data.length).toBe(2);
    expect(p1Res.body.pagination.total).toBe(5);
    expect(p1Res.body.pagination.totalPages).toBe(3);

    // Search query for "payment"
    const searchRes = await request(app)
      .get(`/api/work-items?team=${teamId}&search=payment`)
      .set("Authorization", `Bearer ${token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(2);
    expect(searchRes.body.data.every((i) => i.title.includes("payment"))).toBe(true);
  });

  it("should handle idempotent requests safely using Idempotency-Key", async () => {
    const { token, teamId } = await registerAndCreateTeam();
    const idempotencyKey = "unique-txn-key-999";

    // 1st request
    const res1 = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        title: "Compliance report generation",
        description: "Annual security policy review",
        team: teamId,
      });

    expect(res1.status).toBe(201);
    expect(res1.body.isDuplicate).toBe(false);
    const firstItemId = res1.body.data.id || res1.body.data._id;

    // 2nd request with exact same idempotency key
    const res2 = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        title: "Compliance report generation",
        description: "Annual security policy review",
        team: teamId,
      });

    expect(res2.status).toBe(200);
    expect(res2.body.isDuplicate).toBe(true);
    const secondItemId = res2.body.data.id || res2.body.data._id;
    expect(secondItemId).toBe(firstItemId);
  });
});
