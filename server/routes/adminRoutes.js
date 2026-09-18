const express = require("express");
const jwt = require("jsonwebtoken");

const {
    allocateClueSets,
    resetClueSets,
    getPendingSubmissions,
    approveSubmission,
    rejectSubmission,
    startTeamGame
} = require("../controllers/adminController");

const {
    getAllTeams,
    blockTeam,
    unblockTeam,
    disqualifyTeam,
    deleteTeam,
    resetTeamProgress
} = require("../controllers/teamAdminController");

const {
    getParticipants,
    addParticipantsAdmin,
    deleteParticipant
} = require("../controllers/participantAdminController");

const router = express.Router();

const normalise = (value) => String(value || "").trim().toLowerCase();

const adminCredentialsMatch = ({ teamName, teamLeader, leaderRegNo, email, teamMember }) => (
    normalise(teamName) === normalise(process.env.ADMIN_TEAM_NAME || "iquest") &&
    normalise(teamLeader) === normalise(process.env.ADMIN_TEAM_LEADER || "krish") &&
    normalise(leaderRegNo).toUpperCase() === (process.env.ADMIN_LEADER_REG_NO || "25BCA020").trim().toUpperCase() &&
    normalise(email) === normalise(process.env.ADMIN_EMAIL || "ykrishyadav2007@gmail.com") &&
    normalise(teamMember).toUpperCase() === (process.env.ADMIN_TEAM_MEMBER || "25BCA015").trim().toUpperCase()
);

const requireAdmin = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
        return res.status(401).json({ message: "Admin authentication is required" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || "trail-of-secret-admin-session");
        if (payload.role !== "admin") {
            return res.status(403).json({ message: "Admin access is required" });
        }
        req.admin = payload;
        next();
    } catch {
        return res.status(401).json({ message: "Your admin session has expired. Please sign in again." });
    }
};

router.post("/login", (req, res) => {
    if (!adminCredentialsMatch(req.body)) {
        return res.status(401).json({ message: "The supplied team details do not have admin access." });
    }

    const token = jwt.sign(
        { role: "admin", teamName: process.env.ADMIN_TEAM_NAME || "iquest" },
        process.env.JWT_SECRET || "trail-of-secret-admin-session",
        { expiresIn: "8h" }
    );

    res.status(200).json({ message: "Admin access granted", token });
});

router.use(requireAdmin);

// Allocate clue sets
router.post("/allocate-sets", allocateClueSets);

// Reset clue sets - development/testing only
router.post("/reset-sets", resetClueSets);

// Get pending proof submissions
router.get("/submissions/pending", getPendingSubmissions);

// Approve a proof submission
router.post(
    "/submissions/:progressId/approve",
    approveSubmission
);

// Reject a proof submission
router.post(
    "/submissions/:progressId/reject",
    rejectSubmission
);

// Start game for a team
router.post(
    "/teams/:teamCode/start",
    startTeamGame
);

// ── Team management ────────────────────────────────
router.get("/teams", getAllTeams);
router.post("/teams/:teamCode/block", blockTeam);
router.post("/teams/:teamCode/unblock", unblockTeam);
router.post("/teams/:teamCode/disqualify", disqualifyTeam);
router.delete("/teams/:teamCode", deleteTeam);
router.post("/teams/:teamCode/reset", resetTeamProgress);

// ── Participant management ─────────────────────────
router.get("/participants", getParticipants);
router.post("/participants", addParticipantsAdmin);
router.delete("/participants/:registerNumber", deleteParticipant);

module.exports = router;
