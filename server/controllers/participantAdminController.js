const Participant = require("../models/Participant");
const Team = require("../models/Team");

// -----------------------------
// List all participants + whether each is already in a team
// -----------------------------

const getParticipants = async (req, res) => {
    try {
        const participants = await Participant.find({})
            .sort({ createdAt: 1 });

        const teams = await Team.find({}).select("leader members");

        const usedNumbers = new Set(
            teams.flatMap((team) => [
                team.leader?.registerNumber,
                ...(team.members || []).map((m) => m.registerNumber)
            ]).filter(Boolean)
        );

        const enriched = participants.map((p) => ({
            _id: p._id,
            registerNumber: p.registerNumber,
            inTeam: usedNumbers.has(p.registerNumber),
            createdAt: p.createdAt
        }));

        res.status(200).json({
            message: "Participants fetched successfully",
            count: enriched.length,
            participants: enriched
        });

    } catch (error) {
        console.error("Get participants error:", error);

        res.status(500).json({
            message: "Failed to fetch participants",
            error: error.message
        });
    }
};

// -----------------------------
// Add participants (admin, same as public add endpoint but reports duplicates)
// -----------------------------

const addParticipantsAdmin = async (req, res) => {
    try {
        const { registerNumbers } = req.body;

        if (!Array.isArray(registerNumbers) || registerNumbers.length === 0) {
            return res.status(400).json({
                message: "Please provide an array of register numbers"
            });
        }

        const normalized = [
            ...new Set(
                registerNumbers.map((n) => String(n).trim().toUpperCase())
            )
        ];

        const existing = await Participant.find({
            registerNumber: { $in: normalized }
        }).select("registerNumber");

        const existingSet = new Set(existing.map((p) => p.registerNumber));
        const fresh = normalized.filter((n) => !existingSet.has(n));

        if (fresh.length > 0) {
            await Participant.insertMany(
                fresh.map((registerNumber) => ({ registerNumber }))
            );
        }

        res.status(201).json({
            message: `${fresh.length} participants added, ${existingSet.size} already existed`,
            added: fresh.length,
            skipped: existingSet.size,
            skippedNumbers: [...existingSet]
        });

    } catch (error) {
        console.error("Add participants (admin) error:", error);

        res.status(500).json({
            message: "Failed to add participants",
            error: error.message
        });
    }
};

// -----------------------------
// Delete a participant
// -----------------------------

const deleteParticipant = async (req, res) => {
    try {
        const { registerNumber } = req.params;

        const participant = await Participant.findOne({
            registerNumber: registerNumber.toUpperCase()
        });

        if (!participant) {
            return res.status(404).json({
                message: "Participant not found"
            });
        }

        const team = await Team.findOne({
            $or: [
                { "leader.registerNumber": participant.registerNumber },
                { "members.registerNumber": participant.registerNumber }
            ]
        });

        if (team) {
            return res.status(409).json({
                message: `Cannot delete — this participant is part of team "${team.teamName}". Remove them from the team first.`,
                teamName: team.teamName
            });
        }

        await participant.deleteOne();

        res.status(200).json({
            message: `Participant ${participant.registerNumber} deleted successfully`
        });

    } catch (error) {
        console.error("Delete participant error:", error);

        res.status(500).json({
            message: "Failed to delete participant",
            error: error.message
        });
    }
};

module.exports = {
    getParticipants,
    addParticipantsAdmin,
    deleteParticipant
};
