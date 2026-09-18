const Team = require("../models/Team");
const Participant = require("../models/Participant");
const { ensureTeamFolder } = require("../services/driveService");

// -----------------------------
// Generate unique team code
// -----------------------------

const generateTeamCode = () => {
    const random = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    return `TOS-${random}`;
};

// -----------------------------
// Register team
// -----------------------------

const registerTeam = async (req, res) => {
    try {
        const {
            teamName,
            leader,
            members
        } = req.body;

        if (
            !teamName ||
            !leader ||
            !leader.registerNumber ||
            !leader.name ||
            !leader.email ||
            !Array.isArray(members)
        ) {
            return res.status(400).json({
                message: "Please provide complete team registration details"
            });
        }

        const leaderRegisterNumber =
            leader.registerNumber.trim().toUpperCase();

        const memberRegisterNumbers = members.map((member) =>
            member.registerNumber.trim().toUpperCase()
        );

        const allRegisterNumbers = [
            leaderRegisterNumber,
            ...memberRegisterNumbers
        ];

        // Check duplicate register numbers within the same team
        const uniqueRegisterNumbers = [
            ...new Set(allRegisterNumbers)
        ];

        if (
            uniqueRegisterNumbers.length !==
            allRegisterNumbers.length
        ) {
            return res.status(400).json({
                message:
                    "A register number cannot appear more than once in a team"
            });
        }

        // Check official participant list
        const validParticipants = await Participant.find({
            registerNumber: {
                $in: allRegisterNumbers
            }
        });

        if (
            validParticipants.length !==
            allRegisterNumbers.length
        ) {
            const validNumbers = validParticipants.map(
                (participant) =>
                    participant.registerNumber
            );

            const invalidNumbers =
                allRegisterNumbers.filter(
                    (number) =>
                        !validNumbers.includes(number)
                );

            return res.status(400).json({
                message:
                    "Some register numbers are not in the official participant list",
                invalidRegisterNumbers: invalidNumbers
            });
        }

        // Check whether any participant is already in another team
        const existingTeam = await Team.findOne({
            $or: [
                {
                    "leader.registerNumber": {
                        $in: allRegisterNumbers
                    }
                },
                {
                    "members.registerNumber": {
                        $in: allRegisterNumbers
                    }
                }
            ]
        });

        if (existingTeam) {
            return res.status(409).json({
                message:
                    "One or more register numbers are already part of another team",
                teamName: existingTeam.teamName
            });
        }

        // Check team name uniqueness
        const existingTeamName = await Team.findOne({
            teamName: teamName.trim()
        });

        if (existingTeamName) {
            return res.status(409).json({
                message: "Team name already exists"
            });
        }

        // Generate unique team code
        let teamCode;
        let teamCodeExists = true;

        while (teamCodeExists) {
            teamCode = generateTeamCode();

            const existingCode = await Team.findOne({
                teamCode
            });

            teamCodeExists = !!existingCode;
        }

        // Create team
        const team = await Team.create({
            teamName: teamName.trim(),

            leader: {
                registerNumber: leaderRegisterNumber,
                name: leader.name.trim(),
                email: leader.email.trim().toLowerCase()
            },

            members: memberRegisterNumbers.map(
                (registerNumber) => ({
                    registerNumber
                })
            ),

            teamCode,

            clueSet: null,

            currentStage: 0,

            score: 0,

            status: "active",

            startedAt: null,

            completedAt: null
        });

        // Google Drive: create this team's proof folder inside the shared
        // event folder. Non-blocking for registration — if Drive is not
        // configured or fails, it is retried automatically on first upload.
        let driveFolderCreated = false;

        try {
            driveFolderCreated = !!(await ensureTeamFolder(team));
        } catch (driveError) {
            console.error(
                "Drive folder creation failed during registration:",
                driveError.message
            );
        }

        res.status(201).json({
            message: "Team registered successfully",

            team: {
                teamName: team.teamName,
                teamCode: team.teamCode,
                currentStage: team.currentStage,
                score: team.score,
                status: team.status
            },

            driveFolderCreated
        });

    } catch (error) {
        console.error(
            "Team registration error:",
            error
        );

        res.status(500).json({
            message: "Failed to register team",
            error: error.message
        });
    }
};

// -----------------------------
// Get leaderboard
// -----------------------------

const getLeaderboard = async (req, res) => {
    try {
        const teams = await Team.find({
            status: {
                $ne: "disqualified"
            }
        })
            .select(
                "teamName teamCode score currentStage status startedAt completedAt bonusPoints"
            )
            .sort({
                score: -1,
                completedAt: 1,
                createdAt: 1
            });

        const leaderboard = teams.map(
            (team, index) => ({
                rank: index + 1,
                teamName: team.teamName,
                teamCode: team.teamCode,
                score: team.score,
                bonusPoints: team.bonusPoints || 0,
                currentStage: team.currentStage,
                status: team.status,
                startedAt: team.startedAt,
                completedAt: team.completedAt
            })
        );

        res.status(200).json({
            message: "Leaderboard fetched successfully",
            leaderboard
        });

    } catch (error) {
        console.error(
            "Get leaderboard error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch leaderboard",
            error: error.message
        });
    }
};

module.exports = {
    registerTeam,
    getLeaderboard
};
