const mongoose = require("mongoose");

const teamProgressSchema = new mongoose.Schema(
    {
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
            required: true
        },

        clue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Clue",
            required: true
        },

        stage: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: ["locked", "unlocked", "pending", "approved", "rejected"],
            default: "locked"
        },

        // 1–2 proof images (paths like "/uploads/<file>")
        proof: {
            type: [String],
            default: []
        },

        unlockedAt: {
            type: Date,
            default: null
        },

        submittedAt: {
            type: Date,
            default: null
        },

        approvedAt: {
            type: Date,
            default: null
        },

        rejectionReason: {
            type: String,
            default: null
        },

        // How many times the admins rejected this stage's proof
        rejectionCount: {
            type: Number,
            default: 0,
            min: 0
        },

        score: {
            type: Number,
            default: 0
        },

        // Admin-only metric: ms between unlock and approval
        timeTakenMs: {
            type: Number,
            default: null
        },

        // First-to-reach bonus awarded on this stage (+20)
        bonusAwarded: {
            type: Number,
            default: 0
        },

        // Google Drive copy of each proof file (index-matched to `proof`)
        driveFileIds: {
            type: [String],
            default: []
        },

        driveLinks: {
            type: [String],
            default: []
        },

        // Legacy single-file fields (kept in sync for old clients)
        driveFileId: {
            type: String,
            default: null
        },

        driveLink: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

teamProgressSchema.index(
    { team: 1, stage: 1 },
    { unique: true }
);

module.exports = mongoose.model("TeamProgress", teamProgressSchema);