/**
 * Google Drive integration for Trail of Secret.
 *
 * Authentication:
 *   Google OAuth 2.0 using a refresh token.
 *
 * The refresh token belongs to the Google account that owns
 * the Trail of Secret Drive folder.
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// Root Drive folder
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Drive name of the shared drive / top-level folder that holds
// "set 1", "set 2", "set 3" clue folders (fetched by NAME).
const CLUE_ROOT_NAME =
    process.env.GOOGLE_CLUE_ROOT_NAME || "trail-of-secrets-clue";

let driveClient = null;

// ------------------------------------------------------------
// Clue name resolution cache
// { "<folderId>:clue 7": { fileId, name, mimeType } , "<name>:id": folderId }
// ------------------------------------------------------------
const clueLookupCache = new Map();
const CLUE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

    const oauth2Client = new google.auth.OAuth2(
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
    if (driveClient) return driveClient;

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
    if (!isConfigured()) return null;

    if (team.driveFolderId) {
        return team.driveFolderId;
    }

    const folderName = `${team.teamName} [${team.teamCode}]`
        .replace(/[/\\:*?"<>|]/g, "-")
        .substring(0, 90);

    try {
        const drive = getDrive();

        if (!drive) return null;

        const query = [
            `'${ROOT_FOLDER_ID}' in parents`,
            "mimeType = 'application/vnd.google-apps.folder'",
            "trashed = false",
            `name = '${folderName.replace(/'/g, "\\'")}'`
        ].join(" and ");

        const list = await drive.files.list({
            q: query,
            fields: "files(id, name)",
            spaces: "drive",
            pageSize: 1
        });

        let folderId = list.data.files?.[0]?.id || null;

        // Folder doesn't exist, create it
        if (!folderId) {
            const created = await drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [ROOT_FOLDER_ID]
                },
                fields: "id"
            });

            folderId = created.data.id;

            console.log(
                `[drive] Created folder "${folderName}" (${folderId})`
            );
        }

        // Save folder ID in MongoDB
        team.driveFolderId = folderId;
        await team.save();

        return folderId;
    } catch (error) {
        console.error(
            `[drive] Could not ensure folder for team ${team.teamCode}:`,
            error.response?.data || error.message
        );

        return null;
    }
};

// ------------------------------------------------------------
// Upload proof image
// ------------------------------------------------------------

const uploadProofToDrive = async ({
    team,
    filePath,
    mimetype,
    stage,
    proofIndex
}) => {
    if (!isConfigured()) return null;

    const folderId = await ensureTeamFolder(team);

    if (!folderId) return null;

    try {
        const ext = path.extname(filePath);

        const label = proofIndex
            ? `proof${proofIndex}`
            : "proof";

        const driveName =
            `stage-${String(stage ?? 0).padStart(2, "0")}-${label}-${Date.now()}${ext}`;

        const created = await getDrive().files.create({
            requestBody: {
                name: driveName,
                parents: [folderId]
            },

            media: {
                mimeType: mimetype || "application/octet-stream",
                body: fs.createReadStream(filePath)
            },

            fields: "id, name, webViewLink, size"
        });

        console.log(
            `[drive] Uploaded "${created.data.name}" ` +
            `to team ${team.teamCode}'s folder`
        );

        return {
            fileId: created.data.id,
            name: created.data.name,
            webViewLink: created.data.webViewLink
        };
    } catch (error) {
        console.error(
            `[drive] Upload failed for team ${team.teamCode}:`,
            error.response?.data || error.message
        );

        return null;
    }
};

// ------------------------------------------------------------
// Sync local proofs to Drive
// ------------------------------------------------------------

const syncLocalProofToDrive = async (progress, team) => {
    if (!team) return null;

    if (!isConfigured()) return null;

    const proofs = Array.isArray(progress?.proof)
        ? progress.proof
        : progress?.proof
            ? [progress.proof]
            : [];

    if (proofs.length === 0) return null;

    const driveIds = Array.isArray(progress.driveFileIds)
        ? [...progress.driveFileIds]
        : progress.driveFileId
            ? [progress.driveFileId]
            : [];

    const driveLinks = Array.isArray(progress.driveLinks)
        ? [...progress.driveLinks]
        : progress.driveLink
            ? [progress.driveLink]
            : [];

    if (
        driveIds.every(Boolean) &&
        driveIds.length >= proofs.length
    ) {
        return {
            fileIds: driveIds,
            links: driveLinks
        };
    }

    let uploadedAny = false;

    for (let i = 0; i < proofs.length; i++) {
        if (driveIds[i]) continue;

        const absolutePath = path.join(
            process.cwd(),
            proofs[i]
        );

        if (!fs.existsSync(absolutePath)) {
            console.warn(
                `[drive] Local proof missing on disk: ${absolutePath}`
            );
            continue;
        }

        const uploaded = await uploadProofToDrive({
            team,
            filePath: absolutePath,
            mimetype: "image/jpeg",
            stage: progress.stage,
            proofIndex: i + 1
        });

        if (uploaded) {
            driveIds[i] = uploaded.fileId;
            driveLinks[i] = uploaded.webViewLink;
            uploadedAny = true;
        }
    }

    if (uploadedAny) {
        progress.driveFileIds = driveIds;
        progress.driveLinks = driveLinks;

        progress.driveFileId =
            driveIds.find(Boolean) || null;

        progress.driveLink =
            driveLinks.find(Boolean) || null;

        await progress.save();
    }

    return uploadedAny || driveIds.some(Boolean)
        ? {
            fileIds: driveIds,
            links: driveLinks
        }
        : null;
};

// ------------------------------------------------------------
// Decorate submissions with Drive links
// ------------------------------------------------------------

const decorateSubmissionsWithDriveLinks = async (submissions) => {
    if (!isConfigured() || submissions.length === 0) {
        return;
    }

    const Team = require("../models/Team");
    const TeamProgress = require("../models/TeamProgress");

    for (const submission of submissions) {
        try {
            const progress =
                typeof submission.save === "function"
                    ? submission
                    : await TeamProgress.findById(
                        submission._id
                    );

            if (
                !progress ||
                (
                    Array.isArray(progress.driveFileIds) &&
                    progress.driveFileIds.length > 0 &&
                    progress.driveFileIds.every(Boolean) &&
                    progress.driveFileIds.length >=
                    (
                        Array.isArray(progress.proof)
                            ? progress.proof.length
                            : 1
                    )
                )
            ) {
                continue;
            }

            const team =
                submission.team &&
                submission.team.teamCode
                    ? submission.team
                    : await Team.findById(progress.team);

            const synced =
                await syncLocalProofToDrive(
                    progress,
                    team
                );

            if (synced) {
                submission.driveFileIds =
                    synced.fileIds;

                submission.driveLinks =
                    synced.links;

                submission.driveFileId =
                    synced.fileIds.find(Boolean) || null;

                submission.driveLink =
                    synced.links.find(Boolean) || null;
            }
        } catch (error) {
            console.error(
                "[drive] Submission sync error:",
                error.message
            );
        }
    }
};

// ------------------------------------------------------------
// Clue files — resolve BY NAME
//
// Drive layout (per event team):
//   trail-of-secrets-clue/          <- found by name, anywhere
//   ├── set 1/
//   │   ├── clue 0.png
//   │   ├── ...
//   │   └── clue 6/                 <- may be a FOLDER of files
//   │       └── <files>
//   ├── set 2/ ...
//   └── set 3/ ...
//
// Case-insensitive, ignores extensions, survives renames/re-uploads.
// ------------------------------------------------------------

const listChildren = async (folderId) => {
    const drive = getDrive();

    if (!drive || !folderId) return [];

    const out = [];
    let pageToken = undefined;

    do {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: "nextPageToken, files(id, name, mimeType)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: "allDrives",
            spaces: "drive",
            pageSize: 200,
            pageToken
        });

        out.push(...(res.data.files || []));
        pageToken = res.data.nextPageToken;
    } while (pageToken);

    return out;
};

// "Clue 10 .mp3" -> "clue10", "Set-2" -> "set2", "clue 6" -> "clue6"
const normName = (name) =>
    String(name || "")
        .toLowerCase()
        .replace(/\.[^.]+$/, "") // strip extension
        .replace(/[\s_\-]+/g, "") // strip ALL separators
        .replace(/^copyof/, "") // Google duplicate prefix ("Copy of clue 10")
        .trim();

const cacheGet = (key) => {
    const hit = clueLookupCache.get(key);

    if (hit && Date.now() - hit.at < CLUE_CACHE_TTL_MS) {
        return hit.value;
    }

    clueLookupCache.delete(key);
    return null;
};

const cacheSet = (key, value) => {
    clueLookupCache.set(key, { at: Date.now(), value });
    return value;
};

// Find the parent folder that holds the set folders (by name).
const findClueRootFolder = async () => {
    const cacheKey = `root:${CLUE_ROOT_NAME}`;
    const cached = cacheGet(cacheKey);

    if (cached !== null) return cached; // may be null (negative cache)

    const drive = getDrive();

    if (!drive) return null;

    try {
        const res = await drive.files.list({
            q: `name = '${CLUE_ROOT_NAME.replace(/'/g, "\\'")}' and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
            fields: "files(id, name)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: "allDrives",
            spaces: "drive",
            pageSize: 5
        });

        const folder = res.data.files?.[0] || null;

        return cacheSet(cacheKey, folder ? folder.id : null);
    } catch (error) {
        console.error(
            "[drive] Could not find clue root folder:",
            error.response?.data || error.message
        );
        return null;
    }
};

// Resolve "set 1" -> folder id
const findSetFolder = async (setName) => {
    const cacheKey = `set:${setName}`;
    const cached = cacheGet(cacheKey);

    if (cached !== null) return cached;

    const rootId = await findClueRootFolder();

    if (!rootId) return null;

    try {
        const children = await listChildren(rootId);

        const target = normName(setName);

        const folder = children.find(
            (c) =>
                c.mimeType === "application/vnd.google-apps.folder" &&
                normName(c.name) === target
        );

        return cacheSet(cacheKey, folder ? folder.id : null);
    } catch (error) {
        console.error(
            `[drive] Could not list set folders under clue root:`,
            error.response?.data || error.message
        );
        return null;
    }
};

/**
 * Resolve a clue asset by name: resolveClueByName("set1", 7)
 *   -> { fileId, name, mimeType } | null
 *
 * Handles "clue 6" being a folder: returns the first file inside.
 */
