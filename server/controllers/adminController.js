const Team = require("../models/Team");
const TeamProgress = require("../models/TeamProgress");
const Clue = require("../models/Clue");

// Marks awarded to the first team that reaches a stage (stage 1..10).
const STAGE_BONUS = 20;

// "125000" -> "2m 05s"; null-safe for display everywhere
const formatDuration = (ms) => {
    if (ms === null || ms === undefined) return null;

    const total = Math.round(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;

    if (mins === 0) return `${secs}s`;

    return `${mins}m ${String(secs).padStart(2, "0")}s`;
};


// -----------------------------
// Allocate clue sets
// -----------------------------

const allocateClueSets = async (req, res) => {
    try {
        const teams = await Team.find({})
            .sort({ createdAt: 1 });

        if (teams.length === 0) {
            return res.status(400).json({
                message: "No teams are registered yet"
            });
        }

        const alreadyAllocated = teams.some(
            (team) => team.clueSet !== null
        );

        if (alreadyAllocated) {
            return res.status(400).json({
                message: "Clue sets have already been allocated"
            });
        }

        // Split teams as evenly as possible across the 3 clue sets
        const perSet = Math.ceil(teams.length / 3);

        for (let i = 0; i < teams.length; i++) {
            teams[i].clueSet =
                i < perSet
                    ? "set1"
                    : i < perSet * 2
                        ? "set2"
                        : "set3";

            await teams[i].save();
        }

        res.status(200).json({
            message: "Clue sets allocated successfully",
            totalTeams: teams.length,
            set1Teams: teams.filter((t) => t.clueSet === "set1").length,
            set2Teams: teams.filter((t) => t.clueSet === "set2").length,
            set3Teams: teams.filter((t) => t.clueSet === "set3").length
        });

    } catch (error) {
        console.error("Clue set allocation error:", error);

        res.status(500).json({
            message: "Failed to allocate clue sets",
            error: error.message
        });
    }
};


// -----------------------------
// Reset clue sets
// -----------------------------

const resetClueSets = async (req, res) => {
    try {
        const result = await Team.updateMany(
            {},
            {
                $set: {
                    clueSet: null
                }
            }
        );

        res.status(200).json({
            message: "Clue sets reset successfully",
            teamsReset: result.modifiedCount
        });

    } catch (error) {
        console.error("Reset clue sets error:", error);

        res.status(500).json({
            message: "Failed to reset clue sets",
            error: error.message
        });
    }
};


// -----------------------------
// Get pending submissions
// -----------------------------

const getPendingSubmissions = async (req, res) => {
    try {
        const submissions = await TeamProgress.find({
            status: "pending"
        })
            .populate(
                "team",
                "teamName teamCode driveFolderId"
            )
            .populate(
                "clue",
                "stage title points"
            )
            .sort({
                submittedAt: 1
            });

        /*
         * IMPORTANT:
         *
         * Proofs are now uploaded directly to Google Drive
         * when the participant submits them.
         *
         * Therefore:
         * - Do NOT upload anything here.
         * - Do NOT look for /uploads files.
         * - Admin receives the existing Drive IDs and links.
         */

        res.status(200).json({
            message: "Pending submissions fetched successfully",
            count: submissions.length,
            submissions
        });

    } catch (error) {
        console.error(
            "Get pending submissions error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch pending submissions",
            error: error.message
        });
    }
};


// -----------------------------
// Reject submission
// -----------------------------

const rejectSubmission = async (req, res) => {
    try {
        const { progressId } = req.params;
        const { rejectionReason } = req.body;

        if (
            !rejectionReason ||
            !rejectionReason.trim()
        ) {
            return res.status(400).json({
                message: "Please provide a rejection reason"
            });
        }

        const progress =
            await TeamProgress.findById(progressId);

        if (!progress) {
            return res.status(404).json({
                message: "Submission not found"
            });
        }

        if (progress.status !== "pending") {
            return res.status(400).json({
                message:
                    "Only pending submissions can be rejected"
            });
        }

        /*
         * Rejecting a proof does NOT upload anything
         * to Google Drive.
         *
         * The already uploaded Drive proof remains
         * associated with this submission.
         */

        progress.status = "rejected";
        progress.rejectionReason =
            rejectionReason.trim();

        progress.rejectionCount =
            (progress.rejectionCount || 0) + 1;

        await progress.save();

        // Track total rejections on the team
        await Team.updateOne(
            { _id: progress.team },
            {
                $inc: {
                    rejectionCount: 1
                }
            }
        );

        res.status(200).json({
            message: "Submission rejected successfully",

            progress: {
                stage: progress.stage,
                status: progress.status,
                rejectionReason:
                    progress.rejectionReason,
                submittedAt:
                    progress.submittedAt,

                driveFileIds:
                    progress.driveFileIds || [],

                driveLinks:
                    progress.driveLinks || []
            }
        });

    } catch (error) {
        console.error(
            "Reject submission error:",
            error
        );

        res.status(500).json({
            message: "Failed to reject submission",
            error: error.message
        });
    }
};


