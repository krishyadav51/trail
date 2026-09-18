const express = require("express");
const {
    addParticipants
} = require("../controllers/participantController");
const {
    getParticipants
} = require("../controllers/participantAdminController");

const router = express.Router();

router.post("/add", addParticipants);

// Public: lets the register page verify members are on the official list
router.get("/", getParticipants);

module.exports = router;
