const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
    {
        registerNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Participant", participantSchema);