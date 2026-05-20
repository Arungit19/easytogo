const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// Adjust these imports to match your project
const {
  Worker,
  HomeShiftingBooking,
  CleaningBooking,
  OfficeRelocationBooking,
  PackingBooking,
  StorageBooking,
  VehicleTransportBooking,
} = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

router.use(authenticate);

const BOOKING_MODELS = {
  "Home Shifting": HomeShiftingBooking,
  "Cleaning": CleaningBooking,
  "Office Relocation": OfficeRelocationBooking,
  "Packing & Unpacking": PackingBooking,
  "Storage": StorageBooking,
  "Vehicle Transport": VehicleTransportBooking,
};

router.post("/accept-booking", async (req, res) => {
  try {
    const { bookingId, service } = req.body;
    const workerId = req.user?.id;

    if (!workerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!bookingId || !service) {
      return res.status(400).json({ message: "bookingId and service are required" });
    }

    const BookingModel = BOOKING_MODELS[service];
    if (!BookingModel) {
      return res.status(400).json({ message: "Invalid service" });
    }

    const booking = await BookingModel.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.worker_id && String(booking.worker_id) !== String(workerId)) {
      return res.status(409).json({ message: "Booking already taken" });
    }

    booking.worker_id = workerId;
    booking.worker_status = "confirmed";
    booking.status = "confirmed";
    await booking.save();

    return res.json({
      message: "Booking accepted successfully",
      booking: {
        id: booking.id,
        service,
        worker_id: booking.worker_id,
        status: booking.status,
        worker_status: booking.worker_status,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/update-availability", async (req, res) => {
  try {
    const { workerId, availFrom, availTo, availability } = req.body;
    const authWorkerId = req.user?.id;

    if (!authWorkerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!workerId || !availFrom || !availTo) {
      return res.status(400).json({ message: "workerId, availFrom, and availTo are required" });
    }

    if (String(workerId) !== String(authWorkerId)) {
      return res.status(403).json({ message: "You can only update your own availability" });
    }

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    worker.availability = availability || `${availFrom} - ${availTo}`;
    worker.avail_from = availFrom;
    worker.avail_to = availTo;
    await worker.save();

    return res.json({
      message: "Availability updated",
      worker: {
        id: worker.id,
        availability: worker.availability,
        avail_from: worker.avail_from,
        avail_to: worker.avail_to,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;