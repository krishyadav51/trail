const Participant = require("../models/Participant");

const addParticipants = async (req, res) => {
    try {
        const { registerNumbers } = req.body;

        if (!Array.isArray(registerNumbers) || registerNumbers.length === 0) {
            return res.status(400).json({
                message: "Please provide an array of register numbers"
            });
        }

        const normalizedNumbers = registerNumbers.map((number) =>
            number.trim().toUpperCase()
        );

        const uniqueNumbers = [...new Set(normalizedNumbers)];

        const participants = uniqueNumbers.map((registerNumber) => ({
            registerNumber
        }));

        const result = await Participant.insertMany(participants, {
            ordered: false
        });

        res.status(201).json({
            message: "Participants added successfully",
            count: result.length
        });

    } catch (error) {
        console.error("Add participants error:", error);

        res.status(500).json({
            message: "Failed to add participants",
            error: error.message
        });
    }
};

module.exports = {
    addParticipants
};