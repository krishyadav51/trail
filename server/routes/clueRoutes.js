const express = require("express");

const {
    getCurrentClue,
    submitProof,
    upload
} = require("../controllers/clueController");

const router = express.Router();

router.get("/team/:teamCode", getCurrentClue);

// Up to 2 proof images per submission.
// "proof" is required, "proof2" is optional — the client always sends
// "proof" (one or both images) so both fields stay in sync.
router.post(
    "/team/:teamCode/submit",
    upload.fields([
        { name: "proof", maxCount: 2 },
        { name: "proof2", maxCount: 2 }
    ]),
    submitProof
);

module.exports = router;