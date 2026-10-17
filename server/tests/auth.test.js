import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { setupTestDB, clearTestDB, teardownTestDB } from "./setup";

describe("Authentication & Authorization API", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it("should successfully register a new user and return JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice Engineer",
        email: "alice@newtonite.io",
        password: "Password123!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe("alice@newtonite.io");
    expect(res.body.data.user.name).toBe("Alice Engineer");
  });

  it("should reject registration with duplicate email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice Original",
        email: "alice@newtonite.io",
        password: "Password123!",
      });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice Clone",
        email: "alice@newtonite.io",
        password: "Password123!",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_EXISTS");
  });

  it("should reject registration with short password (< 8 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Bob Short",
        email: "bob@newtonite.io",
        password: "short",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should successfully log in with valid credentials", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Carol Lead",
        email: "carol@newtonite.io",
        password: "Password123!",
      });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "carol@newtonite.io",
        password: "Password123!",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it("should reject login with invalid password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Dave Security",
        email: "dave@newtonite.io",
        password: "Password123!",
      });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "dave@newtonite.io",
        password: "WrongPassword999",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should return current user profile on GET /api/auth/me", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Eve Admin",
        email: "eve@newtonite.io",
        password: "Password123!",
      });

    const token = regRes.body.data.token;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe("eve@newtonite.io");
  });

  it("should reject unauthenticated request on GET /api/auth/me", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
