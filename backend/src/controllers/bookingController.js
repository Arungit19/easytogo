// src/controllers/bookingController.js
const { pool }   = require("../config/db");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendConfirmationEmail(booking, serviceName) {
  if (!booking.customer_email) return;
  try {
    await transporter.sendMail({
      from:    `"Easy To Go" <${process.env.EMAIL_USER}>`,
      to:      booking.customer_email,
      subject: `Booking Confirmed — ${serviceName} #${booking.id}`,
      html: `
        <h2>Thanks, ${booking.customer_name || "Customer"}! 🏠</h2>
        <p>Your <b>${serviceName}</b> request has been received.</p>
        <p>Our team will contact you within 30 minutes.</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td><b>Booking ID</b></td><td>#${booking.id}</td></tr>
          <tr><td><b>Service</b></td><td>${serviceName}</td></tr>
          ${booking.city ? `<tr><td><b>City</b></td><td>${booking.city}</td></tr>` : ""}
          ${booking.from_place || booking.from_location
            ? `<tr><td><b>From</b></td><td>${booking.from_place || booking.from_location}</td></tr>`
            : ""}
          ${booking.to_place || booking.to_location
            ? `<tr><td><b>To</b></td><td>${booking.to_place || booking.to_location}</td></tr>`
            : ""}
        </table>
      `,
    });
  } catch (err) {
    console.error("Email error:", err.message);
  }
}

