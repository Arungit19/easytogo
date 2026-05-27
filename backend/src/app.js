// src/app.js
const express  = require("express");
const cors     = require("cors");
const passport = require("passport");
const session  = require("express-session");
require("dotenv").config();

const authRoutes    = require("./routes/authRoutes");
const userRoutes    = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const workerRoutes  = require("./routes/workerRoutes");
const trackingRoutes = require("./routes/trackingRoutes");
const paymentRoutes  = require("./routes/paymentRoutes");

const app = express();

// ──────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ──────────────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "session_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ──────────────────────────────────────────────────────────────────────────────
// ROUTES
//
// IMPORTANT — Mount order:
//   /api/auth     → login, register
//   /api/users    → user profile
//   /api/worker   → worker auth + accept-booking
//   /api          → booking routes (home-shifting, cleaning etc.)
//                   mounted at /api so frontend hits /api/home-shifting directly
//   /api/tracking → tracking
//   /api/payments → payments
//
// Frontend ke SERVICE_ENDPOINTS:
//   BASE_URL/api/home-shifting      → GET available bookings
//   BASE_URL/api/cleaning-booking   → GET available bookings
//   BASE_URL/api/office-relocation  → GET available bookings
//   BASE_URL/api/packing            → GET available bookings
//   BASE_URL/api/storage-booking    → GET available bookings
//   BASE_URL/api/vehicle-transport  → GET available bookings
//   BASE_URL/api/worker/accept-booking → POST accept
// ──────────────────────────────────────────────────────────────────────────────

app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/worker",   workerRoutes);   // /api/worker/accept-booking etc.
app.use("/api/tracking", trackingRoutes);
app.use("/api/payments", paymentRoutes);

// Booking routes at /api — so /api/home-shifting, /api/cleaning-booking etc. work directly
// NOTE: /api/bookings/* bhi kaam karta rahega agar legacy calls hain
app.use("/api",          bookingRoutes);
app.use("/api/bookings", bookingRoutes);  // legacy support

// ──────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    status:      "ok",
    timestamp:   new Date().toISOString(),
    uptime:      process.uptime(),
    environment: process.env.NODE_ENV || "development",
    routes: {
      worker:   "/api/worker/*",
      bookings: "/api/home-shifting, /api/cleaning-booking, /api/office-relocation, /api/packing, /api/storage-booking, /api/vehicle-transport",
    },
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 404 HANDLER
// ──────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error:  "Route not found",
    path:   req.path,
    method: req.method,
    hint:   "Check availableRoutes below",
    availableRoutes: {
      auth:    ["POST /api/auth/login", "POST /api/auth/register"],
      worker:  [
        "POST /api/worker/login",
        "POST /api/worker/register",
        "POST /api/worker/accept-booking",
        "GET  /api/worker/profile",
        "PATCH /api/worker/update-availability",
        "PATCH /api/worker/update-profile",
      ],
      bookings: [
        "GET  /api/home-shifting",
        "POST /api/home-shifting",
        "GET  /api/cleaning-booking",
        "POST /api/cleaning-booking",
        "GET  /api/office-relocation",
        "POST /api/office-relocation",
        "GET  /api/packing",
        "POST /api/packing",
        "GET  /api/storage-booking",
        "POST /api/storage-booking",
        "GET  /api/vehicle-transport",
        "POST /api/vehicle-transport",
      ],
      health: "GET /api/health",
    },
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ERROR HANDLER
// ──────────────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(err.status || 500).json({
    error:  err.message || "Internal server error",
    path:   req.path,
    method: req.method,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
