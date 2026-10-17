const { z } = require("zod");

const WORK_ITEM_TYPES = [
  "CUSTOMER_ISSUE",
  "ENGINEERING",
  "PAYMENT",
  "INCIDENT",
  "COMPLIANCE",
  "OPERATIONS",
  "OPERATIONAL",
  "OTHER",
];

const WORK_ITEM_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "PENDING_APPROVAL",
  "RESOLVED",
  "CLOSED",
];

const WORK_ITEM_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "URGENT"];

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createWorkItemSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string({ required_error: "Description is required" })
    .trim()
    .max(5000, "Description cannot exceed 5000 characters"),
  team: z
    .string()
    .regex(objectIdRegex, "Invalid team ID format")
    .optional(),
  teamId: z
    .string()
    .regex(objectIdRegex, "Invalid team ID format")
    .optional(),
  type: z.enum(WORK_ITEM_TYPES).optional().default("OPERATIONAL"),
  category: z.enum(WORK_ITEM_TYPES).optional(),
  priority: z.enum(WORK_ITEM_PRIORITIES).optional().default("MEDIUM"),
  assignee: z
    .string()
    .regex(objectIdRegex, "Invalid assignee ID format")
    .nullable()
    .optional(),
  assigneeId: z
    .string()
    .regex(objectIdRegex, "Invalid assignee ID format")
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().optional()),
}).refine((data) => data.team || data.teamId, {
  message: "Team ID is required",
  path: ["team"],
});

const updateWorkItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional(),
  type: z.enum(WORK_ITEM_TYPES).optional(),
  category: z.enum(WORK_ITEM_TYPES).optional(),
  priority: z.enum(WORK_ITEM_PRIORITIES).optional(),
  dueDate: z.string().nullable().optional(),
  version: z
    .number({ required_error: "Current version is required for safe concurrent updates" })
    .int("Version must be an integer")
    .min(0, "Version must be non-negative"),
});

const assignWorkItemSchema = z.object({
  assignee: z
    .string()
    .regex(objectIdRegex, "Invalid assignee ID format")
    .nullable()
    .optional(),
  assigneeId: z
    .string()
    .regex(objectIdRegex, "Invalid assignee ID format")
    .nullable()
    .optional(),
  expectedVersion: z
    .number({ required_error: "Expected version is required for safe concurrent assignment" })
    .int()
    .min(0),
});

const transitionWorkItemSchema = z.object({
  status: z.enum(WORK_ITEM_STATUSES, {
    required_error: "Target status is required",
  }),
  expectedVersion: z
    .number({ required_error: "Expected version is required for safe concurrent state transitions" })
    .int()
    .min(0),
});

const addCommentSchema = z.object({
  comment: z
    .string({ required_error: "Comment is required" })
    .trim()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment cannot exceed 2000 characters"),
});

module.exports = {
  createWorkItemSchema,
  updateWorkItemSchema,
  assignWorkItemSchema,
  transitionWorkItemSchema,
  addCommentSchema,
  WORK_ITEM_TYPES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_PRIORITIES,
};
