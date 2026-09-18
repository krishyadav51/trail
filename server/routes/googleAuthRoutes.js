const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

const SCOPES = [
    "https://www.googleapis.com/auth/drive"
];

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

// Start Google OAuth
router.get("/auth", (req, res) => {
    try {
        const oauth2Client = getOAuth2Client();

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
            prompt: "consent"
        });

        res.redirect(authUrl);
    } catch (error) {
        console.error("[google-auth] Failed to generate auth URL:", error);
        res.status(500).send("Failed to start Google authentication");
    }
});

// Google OAuth callback
router.get("/callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send("Missing Google authorization code");
        }

        const oauth2Client = getOAuth2Client();

        const { tokens } = await oauth2Client.getToken(code);

        console.log("[google-auth] OAuth authorization successful.");

        if (!tokens.refresh_token) {
            return res.status(400).send(
                "No refresh token received. Please authorize again."
            );
        }

        // TEMPORARY:
        // We will move this token into Vercel environment variables
        // after confirming OAuth works locally.
        console.log(
            "\n================ GOOGLE REFRESH TOKEN ================\n" +
            tokens.refresh_token +
            "\n========================================================\n"
        );

        res.send(`
            <h2>Google Drive authorization successful!</h2>
            <p>You can close this tab.</p>
            <p>The backend received the OAuth refresh token.</p>
        `);
    } catch (error) {
        console.error(
            "[google-auth] OAuth callback failed:",
            error.response?.data || error.message
        );

        res.status(500).send(
            "Google authentication failed. Check the backend terminal."
        );
    }
});

module.exports = router;