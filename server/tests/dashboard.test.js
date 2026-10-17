import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { setupTestDB, clearTestDB, teardownTestDB } from "./setup";

describe("Dashboard Summary & Aggregation Pipeline", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it("should return correct aggregated metrics and recently updated items", async () => {
    // 1. Register and create team
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Dash Lead",
        email: "dash@newtonite.io",
        password: "Password123!",
      });

    const token = regRes.body.data.token;
    const user = regRes.body.data.user;

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Analytics Crew" });

    const teamId = teamRes.body.data.id || teamRes.body.data._id;

    // 2. Create 3 work items with different statuses
    const item1 = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Task One",
        description: "Open item assigned to dash lead",
        team: teamId,
        priority: "CRITICAL",
        assignee: user.id,
      });

    const item2 = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Task Two",
        description: "In progress item",
        team: teamId,
        priority: "LOW",
      });

    const item2Id = item2.body.data.id || item2.body.data._id;
    await request(app)
      .post(`/api/work-items/${item2Id}/transition`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "IN_PROGRESS",
        expectedVersion: 0,
      });

    // 3. Query Dashboard Summary
    const dashRes = await request(app)
      .get(`/api/dashboard/summary?team=${teamId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    const { metrics, recentlyUpdated, team } = dashRes.body.data;

    expect(team.name).toBe("Analytics Crew");
    expect(metrics.total).toBe(2);
    expect(metrics.open).toBe(1);
    expect(metrics.inProgress).toBe(1);
    expect(metrics.criticalOrUrgent).toBe(1);
    expect(metrics.assignedToMe).toBe(1);
    expect(recentlyUpdated.length).toBe(2);
  });
});
