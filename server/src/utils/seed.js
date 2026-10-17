const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("../config/db");
const User = require("../models/User");
const Team = require("../models/Team");
const WorkItem = require("../models/WorkItem");
const Activity = require("../models/Activity");

async function seedDatabase() {
  try {
    console.log("Connecting to database for seeding...");
    await connectDB();

    console.log("Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      WorkItem.deleteMany({}),
      Activity.deleteMany({}),
    ]);

    console.log("Creating demo users...");
    const passwordHash = await bcrypt.hash("Password123!", 12);

    const [admin, sarah, marcus, priya] = await Promise.all([
      User.create({
        name: "Newtonite Admin",
        email: "admin@newtonite.io",
        passwordHash,
        memberships: [],
      }),
      User.create({
        name: "Sarah Chen",
        email: "sarah.chen@newtonite.io",
        passwordHash,
        memberships: [],
      }),
      User.create({
        name: "Marcus Vance",
        email: "marcus.vance@newtonite.io",
        passwordHash,
        memberships: [],
      }),
      User.create({
        name: "Priya Patel",
        email: "priya.patel@newtonite.io",
        passwordHash,
        memberships: [],
      }),
    ]);

    console.log("Creating team workspaces...");
    const platformTeam = await Team.create({
      name: "Platform & Infrastructure Ops",
      description: "Core infrastructure, cloud deployments, and 24/7 reliability response.",
      owner: admin._id,
      createdBy: admin._id,
      members: [
        { user: admin._id, role: "ADMIN" },
        { user: sarah._id, role: "MANAGER" },
        { user: marcus._id, role: "MEMBER" },
      ],
    });

    const paymentsTeam = await Team.create({
      name: "Customer Reliability & Payments",
      description: "Managing checkout flows, settlement disputes, and third-party gateway monitoring.",
      owner: priya._id,
      createdBy: priya._id,
      members: [
        { user: priya._id, role: "ADMIN" },
        { user: admin._id, role: "ADMIN" },
        { user: sarah._id, role: "MEMBER" },
      ],
    });

    // Update user memberships
    await Promise.all([
      User.findByIdAndUpdate(admin._id, {
        $set: {
          memberships: [
            { teamId: platformTeam._id, role: "ADMIN" },
            { teamId: paymentsTeam._id, role: "ADMIN" },
          ],
        },
      }),
      User.findByIdAndUpdate(sarah._id, {
        $set: {
          memberships: [
            { teamId: platformTeam._id, role: "MANAGER" },
            { teamId: paymentsTeam._id, role: "MEMBER" },
          ],
        },
      }),
      User.findByIdAndUpdate(marcus._id, {
        $set: {
          memberships: [{ teamId: platformTeam._id, role: "MEMBER" }],
        },
      }),
      User.findByIdAndUpdate(priya._id, {
        $set: {
          memberships: [{ teamId: paymentsTeam._id, role: "ADMIN" }],
        },
      }),
    ]);

    console.log("Creating realistic work items and audit activity...");

    // Work Item 1: Critical Incident (In Progress)
    const item1 = await WorkItem.create({
      title: "API Gateway 504 gateway timeout under peak traffic",
      description:
        "Traffic spike at 14:00 UTC caused connection pool exhaustion on the upstream ingress controller. Rate-limiter mitigation active.",
      type: "INCIDENT",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      team: platformTeam._id,
      createdBy: admin._id,
      assignee: marcus._id,
      version: 2,
    });

    await Activity.create([
      {
        team: platformTeam._id,
        workItem: item1._id,
        actor: admin._id,
        action: "WORK_ITEM_CREATED",
        changes: [{ field: "status", oldValue: null, newValue: "OPEN" }],
        createdAt: new Date(Date.now() - 3600000 * 3),
      },
      {
        team: platformTeam._id,
        workItem: item1._id,
        actor: marcus._id,
        action: "ASSIGNEE_CHANGED",
        changes: [{ field: "assignee", oldValue: null, newValue: marcus._id.toString() }],
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        team: platformTeam._id,
        workItem: item1._id,
        actor: marcus._id,
        action: "STATUS_CHANGED",
        changes: [{ field: "status", oldValue: "OPEN", newValue: "IN_PROGRESS" }],
        createdAt: new Date(Date.now() - 3600000 * 1),
      },
    ]);

    // Work Item 2: Kafka Consumer Lag (Open)
    const item2 = await WorkItem.create({
      title: "Kafka consumer lag exceeding SLA on payment-events topic",
      description:
        "Consumer group settlement-service is lagging by 45,000 messages. Investigate partition rebalancing or scaling pods.",
      type: "ENGINEERING",
      priority: "HIGH",
      status: "OPEN",
      team: platformTeam._id,
      createdBy: sarah._id,
      assignee: sarah._id,
      version: 1,
    });

    await Activity.create({
      team: platformTeam._id,
      workItem: item2._id,
      actor: sarah._id,
      action: "WORK_ITEM_CREATED",
      changes: [{ field: "status", oldValue: null, newValue: "OPEN" }],
      createdAt: new Date(Date.now() - 3600000 * 5),
    });

    // Work Item 3: TLS Certificate (Resolved)
    const item3 = await WorkItem.create({
      title: "Renew TLS wildcard certificates across ingress controllers",
      description:
        "Wildcard certificate *.newtonite.internal was expiring in 14 days. Successfully rotated via Let's Encrypt and cert-manager.",
      type: "OPERATIONAL",
      priority: "MEDIUM",
      status: "RESOLVED",
      team: platformTeam._id,
      createdBy: admin._id,
      assignee: marcus._id,
      version: 2,
    });

    await Activity.create([
      {
        team: platformTeam._id,
        workItem: item3._id,
        actor: admin._id,
        action: "WORK_ITEM_CREATED",
        changes: [{ field: "status", oldValue: null, newValue: "OPEN" }],
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        team: platformTeam._id,
        workItem: item3._id,
        actor: marcus._id,
        action: "STATUS_CHANGED",
        changes: [{ field: "status", oldValue: "IN_PROGRESS", newValue: "RESOLVED" }],
        createdAt: new Date(Date.now() - 86400000 * 1),
      },
    ]);

    // Work Item 4: Blocked Database Query Optimization
    const item4 = await WorkItem.create({
      title: "Database query slowdown on transactions index",
      description:
        "Execution plan shows full collection scan on settlement_date queries. Blocked waiting for schema migration approval.",
      type: "ENGINEERING",
      priority: "HIGH",
      status: "BLOCKED",
      team: platformTeam._id,
      createdBy: sarah._id,
      assignee: null,
      version: 1,
    });

    await Activity.create([
      {
        team: platformTeam._id,
        workItem: item4._id,
        actor: sarah._id,
        action: "WORK_ITEM_CREATED",
        changes: [{ field: "status", oldValue: null, newValue: "OPEN" }],
        createdAt: new Date(Date.now() - 86400000 * 1),
      },
      {
        team: platformTeam._id,
        workItem: item4._id,
        actor: sarah._id,
        action: "STATUS_CHANGED",
        changes: [{ field: "status", oldValue: "OPEN", newValue: "BLOCKED" }],
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
    ]);

    // Work Item 5: SOC2 Compliance
    await WorkItem.create({
      title: "Quarterly SOC2 access control policy audit",
      description:
        "Review elevated privileges and revoke inactive bastion host session keys as part of quarterly compliance check.",
      type: "COMPLIANCE",
      priority: "LOW",
      status: "OPEN",
      team: platformTeam._id,
      createdBy: admin._id,
      assignee: null,
      version: 0,
    });

    // Work Item 6: Closed item
    const item6 = await WorkItem.create({
      title: "Migrate legacy Redis cache to clustered tier",
      description:
        "Completed zero-downtime migration to AWS ElastiCache cluster. Memory utilization reduced by 35%.",
      type: "ENGINEERING",
      priority: "MEDIUM",
      status: "CLOSED",
      team: platformTeam._id,
      createdBy: sarah._id,
      assignee: sarah._id,
      version: 3,
    });

    await Activity.create({
      team: platformTeam._id,
      workItem: item6._id,
      actor: sarah._id,
      action: "STATUS_CHANGED",
      changes: [{ field: "status", oldValue: "RESOLVED", newValue: "CLOSED" }],
      createdAt: new Date(Date.now() - 86400000 * 3),
    });

    // Work Item for Payments Team
    await WorkItem.create({
      title: "Stripe webhook signature validation failures",
      description:
        "Discovered 14 dropped charge.succeeded events due to stale webhook signing secret rotation.",
      type: "PAYMENT",
      priority: "URGENT",
      status: "IN_PROGRESS",
      team: paymentsTeam._id,
      createdBy: priya._id,
      assignee: priya._id,
      version: 1,
    });

    console.log("Database seeded successfully!");
    console.log("Demo Credentials:");
    console.log("  Admin:    admin@newtonite.io / Password123!");
    console.log("  Engineer: sarah.chen@newtonite.io / Password123!");
    console.log("  DevOps:   marcus.vance@newtonite.io / Password123!");
    console.log("  Support:  priya.patel@newtonite.io / Password123!");

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    await disconnectDB();
    process.exit(1);
  }
}

seedDatabase();
