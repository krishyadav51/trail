/**
 * Google Drive integration for Trail of Secret.
 *
 * Authentication:
 *   Google OAuth 2.0 using a refresh token.
 *
 * The refresh token belongs to the Google account that owns
 * the Trail of Secret Drive folder.
 */

const path = require("path");
const { google } = require("googleapis");

// Root Drive folder
const ROOT_FOLDER_ID =
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Drive name of the shared drive / top-level folder that holds
// "set 1", "set 2", "set 3" clue folders.
const CLUE_ROOT_NAME =
    process.env.GOOGLE_CLUE_ROOT_NAME ||
    "trail-of-secrets-clue";

let driveClient = null;

// ------------------------------------------------------------
// Clue name resolution cache
// ------------------------------------------------------------

const clueLookupCache = new Map();

const CLUE_CACHE_TTL_MS =
    10 * 60 * 1000;

// ------------------------------------------------------------
// Google OAuth client
// ------------------------------------------------------------

const getOAuth2Client = () => {
    const {
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI,
        GOOGLE_REFRESH_TOKEN
    } = process.env;

    if (
        !GOOGLE_CLIENT_ID ||
        !GOOGLE_CLIENT_SECRET ||
        !GOOGLE_REDIRECT_URI ||
        !GOOGLE_REFRESH_TOKEN
    ) {
        return null;
    }

    const oauth2Client =
        new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

    oauth2Client.setCredentials({
        refresh_token: GOOGLE_REFRESH_TOKEN
    });

    return oauth2Client;
};

// ------------------------------------------------------------
// Get Drive client
// ------------------------------------------------------------

const getDrive = () => {
    if (driveClient) {
        return driveClient;
    }

    if (!ROOT_FOLDER_ID) {
        console.error(
            "[drive] GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured."
        );

        return null;
    }

    const auth = getOAuth2Client();

    if (!auth) {
        console.warn(
            "[drive] Google OAuth is not configured. " +
            "Drive uploads are disabled."
        );

        return null;
    }

    try {
        driveClient = google.drive({
            version: "v3",
            auth
        });

        console.log(
            "[drive] Google OAuth Drive client ready."
        );

        return driveClient;

    } catch (error) {
        console.error(
            "[drive] Failed to build Drive client:",
            error.message
        );

        driveClient = null;

        return null;
    }
};

const isConfigured = () => !!getDrive();

// ------------------------------------------------------------
// Team folder
// Find or create "<TEAMNAME> [CODE]" under root folder
// ------------------------------------------------------------

