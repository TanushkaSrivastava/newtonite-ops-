const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    workItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkItem",
      required: true,
      index: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "WORK_ITEM_CREATED",
        "WORK_ITEM_UPDATED",
        "STATUS_CHANGED",
        "PRIORITY_CHANGED",
        "ASSIGNEE_CHANGED",
        "APPROVAL_REQUESTED",
        "APPROVAL_GRANTED",
        "APPROVAL_REJECTED",
        "WORK_ITEM_CLOSED",
        "COMMENT_ADDED",
      ],
      required: true,
    },

    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        oldValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        newValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    requestId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Fetch a work item's activity in descending chronological order
activitySchema.index({ workItem: 1, createdAt: -1 });

// Fetch a team's recent activity in descending order
activitySchema.index({ team: 1, createdAt: -1 });

module.exports = mongoose.models.Activity || mongoose.model("Activity", activitySchema);
