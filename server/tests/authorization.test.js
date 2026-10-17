import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { setupTestDB, clearTestDB, teardownTestDB } from "./setup";

describe("Authorization and Multi-Tenant Team Isolation", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  async function registerUser(name, email, password = "Password123!") {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name, email, password });
    return { token: res.body.data.token, user: res.body.data.user };
  }

  it("should prevent User B from accessing or reading User A's team work items", async () => {
    // 1. User A creates team A and item A
    const userA = await registerUser("User Alpha", "alpha@newtonite.io");
    const teamARes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ name: "Team Alpha", description: "Alpha Operations" });

    const teamAId = teamARes.body.data.id || teamARes.body.data._id;

    const itemRes = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        title: "Confidential Alpha Task",
        description: "Restricted alpha operations information",
        team: teamAId,
        priority: "HIGH",
      });

    const itemId = itemRes.body.data.id || itemRes.body.data._id;

    // 2. User B creates their own team B
    const userB = await registerUser("User Beta", "beta@newtonite.io");

    // 3. User B attempts to access item A directly by ID -> must be rejected with 403 Forbidden
    const getRes = await request(app)
      .get(`/api/work-items/${itemId}`)
      .set("Authorization", `Bearer ${userB.token}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.success).toBe(false);
    expect(getRes.body.error.code).toBe("FORBIDDEN");

    // 4. User B attempts to query work items for Team A -> must be rejected with 403 Forbidden
    const listRes = await request(app)
      .get(`/api/work-items?team=${teamAId}`)
      .set("Authorization", `Bearer ${userB.token}`);

    expect(listRes.status).toBe(403);
    expect(listRes.body.success).toBe(false);

    // 5. User B attempts to mutate item A -> must be rejected with 403 Forbidden
    const patchRes = await request(app)
      .patch(`/api/work-items/${itemId}`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({
        title: "Tampered by Beta",
        version: 0,
      });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.success).toBe(false);
  });

  it("should reject assigning a work item to a user who is not a member of the team", async () => {
    const userA = await registerUser("Owner Alpha", "owner@newtonite.io");
    const outsider = await registerUser("Outsider Zack", "zack@other.io");

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ name: "Exclusive Team" });

    const teamId = teamRes.body.data.id || teamRes.body.data._id;

    const itemRes = await request(app)
      .post("/api/work-items")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({
        title: "Internal Infrastructure Bug",
        description: "Must be assigned only to authorized team member",
        team: teamId,
        assignee: outsider.user.id,
      });

    expect(itemRes.status).toBe(400);
    expect(itemRes.body.success).toBe(false);
    expect(itemRes.body.error.code).toBe("INVALID_ASSIGNEE");
  });

  it("should only allow team ADMIN to add new members to the team", async () => {
    const admin = await registerUser("Team Admin", "admin@newtonite.io");
    const regularMember = await registerUser("Normal Member", "member@newtonite.io");
    const recruit = await registerUser("Recruit John", "john@newtonite.io");

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Dev Team" });

    const teamId = teamRes.body.data.id || teamRes.body.data._id;

    // Admin adds regular member
    await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: regularMember.user.id, role: "MEMBER" });

    // Regular member attempts to add another member -> should be forbidden (403)
    const unauthorizedAdd = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${regularMember.token}`)
      .send({ userId: recruit.user.id, role: "MEMBER" });

    expect(unauthorizedAdd.status).toBe(403);
    expect(unauthorizedAdd.body.success).toBe(false);
  });
});
