const mongoose = require("mongoose");

const clueSchema = new mongoose.Schema(
    {
        stage: {
            type: Number,
            required: true,
            min: 0,
            max: 10
        },

        set: {
            type: String,
            enum: ["set1", "set2", "set3"],
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: null
        },

        type: {
            type: String,
            enum: [
                "game",
                "image",
                "poem",
                "video",
                "document",
                "audio",
                "web",
                "multiple"
            ],
            required: true
        },

        assets: [
            {
                name: {
                    type: String,
                    required: true
                },

                url: {
                    type: String,
                    required: true
                },

                assetType: {
                    type: String,
                    enum: [
                        "image",
                        "video",
                        "audio",
                        "document",
                        "web"
                    ],
                    required: true
                }
            }
        ],

        points: {
            type: Number,
            default: 100,
            min: 0
        },

        // Optional hint shown to players (e.g. stage-7 PDF password hint)
        hintText: {
            type: String,
            default: null
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

clueSchema.index(
    { stage: 1, set: 1 },
    { unique: true }
);

module.exports = mongoose.model("Clue", clueSchema);