// ── Helper: get user_id from JWT (set by authenticate middleware) ──────────
const getUserId = (req) => req.user?.id || req.user?.userId || null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. HOME SHIFTING
// POST /api/bookings/home-shifting
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, from_place, to_place,
    fromPlace, toPlace,           // frontend camelCase support
    pickup_floor, pickupFloor,
    pickup_access, pickupAccess,
    drop_floor, dropFloor,
    drop_access, dropAccess,
    service_type, serviceType,
    customer_name, customerName,
    customer_phone, customerPhone,
    customer_email, customerEmail,
    refId, ref_id,
  } = req.body;

  // Support both snake_case and camelCase from frontend
  const _from     = from_place    || fromPlace    || null;
  const _to       = to_place      || toPlace      || null;
  const _pFloor   = pickup_floor  || pickupFloor  || null;
  const _pAccess  = pickup_access || pickupAccess || null;
  const _dFloor   = drop_floor    || dropFloor    || null;
  const _dAccess  = drop_access   || dropAccess   || null;
  const _sType    = service_type  || serviceType  || null;
  const _name     = customer_name || customerName || null;
  const _phone    = customer_phone|| customerPhone|| null;
  const _email    = customer_email|| customerEmail|| null;
  const _refId    = ref_id        || refId        || ("HS" + Math.floor(Math.random() * 9000000 + 1000000));

  try {
    const { rows } = await pool.query(
      `INSERT INTO home_shifting_bookings
        (ref_id, mode, city, from_place, to_place,
         pickup_floor, pickup_access, drop_floor, drop_access,
         service_type, customer_name, customer_phone, customer_email,
         user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [_refId, mode||null, city||null, _from, _to,
       _pFloor, _pAccess, _dFloor, _dAccess,
       _sType, _name, _phone, _email, userId]
    );
    const booking = rows[0];
    await sendConfirmationEmail(booking, "Home Shifting");
    return res.status(201).json({ success: true, message: "Booking created!", booking_id: booking.id, booking });
  } catch (err) {
    console.error("createBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CLEANING SERVICE
// POST /api/bookings/cleaning
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createCleaningBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity,
    fromLocation, toLocation,
    cleaningType, propertyType,
    preferredTime, frequency,
    customer_name, customer_phone, customer_email,
  } = req.body;

  try {
    const bookingRef = "CL" + Math.floor(Math.random() * 9000000 + 1000000);
    const { rows } = await pool.query(
      `INSERT INTO cleaning_bookings
        (booking_ref, mode, city, from_location, to_location,
         from_city, to_city, cleaning_type, property_type,
         preferred_time, frequency,
         customer_name, customer_phone, customer_email,
         user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending')
       RETURNING *`,
      [bookingRef, mode||null, city||null,
       fromLocation||null, toLocation||null,
       fromCity||null, toCity||null,
       cleaningType||null, propertyType||null,
       preferredTime||null, frequency||null,
       customer_name||null, customer_phone||null, customer_email||null,
       userId]
    );
    const booking = rows[0];
    await sendConfirmationEmail(booking, "Cleaning Service");
    return res.status(201).json({
      success: true, message: "Cleaning booking created!",
      bookingRef: booking.booking_ref, booking_id: booking.id, booking,
    });
  } catch (err) {
    console.error("createCleaningBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. OFFICE RELOCATION
// POST /api/bookings/office-relocation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createOfficeRelocationBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity,
    fromLocation, toLocation,
    pickupFloor, pickupAccess,
    dropFloor, dropAccess,
    customer_name, customer_phone, customer_email,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO office_relocation_requests
        (mode, city, from_city, to_city,
         from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access,
         customer_name, customer_phone, customer_email,
         user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       pickupFloor||null, pickupAccess||null, dropFloor||null, dropAccess||null,
       customer_name||null, customer_phone||null, customer_email||null,
       userId]
    );
    const booking = rows[0];
    await sendConfirmationEmail(booking, "Office Relocation");
    return res.status(201).json({ success: true, message: "Office relocation booking created!", booking_id: booking.id, booking });
  } catch (err) {
    console.error("createOfficeRelocationBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. PACKING SERVICE
// POST /api/bookings/packing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createPackingBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity,
    fromLocation, toLocation,
    pickupFloor, pickupAccess,
    dropFloor, dropAccess,
    customer_name, customer_phone, customer_email,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO packing_requests
        (mode, city, from_city, to_city,
         from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access,
         customer_name, customer_phone, customer_email,
         user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       pickupFloor||null, pickupAccess||null, dropFloor||null, dropAccess||null,
       customer_name||null, customer_phone||null, customer_email||null,
       userId]
    );
    const booking = rows[0];
    await sendConfirmationEmail(booking, "Packing Service");
    return res.status(201).json({ success: true, message: "Packing booking created!", booking_id: booking.id, booking });
  } catch (err) {
    console.error("createPackingBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. STORAGE SERVICE
// POST /api/bookings/storage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createStorageBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity,
    fromLocation, toLocation,
    pickupFloor, pickupAccess,
    dropFloor, dropAccess,
    customer_name, customer_phone, customer_email,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO storage_bookings
        (mode, city, from_city, to_city,
         from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access,
         customer_name, customer_phone, customer_email,
         user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       pickupFloor||null, pickupAccess||null, dropFloor||null, dropAccess||null,
       customer_name||null, customer_phone||null, customer_email||null,
       userId]
    );
    const booking = rows[0];
    await sendConfirmationEmail(booking, "Storage Service");
    return res.status(201).json({ success: true, message: "Storage booking created!", booking_id: booking.id, booking });
  } catch (err) {
    console.error("createStorageBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. VEHICLE TRANSPORT
// POST /api/bookings/vehicle-transport
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createVehicleTransportBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity,
    fromLocation, toLocation,
    vehicleType, transportMode,
    customer_name, customer_phone, customer_email,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO vehicle_transport_requests
        (mode, city, from_city, to_city,
         from_location, to_location,
         vehicle_type, transport_mode,
         customer_name, customer_phone, customer_email,
         user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       vehicleType||null, transportMode||null,
       customer_name||null, customer_phone||null, customer_email||null,
       userId]
    );
    const booking = rows[0];
    await sendConfirmationEmail(booking, "Vehicle Transport");
    return res.status(201).json({ success: true, message: "Vehicle transport booking created!", booking_id: booking.id, booking });
  } catch (err) {
    console.error("createVehicleTransportBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/bookings/my
// Saari 6 tables se user ki bookings — exact columns per screenshots
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getMyBookings = async (req, res) => {
  const userId = req.user?.id || req.user?.userId || req.user?._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  try {
    const { rows } = await pool.query(`
      SELECT id,'Home Shifting' AS service_name,'home_shifting_bookings' AS source_table,
        mode,city,from_place AS pickup,to_place AS destination,
        service_type,status,customer_name,customer_phone,customer_email,created_at
      FROM home_shifting_bookings WHERE user_id=$1

      UNION ALL

      SELECT id,'Cleaning Service' AS service_name,'cleaning_bookings' AS source_table,
        mode,city,from_location AS pickup,to_location AS destination,
        cleaning_type AS service_type,status,customer_name,customer_phone,customer_email,created_at
      FROM cleaning_bookings WHERE user_id=$1

      UNION ALL

      SELECT id,'Office Relocation' AS service_name,'office_relocation_requests' AS source_table,
        mode,city,from_location AS pickup,to_location AS destination,
        NULL AS service_type,status,customer_name,customer_phone,customer_email,created_at
      FROM office_relocation_requests WHERE user_id=$1

      UNION ALL

      SELECT id,'Packing Service' AS service_name,'packing_requests' AS source_table,
        mode,city,from_location AS pickup,to_location AS destination,
        NULL AS service_type,status,customer_name,customer_phone,customer_email,created_at
      FROM packing_requests WHERE user_id=$1

      UNION ALL

      SELECT id,'Storage Service' AS service_name,'storage_bookings' AS source_table,
        mode,city,from_location AS pickup,to_location AS destination,
        NULL AS service_type,status,customer_name,customer_phone,customer_email,created_at
      FROM storage_bookings WHERE user_id=$1

      UNION ALL

      SELECT id,'Vehicle Transport' AS service_name,'vehicle_transport_requests' AS source_table,
        mode,city,from_location AS pickup,to_location AS destination,
        CONCAT(COALESCE(vehicle_type,''),
               CASE WHEN vehicle_type IS NOT NULL AND transport_mode IS NOT NULL THEN ' · ' ELSE '' END,
               COALESCE(transport_mode,'')) AS service_type,
        status,customer_name,customer_phone,customer_email,created_at
      FROM vehicle_transport_requests WHERE user_id=$1

      ORDER BY created_at DESC
    `, [userId]);

    return res.json({ success: true, total: rows.length, bookings: rows });
  } catch (err) {
    console.error("getMyBookings error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ── Admin routes ──────────────────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  const { status, city, page=1, limit=20 } = req.query;
  const offset = (page-1)*limit;
  let where="WHERE 1=1"; const params=[];
  if (status){ params.push(status); where+=` AND status=$${params.length}`; }
  if (city)  { params.push(city);   where+=` AND city=$${params.length}`; }
  params.push(limit,offset);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM home_shifting_bookings ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);
    const count = await pool.query(`SELECT COUNT(*) FROM home_shifting_bookings ${where}`,params.slice(0,-2));
    return res.json({ success:true, total:parseInt(count.rows[0].count), bookings:rows });
  } catch(err){ return res.status(500).json({ error:err.message }); }
};

const getBookingById = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM home_shifting_bookings WHERE id=$1",[req.params.id]);
    if (!rows.length) return res.status(404).json({ error:"Booking not found." });
    return res.json({ success:true, booking:rows[0] });
  } catch(err){ return res.status(500).json({ error:err.message }); }
};

const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const valid=["pending","confirmed","in_progress","completed","cancelled"];
  if (!valid.includes(status)) return res.status(400).json({ error:`status must be one of: ${valid.join(", ")}` });
  try {
    const { rows } = await pool.query(
      `UPDATE home_shifting_bookings SET status=$1 WHERE id=$2 RETURNING *`,[status,req.params.id]);
    if (!rows.length) return res.status(404).json({ error:"Booking not found." });
    return res.json({ success:true, booking:rows[0] });
  } catch(err){ return res.status(500).json({ error:err.message }); }
};

module.exports = {
  createBooking,
  createCleaningBooking,
  createOfficeRelocationBooking,
  createPackingBooking,
  createStorageBooking,
  createVehicleTransportBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
};