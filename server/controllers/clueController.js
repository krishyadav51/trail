const Team = require("../models/Team");
const Clue = require("../models/Clue");
const TeamProgress = require("../models/TeamProgress");
const multer = require("multer");
const path = require("path");
const { resolveClueByName } = require("../services/driveService");

// Hint shown to every team while viewing stage 7 (the PDF stage).
const STAGE_7_HINT =
    "The lock remembers where you began";

// -----------------------------
// Multer configuration
// -----------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            "-" +
            file.fieldname +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },

    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// -----------------------------
// Convert Drive URL to backend URL
// -----------------------------

const extractDriveFileId = (driveUrl) => {
    try {
        // ?id=... style links
        const url = new URL(driveUrl);
        const queryId = url.searchParams.get("id");

        if (queryId) {
            return queryId;
        }

        // /file/d/<id>/... style links
        const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);

        if (pathMatch) {
            return pathMatch[1];
        }

        return null;
    } catch (error) {
        return null;
    }
};

const getBackendAssetUrl = (driveUrl) => {
    const fileId = extractDriveFileId(driveUrl);

    if (!fileId) {
        return driveUrl;
    }

    return `/api/assets/${fileId}`;
};

const buildAssetResponse = (driveUrl) => {
    const fileId = extractDriveFileId(driveUrl);

    if (fileId) {
        return {
            fileId,
            url: `/api/assets/${fileId}`
        };
    }

    // Non-Drive links pass through untouched
    return {
        fileId: null,
        url: driveUrl
    };
};

// Derive the render type from the Drive file's real mimeType so a
// video clue renders as a video and a PDF as a document, no matter
// what type was seeded in MongoDB.
const assetTypeFromMime = (mimeType) => {
    const mime = String(mimeType || "").toLowerCase();

    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf") return "document";

    return "document"; // safe default: viewer offers a download
};

/**
 * Resolve a clue's assets, preferring LIVE Google Drive lookup by
 * name ("set 2" -> "clue 4") over the seeded links in MongoDB.
 *
 * Falling back to the seeded fileId when Drive lookup fails keeps
 * the game playable even if Drive hiccups.
 */
const resolveClueAssets = async (clue) => {
    try {
        const resolved = await resolveClueByName(
            clue.set,
            clue.stage
        );

        if (resolved?.fileId) {
            return [
                {
                    name: resolved.name,
                    fileId: resolved.fileId,
                    url: `/api/assets/${resolved.fileId}`,
                    assetType:
                        assetTypeFromMime(resolved.mimeType) ||
                        clue.assets[0]?.assetType ||
                        "image",
                    source: "drive"
                }
            ];
        }
    } catch (error) {
        console.error(
            `[clues] Drive-by-name resolution failed for ${clue.set} stage ${clue.stage}:`,
            error.message
        );
    }

    // Fallback: seeded links in MongoDB
    return clue.assets.map((asset) => ({
        name: asset.name,
        ...buildAssetResponse(asset.url),
        assetType: asset.assetType,
        source: "seeded"
    }));
};

// -----------------------------
// Get current clue
// -----------------------------

