const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
require("dotenv").config();

const pool = require("./db");
const authRoutes = require("./authRoutes");
const messageRoutes = require("./messageRoutes");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.resolve(__dirname, "..");

app.set("trust proxy", 1);
const helmet = require("helmet");
app.use(helmet());
// If the frontend and backend are deployed together, no CORS is needed.
// If you deploy them separately, set FRONTEND_ORIGIN to the exact frontend origin.


if (process.env.FRONTEND_ORIGIN) {
    app.use(cors({
        origin: process.env.FRONTEND_ORIGIN,
        credentials: true
    }));
}

app.use(express.json());

app.use(
    session({
        store: new pgSession({
            pool,
            tableName: "user_sessions",
            createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.FRONTEND_ORIGIN ? "none" : "lax",
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);

app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);

// Serve the website from the same Node server so /api and the session
// cookie share the same origin in a normal deployment.
app.use(express.static(FRONTEND_DIR));

app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found." });
    }
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
    console.log(`BRUTAL server running on port ${PORT}`);
});
