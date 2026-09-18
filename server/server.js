const dotenv = require("dotenv");

dotenv.config({ override: true });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const participantRoutes = require("./routes/participantRoutes");
const teamRoutes = require("./routes/teamRoutes");
const clueRoutes = require("./routes/clueRoutes");
const adminRoutes = require("./routes/adminRoutes");
const assetRoutes = require("./routes/assetRoutes");
const googleAuthRoutes = require("./routes/googleAuthRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/teams", teamRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/clues", clueRoutes);
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/assets", assetRoutes);
app.use("/api/google", googleAuthRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Trail of Secret API is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});