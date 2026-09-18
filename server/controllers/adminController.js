const Team = require("../models/Team");
const TeamProgress = require("../models/TeamProgress");
const Clue = require("../models/Clue");
const path = require("path");

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

const {
    uploadProofToDrive,
    isConfigured: driveConfigured
} = require("../services/driveService");


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
            .populate("team", "teamName teamCode driveFolderId")
            .populate("clue", "stage title points")
            .sort({ submittedAt: 1 });

        /*
         * IMPORTANT:
         *
         * Do NOT upload pending proofs to Google Drive here.
         *
         * Admin should only see the locally stored proof.
         * Google Drive upload happens ONLY after approval.
         */

        res.status(200).json({
            message: "Pending submissions fetched successfully",
            count: submissions.length,
            driveConfigured: driveConfigured(),
            submissions
        });

    } catch (error) {
        console.error("Get pending submissions error:", error);

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

        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({
                message: "Please provide a rejection reason"
            });
        }

        const progress = await TeamProgress.findById(progressId);

        if (!progress) {
            return res.status(404).json({
                message: "Submission not found"
            });
        }

        if (progress.status !== "pending") {
            return res.status(400).json({
                message: "Only pending submissions can be rejected"
            });
        }

        /*
         * IMPORTANT:
         *
         * Rejecting a proof does NOT upload anything
         * to Google Drive.
         */

        progress.status = "rejected";
        progress.rejectionReason = rejectionReason.trim();
        progress.rejectionCount = (progress.rejectionCount || 0) + 1;

        await progress.save();

        // Track total rejections on the team for the admin panel
        await Team.updateOne(
            { _id: progress.team },
            { $inc: { rejectionCount: 1 } }
        );

        res.status(200).json({
            message: "Submission rejected successfully",

            progress: {
                stage: progress.stage,
                status: progress.status,
                rejectionReason: progress.rejectionReason,
                submittedAt: progress.submittedAt
            }
        });

    } catch (error) {
        console.error("Reject submission error:", error);

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

        const progress = await TeamProgress.findById(progressId)
            .populate("team")
            .populate("clue");

        if (!progress) {
            return res.status(404).json({
                message: "Submission not found"
            });
        }

        if (progress.status !== "pending") {
            return res.status(400).json({
                message: "Only pending submissions can be approved"
            });
        }

        const team = progress.team;
        const clue = progress.clue;

        if (!team) {
            return res.status(400).json({
                message: "Team associated with this submission was not found"
            });
        }

        if (!clue) {
            return res.status(400).json({
                message: "Clue associated with this submission was not found"
            });
        }


        // -----------------------------
        // Google Drive validation
        // -----------------------------

        if (!driveConfigured()) {
            return res.status(500).json({
                message:
                    "Google Drive is not configured. Submission remains pending."
            });
        }


        // -----------------------------
        // Get submitted proof files
        // -----------------------------

        /*
         * TeamProgress.proof is:
         *
         * [
         *     "/uploads/file1.png",
         *     "/uploads/file2.png"
         * ]
         */

        const proofFiles = Array.isArray(progress.proof)
            ? progress.proof
            : [];

        if (proofFiles.length === 0) {
            return res.status(400).json({
                message:
                    "No proof images were found for this submission. Submission remains pending."
            });
        }


        // -----------------------------
        // Upload proofs to Google Drive
        // ONLY AFTER ADMIN APPROVAL
        // -----------------------------

        const driveFileIds = [];
        const driveLinks = [];

        try {

            for (let i = 0; i < proofFiles.length; i++) {

                const storedPath = proofFiles[i];

                if (
                    !storedPath ||
                    typeof storedPath !== "string"
                ) {
                    throw new Error(
                        `Proof ${i + 1} does not contain a valid file path`
                    );
                }


                // -----------------------------
                // Convert URL path to local path
                // -----------------------------

                let filePath = storedPath;

                if (filePath.startsWith("/uploads/")) {
                    filePath = path.join(
                        process.cwd(),
                        filePath.replace(/^\/+/, "")
                    );
                }


                // -----------------------------
                // Determine MIME type
                // -----------------------------

                let mimetype = "image/jpeg";

                const extension = path
                    .extname(filePath)
                    .toLowerCase();

                if (extension === ".png") {
                    mimetype = "image/png";
                } else if (
                    extension === ".jpg" ||
                    extension === ".jpeg"
                ) {
                    mimetype = "image/jpeg";
                } else if (extension === ".webp") {
                    mimetype = "image/webp";
                }


                // -----------------------------
                // Upload to Google Drive
                // -----------------------------

                const uploaded = await uploadProofToDrive({
                    team,
                    filePath,
                    mimetype,
                    stage: progress.stage,

                    /*
                     * Start proof numbering from 1.
                     *
                     * proof 1
                     * proof 2
                     */

                    proofIndex: i + 1
                });


                /*
                 * IMPORTANT:
                 *
                 * driveService.js returns:
                 *
                 * {
                 *     fileId,
                 *     name,
                 *     webViewLink
                 * }
                 *
                 * So use uploaded.fileId,
                 * NOT uploaded.id.
                 */

                if (!uploaded || !uploaded.fileId) {
                    throw new Error(
                        `Google Drive upload failed for proof ${i + 1}`
                    );
                }


                driveFileIds.push(
                    uploaded.fileId
                );

                driveLinks.push(
                    uploaded.webViewLink || null
                );
            }


            // -----------------------------
            // ALL uploads succeeded
            // -----------------------------

            progress.driveFileIds = driveFileIds;
            progress.driveLinks = driveLinks;

            /*
             * Legacy single-file fields.
             *
             * These are kept for compatibility
             * with older frontend code.
             */

            progress.driveFileId =
                driveFileIds[0] || null;

            progress.driveLink =
                driveLinks[0] || null;


            // -----------------------------
            // Approve submission
            // -----------------------------

            /*
             * IMPORTANT:
             *
             * We reach this point ONLY if every
             * proof image was successfully uploaded.
             */

            const approvalTime = new Date();

            // -----------------------------
            // Per-clue time taken (unlock → approval)
            // -----------------------------

            const timeTakenMs = progress.unlockedAt
                ? Math.max(0, approvalTime - new Date(progress.unlockedAt))
                : null;

            progress.status = "approved";
            progress.approvedAt = approvalTime;
            progress.score = clue.points;
            progress.timeTakenMs = timeTakenMs;

            await progress.save();


            // -----------------------------
            // Add points to team
            // -----------------------------

            team.score += clue.points;


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

                const nextStage = progress.stage + 1;

                team.currentStage = nextStage;

                await team.save();

                const nextClue = await Clue.findOne({
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
                // First-to-reach bonus (stage 1 and beyond)
                // -----------------------------

                /*
                 * This team just ARRIVED at nextStage — the +20 goes to
                 * the first arrival: no other team may have claimed the
                 * bonus for this stage yet, and no other team may have
                 * unlocked it earlier. Runs AFTER this team's progress
                 * row exists so ties compare real unlockedAt values.
                 */

                if (nextStage >= 1 && nextStage <= 10) {
                    const bonusClaimed = await TeamProgress.exists({
                        stage: nextStage,
                        team: { $ne: team._id },
                        bonusAwarded: { $gt: 0 }
                    });

                    const earlierArrival = await TeamProgress.findOne({
                        stage: nextStage,
                        team: { $ne: team._id },
                        unlockedAt: { $ne: null, $lt: approvalTime }
                    })
                        .sort({ unlockedAt: 1 })
                        .limit(1);

                    const bonusProgress = await TeamProgress.findOne({
                        team: team._id,
                        stage: nextStage
                    });

                    if (
                        !bonusClaimed &&
                        !earlierArrival &&
                        bonusProgress &&
                        !bonusProgress.bonusAwarded
                    ) {
                        bonusProgress.bonusAwarded = STAGE_BONUS;
                        await bonusProgress.save();

                        team.bonusPoints =
                            (team.bonusPoints || 0) + STAGE_BONUS;
                        team.score += STAGE_BONUS;
                        bonusAwarded = STAGE_BONUS;

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
                        : "Submission approved and proofs uploaded to Google Drive successfully",

                driveUploaded: true,

                driveFileIds,
                driveLinks,

                team: {
                    teamName: team.teamName,
                    teamCode: team.teamCode,
                    currentStage: team.currentStage,
                    score: team.score,
                    bonusPoints: team.bonusPoints || 0,
                    bonusAwardedThisStage: bonusAwarded,
                    status: team.status,
                    completedAt: team.completedAt
                },

                progress: {
                    stage: progress.stage,
                    status: progress.status,
                    score: progress.score,
                    timeTakenMs: progress.timeTakenMs,
                    timeTakenText: formatDuration(progress.timeTakenMs),
                    submittedAt: progress.submittedAt,
                    approvedAt: progress.approvedAt,

                    driveFileIds:
                        progress.driveFileIds,

                    driveLinks:
                        progress.driveLinks
                }
            });

        } catch (driveError) {

            /*
             * IMPORTANT:
             *
             * If even ONE Drive upload fails:
             *
             * - Do NOT approve
             * - Do NOT give points
             * - Do NOT unlock next clue
             * - Keep submission pending
             */

            console.error(
                "Google Drive upload failed during approval:",
                driveError
            );

            return res.status(500).json({
                message:
                    "Google Drive upload failed. Submission remains pending and has NOT been approved.",

                error: driveError.message,

                driveUploaded: false
            });
        }

    } catch (error) {

        console.error(
            "Approve submission error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to approve submission",

            error: error.message
        });
    }
};


// -----------------------------
// Start team game
// -----------------------------

const startTeamGame = async (req, res) => {
    try {
        const { teamCode } = req.params;

        const team = await Team.findOne({
            teamCode
        });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (!team.clueSet) {

            // Team registered after the bulk allocation
            // Assign the least-loaded set that actually has clues

            const counts = await Clue.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: "$set", total: { $sum: 1 } } }
            ]);

            const setMap = Object.fromEntries(
                counts.map((c) => [c._id, c.total])
            );

            team.clueSet =
                ["set1", "set2", "set3"]
                    .sort(
                        (a, b) =>
                            (setMap[a] || 0) - (setMap[b] || 0)
                    )
                    .find((s) => (setMap[s] || 0) > 0) || "set1";
        }

        if (team.startedAt) {
            return res.status(400).json({
                message:
                    "Game has already been started for this team",

                startedAt:
                    team.startedAt
            });
        }

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

        const clue = await Clue.findOne({
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
                teamName: team.teamName,
                teamCode: team.teamCode,
                clueSet: team.clueSet,
                currentStage: team.currentStage,
                score: team.score,
                status: team.status,
                startedAt: team.startedAt
            },

            clue: {
                stage: clue.stage,
                title: clue.title
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