// src/routes/workerRoutes.js
const express = require("express");
const router  = express.Router();
const {
  register,
  login,
  getProfile,
  getAllWorkers,
  updateWorkerStatus,
  deleteWorker,
  acceptBooking,
  getMyBookings,
} = require("../controllers/workerController");
const { workerAuth, adminAuth } = require("../middlewares/workerAuthMiddleware");

// ── Public routes ──────────────────────────────────────────────────────
router.post("/register", register);
router.post("/login",    login);

// ── Worker protected routes ────────────────────────────────────────────
router.get ("/profile",        workerAuth, getProfile);
router.post("/accept-booking", workerAuth, acceptBooking);
router.get ("/my-bookings",    workerAuth, getMyBookings);

// ── Admin routes ───────────────────────────────────────────────────────
// GET  /api/worker/admin/all?status=pending
router.get   ("/admin/all",           adminAuth, getAllWorkers);
// PATCH /api/worker/admin/:id/status  body: { status: "approved"|"rejected" }
router.patch ("/admin/:id/status",    adminAuth, updateWorkerStatus);
// DELETE /api/worker/admin/:id
router.delete("/admin/:id",           adminAuth, deleteWorker);

module.exports = router;