// -----------------------------
// Approve submission
// -----------------------------

const approveSubmission = async (req, res) => {
    try {
        const { progressId } = req.params;

        const progress =
            await TeamProgress.findById(progressId)
                .populate("team")
                .populate("clue");

        if (!progress) {
            return res.status(404).json({
                message: "Submission not found"
            });
        }

        if (progress.status !== "pending") {
            return res.status(400).json({
                message:
                    "Only pending submissions can be approved"
            });
        }

        const team = progress.team;
        const clue = progress.clue;

        if (!team) {
            return res.status(400).json({
                message:
                    "Team associated with this submission was not found"
            });
        }

        if (!clue) {
            return res.status(400).json({
                message:
                    "Clue associated with this submission was not found"
            });
        }


        // -----------------------------
        // Get existing Google Drive proof
        // -----------------------------

        /*
         * IMPORTANT:
         *
         * Proofs are uploaded to Google Drive
         * BEFORE admin approval.
         *
         * Therefore approval must NOT:
         *
         * - read files from /uploads
         * - use fs
         * - use local file paths
         * - upload the files again
         */

        let driveFileIds =
            Array.isArray(progress.driveFileIds)
                ? progress.driveFileIds.filter(Boolean)
                : [];

        let driveLinks =
            Array.isArray(progress.driveLinks)
                ? progress.driveLinks
                : [];


        // Support older single-file records
        if (
            driveFileIds.length === 0 &&
            progress.driveFileId
        ) {
            driveFileIds = [
                progress.driveFileId
            ];
        }

        if (
            driveLinks.length === 0 &&
            progress.driveLink
        ) {
            driveLinks = [
                progress.driveLink
            ];
        }


        // -----------------------------
        // Verify proof exists
        // -----------------------------

        if (driveFileIds.length === 0) {
            return res.status(400).json({
                message:
                    "No Google Drive proof was found for this submission. Submission remains pending.",
                driveUploaded: false
            });
        }


        // -----------------------------
        // Approve submission
        // -----------------------------

        const approvalTime = new Date();


        // -----------------------------
        // Per-clue time taken
        // -----------------------------

        const timeTakenMs = progress.unlockedAt
            ? Math.max(
                0,
                approvalTime -
                new Date(progress.unlockedAt)
            )
            : null;


        progress.status = "approved";
        progress.approvedAt = approvalTime;
        progress.score = clue.points;
        progress.timeTakenMs = timeTakenMs;

        // Make sure Drive data is preserved
        progress.driveFileIds = driveFileIds;
        progress.driveLinks = driveLinks;

        // Legacy single-file fields
        progress.driveFileId =
            driveFileIds[0] || null;

        progress.driveLink =
            driveLinks[0] || null;

        await progress.save();


        // -----------------------------
        // Add points to team
        // -----------------------------

        team.score =
            (team.score || 0) +
            clue.points;


        // -----------------------------
        // Final clue?
        // -----------------------------

        let bonusAwarded = 0;

        if (progress.stage === 10) {

            team.status = "completed";
            team.completedAt = approvalTime;

            await team.save();

        } else {

            // -----------------------------
            // Unlock next clue
            // -----------------------------

            const nextStage =
                progress.stage + 1;

            team.currentStage = nextStage;

            await team.save();


            const nextClue =
                await Clue.findOne({
                    stage: nextStage,
                    set: team.clueSet,
                    isActive: true
                });


            if (nextClue) {

                await TeamProgress.create({
                    team: team._id,
                    clue: nextClue._id,
                    stage: nextStage,
                    status: "unlocked",
                    unlockedAt: approvalTime
                });

            }


            // -----------------------------
            // First-to-reach bonus
            // -----------------------------

            /*
             * This team just arrived at nextStage.
             *
             * +20 goes to the first arrival.
             */

            if (
                nextStage >= 1 &&
                nextStage <= 10
            ) {

                const bonusClaimed =
                    await TeamProgress.exists({
                        stage: nextStage,

                        team: {
                            $ne: team._id
                        },

                        bonusAwarded: {
                            $gt: 0
                        }
                    });


                const earlierArrival =
                    await TeamProgress.findOne({
                        stage: nextStage,

                        team: {
                            $ne: team._id
                        },

                        unlockedAt: {
                            $ne: null,
                            $lt: approvalTime
                        }
                    })
                        .sort({
                            unlockedAt: 1
                        })
                        .limit(1);


                const bonusProgress =
                    await TeamProgress.findOne({
                        team: team._id,
                        stage: nextStage
                    });


                if (
                    !bonusClaimed &&
                    !earlierArrival &&
                    bonusProgress &&
                    !bonusProgress.bonusAwarded
                ) {

                    bonusProgress.bonusAwarded =
                        STAGE_BONUS;

                    await bonusProgress.save();


                    team.bonusPoints =
                        (team.bonusPoints || 0) +
                        STAGE_BONUS;

                    team.score += STAGE_BONUS;

                    bonusAwarded =
                        STAGE_BONUS;

                    await team.save();
                }
            }
        }


        // -----------------------------
        // Success response
        // -----------------------------

        return res.status(200).json({

            message:
                bonusAwarded > 0
                    ? `Submission approved — +${STAGE_BONUS} FIRST-TO-REACH bonus for stage ${progress.stage + 1}!`
                    : "Submission approved successfully",

            // Proof was already uploaded during submission
            driveUploaded: true,

            driveFileIds,
            driveLinks,


            team: {
                teamName:
                    team.teamName,

                teamCode:
                    team.teamCode,

                currentStage:
                    team.currentStage,

                score:
                    team.score,

                bonusPoints:
                    team.bonusPoints || 0,

                bonusAwardedThisStage:
                    bonusAwarded,

                status:
                    team.status,

                completedAt:
                    team.completedAt
            },


            progress: {

                stage:
                    progress.stage,

                status:
                    progress.status,

                score:
                    progress.score,

                timeTakenMs:
                    progress.timeTakenMs,

                timeTakenText:
                    formatDuration(
                        progress.timeTakenMs
                    ),

                submittedAt:
                    progress.submittedAt,

                approvedAt:
                    progress.approvedAt,

                driveFileIds:
                    progress.driveFileIds,

                driveLinks:
                    progress.driveLinks
            }

        });

    } catch (error) {

        console.error(
            "Approve submission error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to approve submission",

            error:
                error.message
        });
    }
};