const ensureTeamFolder = async (team) => {
    if (!isConfigured()) {
        return null;
    }

    if (team.driveFolderId) {
        return team.driveFolderId;
    }

    const folderName =
        `${team.teamName} [${team.teamCode}]`
            .replace(/[/\\:*?"<>|]/g, "-")
            .substring(0, 90);

    try {
        const drive = getDrive();

        if (!drive) {
            return null;
        }

        const query = [
            `'${ROOT_FOLDER_ID}' in parents`,
            "mimeType = 'application/vnd.google-apps.folder'",
            "trashed = false",
            `name = '${folderName.replace(
                /'/g,
                "\\'"
            )}'`
        ].join(" and ");

        const list =
            await drive.files.list({
                q: query,
                fields: "files(id, name)",
                spaces: "drive",
                pageSize: 1
            });

        let folderId =
            list.data.files?.[0]?.id ||
            null;

        // Folder doesn't exist, create it.
        if (!folderId) {
            const created =
                await drive.files.create({
                    requestBody: {
                        name: folderName,
                        mimeType:
                            "application/vnd.google-apps.folder",
                        parents: [ROOT_FOLDER_ID]
                    },

                    fields: "id"
                });

            folderId = created.data.id;

            console.log(
                `[drive] Created folder "${folderName}" (${folderId})`
            );
        }

        // Save folder ID in MongoDB.
        team.driveFolderId = folderId;

        await team.save();

        return folderId;

    } catch (error) {
        console.error(
            `[drive] Could not ensure folder for team ${team.teamCode}:`,
            error.response?.data ||
            error.message
        );

        return null;
    }
};

// ------------------------------------------------------------
// Upload proof image DIRECTLY from memory
// ------------------------------------------------------------

const uploadProofToDrive = async ({
    team,
    buffer,
    mimetype,
    originalName,
    stage,
    proofIndex
}) => {
    if (!isConfigured()) {
        return null;
    }

    const folderId =
        await ensureTeamFolder(team);

    if (!folderId) {
        return null;
    }

    try {
        const ext =
            path.extname(originalName || "") ||
            ".jpg";

        const label =
            proofIndex
                ? `proof${proofIndex}`
                : "proof";

        const driveName =
            `stage-${String(
                stage ?? 0
            ).padStart(2, "0")}-${label}-${Date.now()}${ext}`;

        const created =
            await getDrive().files.create({
                requestBody: {
                    name: driveName,
                    parents: [folderId]
                },

                media: {
                    mimeType:
                        mimetype ||
                        "application/octet-stream",

                    body: buffer
                },

                fields:
                    "id, name, webViewLink, size"
            });

        console.log(
            `[drive] Uploaded "${created.data.name}" ` +
            `to team ${team.teamCode}'s folder`
        );

        return {
            fileId: created.data.id,
            name: created.data.name,
            webViewLink:
                created.data.webViewLink
        };

    } catch (error) {
        console.error(
            `[drive] Upload failed for team ${team.teamCode}:`,
            error.response?.data ||
            error.message
        );

        return null;
    }
};

// ------------------------------------------------------------
// Legacy local-proof sync
// ------------------------------------------------------------
// Kept for compatibility with OLD submissions that still contain
// local /uploads/... paths.
//
// New submissions DO NOT use this function.

const syncLocalProofToDrive = async () => {
    console.warn(
        "[drive] syncLocalProofToDrive is deprecated. " +
        "New proofs are uploaded directly to Google Drive."
    );

    return null;
};

// ------------------------------------------------------------
// Decorate submissions with Drive links
// ------------------------------------------------------------
// New submissions already contain driveFileIds/driveLinks,
// so there is nothing to upload here.

const decorateSubmissionsWithDriveLinks =
    async (submissions) => {
        if (!Array.isArray(submissions)) {
            return;
        }

        for (const submission of submissions) {
            if (!submission) {
                continue;
            }

            if (
                Array.isArray(
                    submission.driveFileIds
                ) &&
                submission.driveFileIds.length > 0
            ) {
                submission.driveFileId =
                    submission.driveFileIds[0];

                submission.driveLink =
                    submission.driveLinks?.[0] ||
                    null;
            }
        }
    };

// ------------------------------------------------------------
// Clue files — resolve BY NAME
//
// Drive layout:
//
// trail-of-secrets-clue/
// ├── set 1/
// │   ├── clue 0.png
// │   ├── ...
// │   └── clue 6/
// │       └── <files>
// ├── set 2/
// └── set 3/
//
// Case-insensitive, ignores extensions,
// survives renames/re-uploads.
// ------------------------------------------------------------

const listChildren = async (folderId) => {
    const drive = getDrive();

    if (!drive || !folderId) {
        return [];
    }

    const out = [];

    let pageToken = undefined;

    do {
        const res =
            await drive.files.list({
                q:
                    `'${folderId}' in parents and trashed = false`,

                fields:
                    "nextPageToken, files(id, name, mimeType)",

                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                corpora: "allDrives",
                spaces: "drive",
                pageSize: 200,
                pageToken
            });

        out.push(
            ...(res.data.files || [])
        );

        pageToken =
            res.data.nextPageToken;

    } while (pageToken);

    return out;
};

// "Clue 10 .mp3" -> "clue10"
// "Set-2" -> "set2"
// "clue 6" -> "clue6"
const normName = (name) =>
    String(name || "")
        .toLowerCase()
        .replace(/\.[^.]+$/, "")
        .replace(/[\s_\-]+/g, "")
        .replace(/^copyof/, "")
        .trim();

const cacheGet = (key) => {
    const hit =
        clueLookupCache.get(key);

    if (
        hit &&
        Date.now() - hit.at <
            CLUE_CACHE_TTL_MS
    ) {
        return hit.value;
    }

    clueLookupCache.delete(key);

    return null;
};

const cacheSet = (key, value) => {
    clueLookupCache.set(key, {
        at: Date.now(),
        value
    });

    return value;
};

// ------------------------------------------------------------
// Find clue root folder
// ------------------------------------------------------------

const findClueRootFolder = async () => {
    const cacheKey =
        `root:${CLUE_ROOT_NAME}`;

    const cached =
        cacheGet(cacheKey);

    if (cached !== null) {
        return cached;
    }

    const drive = getDrive();

    if (!drive) {
        return null;
    }

    try {
        const res =
            await drive.files.list({
                q:
                    `name = '${CLUE_ROOT_NAME.replace(
                        /'/g,
                        "\\'"
                    )}' and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,

                fields: "files(id, name)",

                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                corpora: "allDrives",
                spaces: "drive",
                pageSize: 5
            });

        const folder =
            res.data.files?.[0] ||
            null;

        return cacheSet(
            cacheKey,
            folder
                ? folder.id
                : null
        );

    } catch (error) {
        console.error(
            "[drive] Could not find clue root folder:",
            error.response?.data ||
            error.message
        );

        return null;
    }
};

// ------------------------------------------------------------
// Find set folder
// ------------------------------------------------------------

const findSetFolder = async (setName) => {
    const cacheKey =
        `set:${setName}`;

    const cached =
        cacheGet(cacheKey);

    if (cached !== null) {
        return cached;
    }

    const rootId =
        await findClueRootFolder();

    if (!rootId) {
        return null;
    }

    try {
        const children =
            await listChildren(rootId);

        const target =
            normName(setName);

        const folder =
            children.find(
                (c) =>
                    c.mimeType ===
                        "application/vnd.google-apps.folder" &&
                    normName(c.name) ===
                        target
            );

        return cacheSet(
            cacheKey,
            folder
                ? folder.id
                : null
        );

    } catch (error) {
        console.error(
            `[drive] Could not list set folders under clue root:`,
            error.response?.data ||
            error.message
        );

        return null;
    }
};

/**
 * Resolve a clue asset by name:
 *
 * resolveClueByName("set1", 7)
 *
 * -> { fileId, name, mimeType } | null
 *
 * Handles "clue 6" being a folder:
 * returns the first file inside.
 */

const resolveClueByName =
    async (setName, stage) => {
        const cacheKey =
            `clue:${setName}:${stage}`;

        const cached =
            cacheGet(cacheKey);

        if (cached !== null) {
            return cached;
        }

        const setFolderId =
            await findSetFolder(setName);

        if (!setFolderId) {
            return null;
        }

        try {
            const children =
                await listChildren(
                    setFolderId
                );

            const target =
                `clue${stage}`;

            const match =
                children.find(
                    (c) =>
                        normName(c.name) ===
                        target
                );

            if (!match) {
                console.warn(
                    `[drive] No file named "clue ${stage}" in ${setName}`
                );

                return cacheSet(
                    cacheKey,
                    null
                );
            }

            // clue 6 can be a folder in some sets.
            if (
                match.mimeType ===
                "application/vnd.google-apps.folder"
            ) {
                const inner =
                    await listChildren(
                        match.id
                    );

                const first =
                    inner.find(
                        (f) =>
                            f.mimeType !==
                            "application/vnd.google-apps.folder"
                    );

                if (!first) {
                    console.warn(
                        `[drive] "clue ${stage}" folder in ${setName} is empty`
                    );

                    return cacheSet(
                        cacheKey,
                        null
                    );
                }

                return cacheSet(
                    cacheKey,
                    {
                        fileId: first.id,
                        name: first.name,
                        mimeType:
                            first.mimeType
                    }
                );
            }

            return cacheSet(
                cacheKey,
                {
                    fileId: match.id,
                    name: match.name,
                    mimeType:
                        match.mimeType
                }
            );

        } catch (error) {
            console.error(
                `[drive] resolveClueByName(${setName}, ${stage}) failed:`,
                error.response?.data ||
                error.message
            );

            return null;
        }
    };

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
    ROOT_FOLDER_ID,
    isConfigured,
    getDrive,
    ensureTeamFolder,
    uploadProofToDrive,
    syncLocalProofToDrive,
    decorateSubmissionsWithDriveLinks,
    resolveClueByName
};