const getCurrentClue = async (req, res) => {
    try {
        const { teamCode } = req.params;

        const team = await Team.findOne({ teamCode });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (
            team.status === "blocked" ||
            team.status === "disqualified"
        ) {
            return res.status(403).json({
                message:
                    "This team has been blocked by the organisers. Please contact the event desk."
            });
        }

        // Team finished the hunt
        if (team.status === "completed") {
            return res.status(200).json({
                message: "Team has completed the trail",

                team: {
                    teamName: team.teamName,
                    teamCode: team.teamCode,
                    currentStage: team.currentStage,
                    score: team.score,
                    status: team.status
                },

                completed: true
            });
        }

        // Game must be started by admin
        if (!team.startedAt) {
            return res.status(403).json({
                message:
                    "Your game has not been started by the organisers yet. Please wait for the event to begin.",
                notStarted: true
            });
        }

        if (!team.clueSet) {
            return res.status(400).json({
                message:
                    "Clue set has not been allocated to this team yet"
            });
        }

        const clue = await Clue.findOne({
            stage: team.currentStage,
            set: team.clueSet,
            isActive: true
        });

        if (!clue) {
            return res.status(404).json({
                message: "Current clue not found"
            });
        }

        let progress = await TeamProgress.findOne({
            team: team._id,
            clue: clue._id
        });

        if (!progress) {
            progress = await TeamProgress.create({
                team: team._id,
                clue: clue._id,
                stage: team.currentStage,
                status: "unlocked",
                unlockedAt: new Date()
            });
        }

        if (progress.status === "approved") {
            return res.status(400).json({
                message: "This clue has already been approved"
            });
        }

        // Resolve assets live from Drive by name (fallback: seeded links)
        const assets = await resolveClueAssets(clue);

        // Hint: prefer per-clue DB value, fall back to the stage-7 default
        const hintText =
            clue.hintText ||
            (clue.stage === 7 ? STAGE_7_HINT : null);

        res.status(200).json({
            message: "Current clue fetched successfully",

            team: {
                teamName: team.teamName,
                teamCode: team.teamCode,
                currentStage: team.currentStage,
                score: team.score,
                status: team.status
            },

            clue: {
                id: clue._id,
                stage: clue.stage,
                title: clue.title,
                description: clue.description,
                type: clue.type,
                assets,
                hintText,
                points: clue.points
            },

            progress: {
                status: progress.status,
                unlockedAt: progress.unlockedAt,
                submittedAt: progress.submittedAt,
                approvedAt: progress.approvedAt,
                rejectionReason: progress.rejectionReason
            }
        });

    } catch (error) {
        console.error("Get current clue error:", error);

        res.status(500).json({
            message: "Failed to fetch current clue",
            error: error.message
        });
    }
};

// -----------------------------
// Submit proof
// -----------------------------

const submitProof = async (req, res) => {
    try {
        const { teamCode } = req.params;

        const hasFile =
            Boolean(req.file) ||
            (
                req.files &&
                (
                    req.files.proof?.length > 0 ||
                    req.files.proof2?.length > 0
                )
            );

        if (!hasFile) {
            return res.status(400).json({
                message:
                    "Please upload at least one proof image (up to 2)"
            });
        }

        const team = await Team.findOne({ teamCode });

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (
            team.status === "blocked" ||
            team.status === "disqualified"
        ) {
            return res.status(403).json({
                message:
                    "This team has been blocked by the organisers. Please contact the event desk."
            });
        }

        if (!team.clueSet) {
            return res.status(400).json({
                message:
                    "Clue set has not been allocated to this team yet"
            });
        }

        const clue = await Clue.findOne({
            stage: team.currentStage,
            set: team.clueSet,
            isActive: true
        });

        if (!clue) {
            return res.status(404).json({
                message: "Current clue not found"
            });
        }

        let progress = await TeamProgress.findOne({
            team: team._id,
            clue: clue._id
        });

        if (!progress) {
            return res.status(400).json({
                message: "Current clue is not unlocked yet"
            });
        }

        if (progress.status === "pending") {
            return res.status(400).json({
                message:
                    "Proof has already been submitted and is waiting for admin approval"
            });
        }

        if (progress.status === "approved") {
            return res.status(400).json({
                message: "This clue has already been approved"
            });
        }

        // -----------------------------
        // Get uploaded proof files
        // -----------------------------

        const files = [
            ...(req.files?.proof || []),
            ...(req.files?.proof2 || []),
            ...(req.file ? [req.file] : [])
        ].slice(0, 2);

        if (files.length === 0) {
            return res.status(400).json({
                message: "Please upload a proof image"
            });
        }

        // -----------------------------
        // Save proof locally
        // -----------------------------

        progress.proof = files.map(
            (file) => `/uploads/${file.filename}`
        );

        // Proof now waits for admin approval
        progress.status = "pending";

        progress.submittedAt = new Date();

        // Clear previous rejection
        progress.rejectionReason = null;

        // -----------------------------
        // IMPORTANT
        // -----------------------------
        // DO NOT upload to Google Drive here.
        //
        // Google Drive upload will happen ONLY
        // when an admin approves this proof.
        // -----------------------------

        await progress.save();

        res.status(200).json({
            message: "Proof submitted successfully",

            progress: {
                stage: progress.stage,
                status: progress.status,
                proof: progress.proof,
                proofCount: files.length,

                // Drive upload has NOT happened yet.
                driveUploaded: false,

                submittedAt: progress.submittedAt
            }
        });

    } catch (error) {
        console.error("Submit proof error:", error);

        res.status(500).json({
            message: "Failed to submit proof",
            error: error.message
        });
    }
};

// -----------------------------
// Exports
// -----------------------------

module.exports = {
    getCurrentClue,
    submitProof,
    upload
};