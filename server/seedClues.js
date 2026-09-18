const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const Clue = require("./models/Clue");

dotenv.config({ override: true });

// =========================
// GOOGLE DRIVE URL HELPERS
// =========================

const driveImageUrl = (fileId) =>
    `https://drive.google.com/uc?export=view&id=${fileId}`;

const driveDownloadUrl = (fileId) =>
    `https://drive.google.com/uc?export=download&id=${fileId}`;

// =========================
// CLUES
// =========================

const clues = [

    // =====================================================
    // SET 1
    // =====================================================

    {
        stage: 0,
        set: "set1",
        title: "Clue 0",
        type: "image",
        assets: [
            {
                name: "clue 0",
                url: driveImageUrl("1i6U6NnVZs0XFdGIFA6M6wkQwi8C8c9cj"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 1,
        set: "set1",
        title: "Clue 1",
        type: "image",
        assets: [
            {
                name: "clue 1",
                url: driveImageUrl("1slvxTa5yptU1ZcxKKWm7wsgRUFM27ino"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 2,
        set: "set1",
        title: "Clue 2",
        type: "poem",
        assets: [
            {
                name: "clue 2",
                url: driveImageUrl("1fUvOqq4EacmMYb70oWdiUtSmN-qfV3-j"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 3,
        set: "set1",
        title: "Clue 3",
        type: "image",
        assets: [
            {
                name: "clue 3",
                url: driveImageUrl("1QjnKE0aF2klVXDKJaRyMJLNylI63nDuv"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 4,
        set: "set1",
        title: "Clue 4",
        type: "image",
        assets: [
            {
                name: "clue 4",
                url: driveImageUrl("1vy2cZw2OD38Fu8Wn96hfYwE1JMCSiGdl"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 5,
        set: "set1",
        title: "Clue 5",
        type: "image",
        assets: [
            {
                name: "clue 5",
                url: driveImageUrl("1cUHeAGN_uQEXZzc6ZVLWdJeED_BNHEN8"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 6,
        set: "set1",
        title: "Clue 6",
        type: "image",
        assets: [
            {
                name: "clue 6",
                url: driveImageUrl("1d2gzagtfWiNv50N465-iBxJcGMaWUK7Q"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 7,
        set: "set1",
        title: "Clue 7",
        type: "document",
        hintText: "The lock remembers where you began",
        assets: [
            {
                name: "clue 7",
                url: driveDownloadUrl("1Q0Zqavamx-Sa2gl1kjrW3fSrUOVxz4Ji"),
                assetType: "document"
            }
        ]
    },

    {
        stage: 8,
        set: "set1",
        title: "Clue 8",
        type: "image",
        assets: [
            {
                name: "clue 8",
                url: driveImageUrl("1DWvjtFeO0vPrwFoMjIoL1FeZny_o6LXo"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 9,
        set: "set1",
        title: "Clue 9",
        type: "image",
        assets: [
            {
                name: "clue 9",
                url: driveImageUrl("1P7XCAF0bcEjlSkHgTEazTYeXdyxw68cP"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 10,
        set: "set1",
        title: "Clue 10",
        type: "audio",
        assets: [
            {
                name: "clue 10",
                url: driveDownloadUrl("1kuoVwChOFuWZN8vEBd-2lRJYMOQWLHLx"),
                assetType: "audio"
            }
        ]
    },


    // =====================================================
    // SET 2
    // =====================================================

    {
        stage: 0,
        set: "set2",
        title: "Clue 0",
        type: "image",
        assets: [
            {
                name: "clue 0",
                url: driveImageUrl("1i6U6NnVZs0XFdGIFA6M6wkQwi8C8c9cj"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 1,
        set: "set2",
        title: "Clue 1",
        type: "image",
        assets: [
            {
                name: "clue 1",
                url: driveImageUrl("1S1KGM8L7rM4W9jzaGbyHlsxPdPqap2yS"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 2,
        set: "set2",
        title: "Clue 2",
        type: "poem",
        assets: [
            {
                name: "clue 2",
                url: driveImageUrl("1x09XiK_Paa0HJ8iVY_MhXKZU6yAltTgG"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 3,
        set: "set2",
        title: "Clue 3",
        type: "image",
        assets: [
            {
                name: "clue 3",
                url: driveImageUrl("1ID61lf492viixmJlmtWBOXNHHIwP7eU8"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 4,
        set: "set2",
        title: "Clue 4",
        type: "video",
        assets: [
            {
                name: "clue 4",
                url: driveImageUrl("1OsDqj2zrN9JxBsjStITAEDvKf28Ou2qW"),
                assetType: "video"
            }
        ]
    },

    {
        stage: 5,
        set: "set2",
        title: "Clue 5",
        type: "image",
        assets: [
            {
                name: "clue 5",
                url: driveImageUrl("1FeGpy8AKmM-Mt5I_lNhJyYRBUfkiJtzI"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 6,
        set: "set2",
        title: "Clue 6",
        type: "image",
        assets: [
            {
                name: "clue 6",
                url: driveImageUrl("1xke1hw5CbsaLysp6uwnmRUaaC_j7toGZ"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 7,
        set: "set2",
        title: "Clue 7",
        type: "document",
        hintText: "The lock remembers where you began",
        assets: [
            {
                name: "clue 7",
                url: driveDownloadUrl("1lOm1ifG1GN2y8FxO-QNBa088244W2faM"),
                assetType: "document"
            }
        ]
    },

    {
        stage: 8,
        set: "set2",
        title: "Clue 8",
        type: "image",
        assets: [
            {
                name: "clue 8",
                url: driveImageUrl("1h7vqMN5QHj_XD4Q4WCy_XTRf0Efjl9a7"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 9,
        set: "set2",
        title: "Clue 9",
        type: "image",
        assets: [
            {
                name: "clue 9",
                url: driveImageUrl("1gZ8uYNhPN0CGmQSBs-taENuxm9Tv2RR7"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 10,
        set: "set2",
        title: "Clue 10",
        type: "audio",
        assets: [
            {
                name: "clue 10",
                url: driveDownloadUrl("1kuoVwChOFuWZN8vEBd-2lRJYMOQWLHLx"),
                assetType: "audio"
            }
        ]
    },


    // =====================================================
    // SET 3
    // =====================================================

    {
        stage: 0,
        set: "set3",
        title: "Clue 0",
        type: "image",
        assets: [
            {
                name: "clue 0",
                url: driveImageUrl("1i6U6NnVZs0XFdGIFA6M6wkQwi8C8c9cj"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 1,
        set: "set3",
        title: "Clue 1",
        type: "image",
        assets: [
            {
                name: "clue 1",
                url: driveImageUrl("1xX3d0_y5RqsTQbUkAFxDgGJfpopfF6iO"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 2,
        set: "set3",
        title: "Clue 2",
        type: "image",
        assets: [
            {
                name: "clue 2",
                url: driveImageUrl("1mqkP8xPQZiz2D8N4x-IcHzR35dzhy9Ji"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 3,
        set: "set3",
        title: "Clue 3",
        type: "image",
        assets: [
            {
                name: "clue 3",
                url: driveImageUrl("1fm3KAR3ma5xHfqFLcX8NwGp-KDj37_KH"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 4,
        set: "set3",
        title: "Clue 4",
        type: "video",
        assets: [
            {
                name: "clue 4",
                url: driveImageUrl("1PcpRexSvei4CBhdwJ5PnvWHejwooHvUb"),
                assetType: "video"
            }
        ]
    },

    {
        stage: 5,
        set: "set3",
        title: "Clue 5",
        type: "image",
        assets: [
            {
                name: "clue 5",
                url: driveImageUrl("1uozKEaU8m4uLHfQApoEgL_QaZakjaEGH"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 6,
        set: "set3",
        title: "Clue 6",
        type: "image",
        assets: [
            {
                name: "clue 6",
                url: driveImageUrl("1K-nlkebXDKRb5usIYLqa9VmKr-lIv7np"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 7,
        set: "set3",
        title: "Clue 7",
        type: "document",
        hintText: "The lock remembers where you began",
        assets: [
            {
                name: "clue 7",
                url: driveDownloadUrl("1cxD4jXTCceL47tqxoTBFAH42WD7J4oek"),
                assetType: "document"
            }
        ]
    },

    {
        stage: 8,
        set: "set3",
        title: "Clue 8",
        type: "image",
        assets: [
            {
                name: "clue 8",
                url: driveImageUrl("15SaEMsr20dE3TWR0qa5UZeGo5MPWrF-1"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 9,
        set: "set3",
        title: "Clue 9",
        type: "image",
        assets: [
            {
                name: "clue 9",
                url: driveImageUrl("1gZ8uYNhPN0CGmQSBs-taENuxm9Tv2RR7"),
                assetType: "image"
            }
        ]
    },

    {
        stage: 10,
        set: "set3",
        title: "Clue 10",
        type: "audio",
        assets: [
            {
                name: "clue 10",
                url: driveDownloadUrl("1kuoVwChOFuWZN8vEBd-2lRJYMOQWLHLx"),
                assetType: "audio"
            }
        ]
    }
];


// =====================================================
// SEED DATABASE
// =====================================================

const seedClues = async () => {
    try {
        await connectDB();

        /*
         * Upsert instead of deleteMany: existing teams already point at
         * clue documents (TeamProgress.clue), so wiping clues would break
         * progress history. Matching on the (stage, set) unique index.
         */
        let upserted = 0;
        let modified = 0;

        for (const clue of clues) {
            const res = await Clue.updateOne(
                { stage: clue.stage, set: clue.set },
                { $set: clue },
                { upsert: true }
            );

            if (res.upsertedId) upserted++;
            else if (res.modifiedCount > 0) modified++;
        }

        console.log("=================================");
        console.log(`Clues seeded: ${upserted} inserted, ${modified} updated`);
        console.log("Set 1: Clue 0 - 10");
        console.log("Set 2: Clue 0 - 10");
        console.log("Set 3: Clue 0 - 10");
        console.log("Stage 7 hint applied to all sets");
        console.log("=================================");

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error("Error seeding clues:", error);

        await mongoose.connection.close();
        process.exit(1);
    }
};

seedClues();