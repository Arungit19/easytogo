// src/routes/bookingRoutes.js

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
  getAvailableBookingsByService,
  confirmCOD,
} = require("../controllers/bookingController");

// =============================================================================
// MY BOOKINGS (customer) — MUST be before /:id route
// =============================================================================
router.get("/my", authenticate, getMyBookings);

// =============================================================================
// COD CONFIRM
// =============================================================================
router.post("/confirm-cod", confirmCOD);

// =============================================================================
// HOME SHIFTING
// POST — customer booking create kare
// GET  — worker dashboard poll kare (available/pending bookings)
// =============================================================================
router.post("/",              authenticate, createBooking);
router.post("/home-shifting", authenticate, createBooking);
router.get( "/home-shifting", (req, res) => getAvailableBookingsByService(req, res, "Home Shifting"));

// =============================================================================
// CLEANING
// =============================================================================
router.post("/cleaning-booking", authenticate, createCleaningBooking);
router.post("/cleaning",         authenticate, createCleaningBooking);
router.get( "/cleaning-booking", (req, res) => getAvailableBookingsByService(req, res, "Cleaning"));

// =============================================================================
// OFFICE RELOCATION
// =============================================================================
router.post("/office-relocation", authenticate, createOfficeRelocationBooking);
router.get( "/office-relocation", (req, res) => getAvailableBookingsByService(req, res, "Office Relocation"));

// =============================================================================
// PACKING & UNPACKING
// =============================================================================
router.post("/packing", authenticate, createPackingBooking);
router.get( "/packing", (req, res) => getAvailableBookingsByService(req, res, "Packing & Unpacking"));

// =============================================================================
// STORAGE
// =============================================================================
router.post("/storage-booking", authenticate, createStorageBooking);
router.post("/storage",         authenticate, createStorageBooking);
router.get( "/storage-booking", (req, res) => getAvailableBookingsByService(req, res, "Storage"));

// =============================================================================
// VEHICLE TRANSPORT
// =============================================================================
router.post("/vehicle-transport", authenticate, createVehicleTransportBooking);
router.get( "/vehicle-transport", (req, res) => getAvailableBookingsByService(req, res, "Vehicle Transport"));

// =============================================================================
// ADMIN ROUTES
// =============================================================================
router.get("/",             getAllBookings);
router.patch("/:id/status", updateBookingStatus);

// =============================================================================
// SINGLE BOOKING BY ID — MUST be last (warna /my, /home-shifting etc. match ho jayenge)
// =============================================================================
router.get("/:id", getBookingById);

module.exports = router;