const resolveClueByName = async (setName, stage) => {
    const cacheKey = `clue:${setName}:${stage}`;
    const cached = cacheGet(cacheKey);

    if (cached !== null) return cached;

    const setFolderId = await findSetFolder(setName);

    if (!setFolderId) return null;

    try {
        const children = await listChildren(setFolderId);

        const target = `clue${stage}`;

        const match = children.find(
            (c) => normName(c.name) === target
        );

        if (!match) {
            console.warn(
                `[drive] No file named "clue ${stage}" in ${setName}`
            );
            return cacheSet(cacheKey, null);
        }

        // clue 6 is a folder in some sets — take its first file
        if (
            match.mimeType === "application/vnd.google-apps.folder"
        ) {
            const inner = await listChildren(match.id);

            const first = inner.find(
                (f) => f.mimeType !== "application/vnd.google-apps.folder"
            );

            if (!first) {
                console.warn(
                    `[drive] "clue ${stage}" folder in ${setName} is empty`
                );
                return cacheSet(cacheKey, null);
            }

            return cacheSet(cacheKey, {
                fileId: first.id,
                name: first.name,
                mimeType: first.mimeType
            });
        }

        return cacheSet(cacheKey, {
            fileId: match.id,
            name: match.name,
            mimeType: match.mimeType
        });
    } catch (error) {
        console.error(
            `[drive] resolveClueByName(${setName}, ${stage}) failed:`,
            error.response?.data || error.message
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