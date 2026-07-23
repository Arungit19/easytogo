// src/routes/workerRoutes.js
const express = require("express");
const router = express.Router();
// AFTER
const {
  register,
  login,
  getProfile,
  getAllWorkers,
  updateWorkerStatus,
  deleteWorker,
  acceptBooking,          // ✅ Moved here — it's in workerController
} = require("../controllers/workerController");

const {
  getAvailableBookings,
  getWorkerAcceptedBookings,
  updateWorkerBookingStatus,
} = require("../controllers/bookingController");
const { workerAuth, adminAuth } = require("../middlewares/workerAuthMiddleware");

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (No authentication required)
// ──────────────────────────────────────────────────────────────────────────────

router.post("/register", register);
router.post("/login", login);

// ──────────────────────────────────────────────────────────────────────────────
// WORKER PROTECTED ROUTES (Authentication required)
// ──────────────────────────────────────────────────────────────────────────────

// Worker profile
router.get("/profile", workerAuth, getProfile);

// ─── NEW: Worker Booking Endpoints ─────────────────────────────────────────────

// GET /api/worker/available-bookings
// Get all available bookings (not yet assigned to any worker)
router.get("/available-bookings", workerAuth, getAvailableBookings);

// GET /api/worker/my-accepted-bookings
// Get all bookings accepted by this worker
router.get("/my-accepted-bookings", workerAuth, getWorkerAcceptedBookings);

// POST /api/worker/accept-booking
// Worker accepts a booking
// Body: { bookingId, service, workerName, workerPhone }
router.post("/accept-booking", workerAuth, acceptBooking);

// PATCH /api/worker/booking/:id/status
// Update booking status (for worker's own bookings)
// Body: { status, notes? }
// Valid statuses: pending, confirmed, in_progress, completed, cancelled
router.patch("/booking/:id/status", workerAuth, updateWorkerBookingStatus);

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN PROTECTED ROUTES (Admin authentication required)
// ──────────────────────────────────────────────────────────────────────────────

// GET /api/worker/admin/all?status=pending
// Get all workers (admin only)
router.get("/admin/all", adminAuth, getAllWorkers);

// PATCH /api/worker/admin/:id/status
// Update worker status - approve/reject (admin only)
// Body: { status: "approved"|"rejected" }
router.patch("/admin/:id/status", adminAuth, updateWorkerStatus);

// DELETE /api/worker/admin/:id
// Delete a worker (admin only)
router.delete("/admin/:id", adminAuth, deleteWorker);

module.exports = router;