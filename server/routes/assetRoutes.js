const express = require("express");
const https = require("https");
const http = require("http");
const { getDrive } = require("../services/driveService");

const router = express.Router();

// ------------------------------------------------------------
// Anonymous fetch (redirect-following) — fallback for files
// that are shared "Anyone with the link".
// ------------------------------------------------------------
const fetchFollow = (url, depth = 0) =>
    new Promise((resolve, reject) => {
        if (depth > 10) {
            return reject(new Error("Too many redirects"));
        }

        const requester = url.startsWith("http://") ? http : https;

        const request = requester.get(
            url,
            { headers: { "User-Agent": "Mozilla/5.0" } },
            (response) => {
                if (
                    response.statusCode >= 300 &&
                    response.statusCode < 400 &&
                    response.headers.location
                ) {
                    response.resume();

                    const next = new URL(
                        response.headers.location,
                        url
                    ).toString();

                    return fetchFollow(next, depth + 1).then(resolve, reject);
                }

                resolve(response);
            }
        );

        request.setTimeout(20000, () => {
            request.destroy(new Error("Drive request timed out"));
        });

        request.on("error", reject);
    });

const isHtml = (response) =>
    String(response.headers["content-type"] || "").includes("text/html");

// ------------------------------------------------------------
// Authenticated fetch — Google Drive API with owner's OAuth
// credentials. Works for PRIVATE files too.
// ------------------------------------------------------------
const fetchViaDriveApi = async (fileId) => {
    const drive = getDrive();

    if (!drive) return null;

    try {
        // Get metadata first
        const meta = await drive.files.get({
            fileId,
            fields: "id, name, mimeType, size",
            supportsAllDrives: true
        });

        // Get actual file content
        const content = await drive.files.get(
            {
                fileId,
                alt: "media"
            },
            {
                responseType: "stream",
                supportsAllDrives: true
            }
        );

        return {
            name: meta.data.name || fileId,
            mimeType:
                meta.data.mimeType || "application/octet-stream",
            size: meta.data.size,
            stream: content.data
        };
    } catch (error) {
        // 401/403/404 means the authenticated account
        // cannot access the file.
        if (
            error.code &&
            ![401, 403, 404].includes(Number(error.code))
        ) {
            console.error(
                `[assets] Drive API error for ${fileId}:`,
                error.message
            );
        }

        return null;
    }
};

// ------------------------------------------------------------
// Stream file to browser
// ------------------------------------------------------------
const streamToClient = (
    res,
    { mimeType, size, name, stream, disposition }
) => {
    res.setHeader("Content-Type", mimeType);

    if (size) {
        res.setHeader("Content-Length", size);
    }

    res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${String(name).replace(/"/g, "")}"`
    );

    // Google Drive returns a Node.js PassThrough stream.
    // Do NOT use Readable.fromWeb() here.
    stream.pipe(res);
};

// ------------------------------------------------------------
// GET /api/assets/:fileId
//
// ?download=1
//     -> forces download
//
// Without download=1
//     -> displays file inline when browser supports it
//
// Strategy:
// 1. Authenticated Drive API
// 2. Anonymous public Drive URL
// 3. Redirect directly to Drive
// ------------------------------------------------------------
router.get("/:fileId", async (req, res) => {
    const { fileId } = req.params;

    const disposition = req.query.download
        ? "attachment"
        : "inline";

    if (!fileId) {
        return res.status(400).json({
            message: "File ID is required"
        });
    }

    // --------------------------------------------------------
    // Attempt 1: Authenticated Drive API
    // Handles private files.
    // --------------------------------------------------------
    const apiResult = await fetchViaDriveApi(fileId);

    if (apiResult) {
        return streamToClient(res, {
            ...apiResult,
            disposition
        });
    }

    // --------------------------------------------------------
    // Attempt 2: Anonymous public fetch
    // --------------------------------------------------------
    const MAX_ATTEMPTS = 3;

    for (
        let attempt = 1;
        attempt <= MAX_ATTEMPTS;
        attempt++
    ) {
        try {
            let response = await fetchFollow(
                `https://drive.google.com/uc?export=download&id=${fileId}`
            );

            // Google Drive may return an HTML confirmation page.
            if (isHtml(response)) {
                response.resume();

                response = await fetchFollow(
                    `https://drive.google.com/uc?export=view&id=${fileId}`
                );
            }

            // Still HTML means the file isn't publicly accessible.
            if (isHtml(response)) {
                response.resume();
                break;
            }

            // Only accept successful responses.
            if (response.statusCode !== 200) {
                response.resume();
                break;
            }

            const contentType =
                response.headers["content-type"] ||
                "application/octet-stream";

            const extension =
                contentType.split("/")[1]
                    ? "." +
                      contentType
                          .split("/")[1]
                          .split(";")[0]
                    : "";

            const name = `${fileId}${extension}`;

            return streamToClient(res, {
                mimeType: contentType,
                size: response.headers["content-length"],
                name,
                stream: response,
                disposition
            });
        } catch (error) {
            console.error(
                `[assets] anonymous fetch failed (attempt ${attempt}/${MAX_ATTEMPTS}) for ${fileId}:`,
                error.message
            );

            if (res.headersSent) {
                return;
            }

            if (attempt === MAX_ATTEMPTS) {
                break;
            }

            await new Promise((resolve) =>
                setTimeout(resolve, 600 * attempt)
            );
        }
    }

    // --------------------------------------------------------
    // Last resort: redirect browser directly to Google Drive
    // --------------------------------------------------------
    if (!res.headersSent) {
        return res.redirect(
            `https://drive.google.com/uc?export=download&id=${fileId}`
        );
    }
});

module.exports = router;

