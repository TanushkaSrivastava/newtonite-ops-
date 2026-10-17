const mongoose = require("mongoose");

const workItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    type: {
      type: String,
      enum: [
        "CUSTOMER_ISSUE",
        "ENGINEERING",
        "PAYMENT",
        "INCIDENT",
        "COMPLIANCE",
        "OPERATIONS",
        "OPERATIONAL",
        "OTHER",
      ],
      default: "OPERATIONAL",
    },

    status: {
      type: String,
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "BLOCKED",
        "PENDING_APPROVAL",
        "RESOLVED",
        "CLOSED",
      ],
      default: "OPEN",
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", "URGENT"],
      default: "MEDIUM",
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team is required"],
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    approval: {
      required: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"],
        default: "NOT_REQUIRED",
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvedAt: {
        type: Date,
        default: null,
      },
    },

    version: {
      type: Number,
      default: 0,
      min: 0,
    },

    idempotencyKey: {
      type: String,
      default: undefined,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        ret.teamId = ret.team;
        ret.assigneeId = ret.assignee;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for optimal dashboard queries, filtering, and sorting
workItemSchema.index({ team: 1, status: 1, updatedAt: -1 });
workItemSchema.index({ team: 1, priority: 1, createdAt: -1 });
workItemSchema.index({ team: 1, assignee: 1, status: 1 });
workItemSchema.index({ assignee: 1, status: 1, updatedAt: -1 });

// Prevent duplicate work items created with the same idempotency key in a team
workItemSchema.index(
  { team: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  }
);

// Text search index for title and description
workItemSchema.index({ title: "text", description: "text" });

module.exports = mongoose.models.WorkItem || mongoose.model("WorkItem", workItemSchema);