// -----------------------------
// Start team game
// -----------------------------

const startTeamGame = async (req, res) => {
    try {
        const { teamCode } = req.params;

        const team =
            await Team.findOne({
                teamCode
            });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }


        // -----------------------------
        // Allocate clue set if missing
        // -----------------------------

        if (!team.clueSet) {

            // Team registered after bulk allocation.
            // Assign the least-loaded set
            // that actually has clues.

            const counts =
                await Clue.aggregate([
                    {
                        $match: {
                            isActive: true
                        }
                    },
                    {
                        $group: {
                            _id: "$set",
                            total: {
                                $sum: 1
                            }
                        }
                    }
                ]);


            const setMap =
                Object.fromEntries(
                    counts.map((c) => [
                        c._id,
                        c.total
                    ])
                );


            team.clueSet =
                ["set1", "set2", "set3"]
                    .sort(
                        (a, b) =>
                            (setMap[a] || 0) -
                            (setMap[b] || 0)
                    )
                    .find(
                        (s) =>
                            (setMap[s] || 0) > 0
                    ) || "set1";
        }


        // -----------------------------
        // Prevent starting twice
        // -----------------------------

        if (team.startedAt) {
            return res.status(400).json({
                message:
                    "Game has already been started for this team",

                startedAt:
                    team.startedAt
            });
        }


        // -----------------------------
        // Team must be active
        // -----------------------------

        if (team.status !== "active") {
            return res.status(400).json({
                message:
                    `Team is ${team.status} — only active teams can start`
            });
        }


        // -----------------------------
        // Official game start time
        // -----------------------------

        const startTime = new Date();

        team.startedAt = startTime;
        team.currentStage = 0;

        await team.save();


        // -----------------------------
        // Find Clue 0
        // -----------------------------

        const clue =
            await Clue.findOne({
                stage: 0,
                set: team.clueSet,
                isActive: true
            });

        if (!clue) {
            return res.status(404).json({
                message: "Clue 0 not found"
            });
        }


        // -----------------------------
        // Create progress for Clue 0
        // -----------------------------

        const existingProgress =
            await TeamProgress.findOne({
                team: team._id,
                stage: 0
            });


        if (!existingProgress) {

            await TeamProgress.create({
                team: team._id,
                clue: clue._id,
                stage: 0,
                status: "unlocked",
                unlockedAt: startTime
            });

        }


        // -----------------------------
        // Response
        // -----------------------------

        res.status(200).json({

            message:
                "Game started successfully",

            team: {

                teamName:
                    team.teamName,

                teamCode:
                    team.teamCode,

                clueSet:
                    team.clueSet,

                currentStage:
                    team.currentStage,

                score:
                    team.score,

                status:
                    team.status,

                startedAt:
                    team.startedAt
            },

            clue: {

                stage:
                    clue.stage,

                title:
                    clue.title
            }

        });

    } catch (error) {

        console.error(
            "Start game error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to start game",

            error:
                error.message
        });
    }
};


// -----------------------------
// Exports
// -----------------------------

module.exports = {
    allocateClueSets,
    resetClueSets,
    getPendingSubmissions,
    approveSubmission,
    rejectSubmission,
    startTeamGame
};