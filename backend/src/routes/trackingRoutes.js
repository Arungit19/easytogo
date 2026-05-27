// src/routes/trackingRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/trackingController");
const { authenticate } = require("../middlewares/authMiddleware");
const { workerAuth, adminAuth } = require("../middlewares/workerAuthMiddleware");

// ── IMPORTANT: Static routes MUST come before dynamic /:param routes ──────────

// POST create a tracking session
// POST /api/tracking
router.post("/", authenticate, ctrl.createSession);

// GET all active sessions (admin)
// GET /api/tracking/admin/all?service_type=cleaning
router.get("/admin/all", adminAuth, ctrl.getAllActiveSessions);

// GET stages for a service type
// GET /api/tracking/stages/home_shifting
router.get("/stages/:service_type", ctrl.getStagesForService);

// POST update live location (worker sends every ~10s)
// POST /api/tracking/:id/location
router.post("/:id/location", workerAuth, ctrl.updateLocation);

// PATCH update stage
// PATCH /api/tracking/:id/stage
router.patch("/:id/stage", authenticate, ctrl.updateStage);

// PATCH assign worker
// PATCH /api/tracking/:id/assign
router.patch("/:id/assign", authenticate, ctrl.assignWorker);

// GET tracking info — MUST be last (most generic dynamic route)
// GET /api/tracking/:booking_id/:service_type
router.get("/:booking_id/:service_type", authenticate, ctrl.getTracking);

module.exports = router;
