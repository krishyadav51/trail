const Team = require("../models/Team");
const TeamProgress = require("../models/TeamProgress");

// -----------------------------
// List every registered team (admin view — includes blocked/disqualified)
// -----------------------------

const getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find({})
            .select(
                "teamName teamCode leader members clueSet currentStage score status startedAt completedAt blockedAt blockReason rejectionCount bonusPoints driveFolderId createdAt"
            )
            .sort({ createdAt: 1 });

        res.status(200).json({
            message: "Teams fetched successfully",
            count: teams.length,
            teams
        });

    } catch (error) {
        console.error("Get all teams error:", error);

        res.status(500).json({
            message: "Failed to fetch teams",
            error: error.message
        });
    }
};

// -----------------------------
// Block a team
// -----------------------------

const blockTeam = async (req, res) => {
    try {
        const { teamCode } = req.params;
        const { reason } = req.body;

        const team = await Team.findOne({ teamCode });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (team.status === "blocked") {
            return res.status(400).json({
                message: "Team is already blocked"
            });
        }

        team.status = "blocked";
        team.blockedAt = new Date();
        team.blockReason = reason?.trim() || "Blocked by admin";

        await team.save();

        res.status(200).json({
            message: `Team ${team.teamName} has been blocked`,
            team: {
                teamName: team.teamName,
                teamCode: team.teamCode,
                status: team.status,
                blockReason: team.blockReason
            }
        });

    } catch (error) {
        console.error("Block team error:", error);

        res.status(500).json({
            message: "Failed to block team",
            error: error.message
        });
    }
};

// -----------------------------
// Unblock a team
// -----------------------------

const unblockTeam = async (req, res) => {
    try {
        const { teamCode } = req.params;

        const team = await Team.findOne({ teamCode });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (team.status !== "blocked") {
            return res.status(400).json({
                message: "Team is not blocked"
            });
        }

        team.status = "active";
        team.blockedAt = null;
        team.blockReason = null;

        await team.save();

        res.status(200).json({
            message: `Team ${team.teamName} has been unblocked`,
            team: {
                teamName: team.teamName,
                teamCode: team.teamCode,
                status: team.status
            }
        });

    } catch (error) {
        console.error("Unblock team error:", error);

        res.status(500).json({
            message: "Failed to unblock team",
            error: error.message
        });
    }
};

// -----------------------------
// Disqualify a team (stricter than block — hidden from leaderboard)
// -----------------------------

const disqualifyTeam = async (req, res) => {
    try {
        const { teamCode } = req.params;
        const { reason } = req.body;

        const team = await Team.findOne({ teamCode });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (team.status === "disqualified") {
            return res.status(400).json({
                message: "Team is already disqualified"
            });
        }

        team.status = "disqualified";
        team.blockedAt = new Date();
        team.blockReason = reason?.trim() || "Disqualified by admin";

        await team.save();

        res.status(200).json({
            message: `Team ${team.teamName} has been disqualified`,
            team: {
                teamName: team.teamName,
                teamCode: team.teamCode,
                status: team.status
            }
        });

    } catch (error) {
        console.error("Disqualify team error:", error);

        res.status(500).json({
            message: "Failed to disqualify team",
            error: error.message
        });
    }
};

// -----------------------------
// Delete a team and all its progress/proofs
// -----------------------------

const deleteTeam = async (req, res) => {
    try {
        const { teamCode } = req.params;

        const team = await Team.findOne({ teamCode });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        const deletedProgress = await TeamProgress.deleteMany({
            team: team._id
        });

        await team.deleteOne();

        res.status(200).json({
            message: `Team ${team.teamName} deleted successfully`,
            deleted: {
                teamCode: team.teamCode,
                progressRecords: deletedProgress.deletedCount
            }
        });

    } catch (error) {
        console.error("Delete team error:", error);

        res.status(500).json({
            message: "Failed to delete team",
            error: error.message
        });
    }
};

// -----------------------------
// Reset a team's game (score, stage, progress) — for retries/testing
// -----------------------------

const resetTeamProgress = async (req, res) => {
    try {
        const { teamCode } = req.params;

        const team = await Team.findOne({ teamCode });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        await TeamProgress.deleteMany({ team: team._id });

        team.currentStage = 0;
        team.score = 0;
        team.bonusPoints = 0;
        team.status = "active";
        team.startedAt = null;
        team.completedAt = null;
        team.blockedAt = null;
        team.blockReason = null;

        await team.save();

        res.status(200).json({
            message: `Game reset for team ${team.teamName}`,
            team: {
                teamName: team.teamName,
                teamCode: team.teamCode,
                currentStage: team.currentStage,
                score: team.score,
                status: team.status
            }
        });

    } catch (error) {
        console.error("Reset team error:", error);

        res.status(500).json({
            message: "Failed to reset team",
            error: error.message
        });
    }
};

module.exports = {
    getAllTeams,
    blockTeam,
    unblockTeam,
    disqualifyTeam,
    deleteTeam,
    resetTeamProgress
};
