const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
    {
        teamName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        leader: {
            registerNumber: {
                type: String,
                required: true,
                uppercase: true,
                trim: true
            },

            name: {
                type: String,
                required: true,
                trim: true
            },

            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true
            }
        },

        members: [
            {
                registerNumber: {
                    type: String,
                    required: true,
                    uppercase: true,
                    trim: true
                }
            }
        ],

        teamCode: {
            type: String,
            required: true,
            unique: true
        },

        clueSet: {
            type: String,
            enum: ["set1", "set2", "set3"],
            default: null
        },

        currentStage: {
            type: Number,
            default: 0
        },

        score: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["active", "completed", "disqualified", "blocked"],
            default: "active"
        },

        blockedAt: {
            type: Date,
            default: null
        },

        blockReason: {
            type: String,
            default: null
        },

        // Total rejections across all of the team's stages
        rejectionCount: {
            type: Number,
            default: 0,
            min: 0
        },

        // Total first-to-reach bonus marks won (+20 per stage won first)
        bonusPoints: {
            type: Number,
            default: 0,
            min: 0
        },

        startedAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        },

        // Google Drive folder that holds this team's submitted proofs
        driveFolderId: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Team", teamSchema);