const { z } = require("zod");

const createTeamSchema = z.object({
  name: z
    .string({ required_error: "Team name is required" })
    .trim()
    .min(2, "Team name must be at least 2 characters")
    .max(100, "Team name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .default(""),
});

const addMemberSchema = z.object({
  userId: z
    .string({ required_error: "User ID is required" })
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
});

module.exports = {
  createTeamSchema,
  addMemberSchema,
};
