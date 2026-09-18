const express = require("express");

const {
    registerTeam,
    getLeaderboard
} = require("../controllers/teamController");

const router = express.Router();

// Register team
router.post("/register", registerTeam);

// Get leaderboard
router.get("/leaderboard", getLeaderboard);

module.exports = router;