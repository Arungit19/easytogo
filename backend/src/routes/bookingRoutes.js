

const express = require("express");
const router  = express.Router();
const { authenticate } = require("../middlewares/authMiddleware");
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  createCleaningBooking,
  createOfficeRelocationBooking,
  createPackingBooking,
  createStorageBooking,
  createVehicleTransportBooking,
} = require("../controllers/bookingController");

// ── My Bookings — MUST be before /:id ────────────────────
router.get("/my", authenticate, getMyBookings);

// ── Home Shifting ─────────────────────────────────────────
router.post("/",               authenticate, createBooking);
router.post("/home-shifting",  authenticate, createBooking);

// ── Other Services ────────────────────────────────────────
router.post("/cleaning",          authenticate, createCleaningBooking);
router.post("/office-relocation", authenticate, createOfficeRelocationBooking);
router.post("/packing",           authenticate, createPackingBooking);
router.post("/storage",           authenticate, createStorageBooking);
router.post("/vehicle-transport", authenticate, createVehicleTransportBooking);

// ── Admin routes ──────────────────────────────────────────
router.get("/",             getAllBookings);
router.get("/:id",          getBookingById);
router.patch("/:id/status", updateBookingStatus);

module.exports = router;