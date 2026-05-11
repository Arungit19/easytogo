// src/app.js
const express   = require("express");
const cors      = require("cors");
const passport  = require("passport");
const session   = require("express-session");
require("dotenv").config();

const authRoutes     = require("./routes/authRoutes");
const userRoutes     = require("./routes/userRoutes");
const bookingRoutes  = require("./routes/bookingRoutes");
const workerRoutes   = require("./routes/workerRoutes");
const trackingRoutes = require("./routes/trackingRoutes"); // ← new

const app = express();

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session (needed by Passport for OAuth flow) ───────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || "session_secret",
  resave:            false,
  saveUninitialized: false,
}));

// ── Passport ──────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/worker",   workerRoutes);
app.use("/api/tracking", trackingRoutes); // ← new

// ── Health ────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: "Route not found." }));

// ── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Internal server error." });
});

module.exports = app;