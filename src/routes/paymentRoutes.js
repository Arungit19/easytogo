// src/routes/paymentRoutes.js
const express              = require("express");
const router               = express.Router();
const { authenticate }     = require("../middlewares/authMiddleware");
const { confirmCOD }       = require("../controllers/bookingController");

// POST /api/payments/cod
// Body: { booking_id: number, table: string }
router.post("/cod", authenticate, confirmCOD);

module.exports = router;