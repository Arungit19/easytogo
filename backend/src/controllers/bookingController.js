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
      subject: `Booking Confirmed - ${serviceName} #${booking.id}`,
      html: `
        <h2>Thanks, ${booking.customer_name || "Customer"}!</h2>
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

const getUserId = (req) => req.user?.id || req.user?.userId || null;

// =============================================================================
// GET BOOKINGS BY SERVICE
//
// *** MAIN FIX ***
// Pehle: WHERE worker_id IS NULL  → sirf pending bookings aati thi
//        Accept karne ke baad booking gayab ho jaati thi — My Jobs mein nahi aati
//
// Ab: Koi WHERE filter nahi — SARI bookings aati hain (pending + confirmed)
//     Frontend khud filter karta hai:
//       - worker_id = null        → "New Jobs" tab
//       - worker_id = myWorkerId  → "My Jobs" tab
// =============================================================================
const getAvailableBookingsByService = async (req, res, serviceName) => {
  const SERVICE_CONFIG = {
    "Home Shifting": {
      table:    "home_shifting_bookings",
      from_col: "from_place",
      to_col:   "to_place",
      time_col: "NULL",
      type_col: "service_type",
    },
    "Cleaning": {
      table:    "cleaning_bookings",
      from_col: "from_location",
      to_col:   "to_location",
      time_col: "preferred_time",
      type_col: "cleaning_type",
    },
    "Office Relocation": {
      table:    "office_relocation_requests",
      from_col: "from_location",
      to_col:   "to_location",
      time_col: "NULL",
      type_col: "NULL",
    },
    "Packing & Unpacking": {
      table:    "packing_requests",
      from_col: "address",
      to_col:   "city",
      time_col: "preferred_date",
      type_col: "service_type",
    },
    "Storage": {
      table:    "storage_bookings",
      from_col: "address",
      to_col:   "city",
      time_col: "preferred_date",
      type_col: "service_type",
    },
    "Vehicle Transport": {
      table:    "vehicle_transport_requests",
      from_col: "from_location",
      to_col:   "to_location",
      time_col: "NULL",
      type_col: "NULL",
    },
  };

  const config = SERVICE_CONFIG[serviceName];
  if (!config) {
    return res.status(400).json({ error: `Unknown service: ${serviceName}` });
  }

  const { table, from_col, to_col, time_col, type_col } = config;

  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        $1                                AS service,
        COALESCE(city, '')                AS city,
        COALESCE(${from_col}, '')         AS from_place,
        COALESCE(${to_col}, '')           AS to_place,
        COALESCE(customer_name, '')       AS customer_name,
        COALESCE(customer_phone, '')      AS customer_phone,
        COALESCE(customer_email, '')      AS customer_email,
        COALESCE(status, 'pending')       AS status,
        worker_id,
        COALESCE(${time_col}::TEXT, '')   AS preferred_time,
        COALESCE(${type_col}::TEXT, '')   AS service_type,
        created_at
      FROM ${table}
      ORDER BY created_at DESC
      LIMIT 200
    `, [serviceName]);

    // worker_id normalize — null / 0 / "0" sab null ho jayein
    // taaki frontend ka String comparison reliable rahe
    const normalized = rows.map(b => ({
      ...b,
      worker_id: (b.worker_id == null || b.worker_id === 0 || b.worker_id === "0")
        ? null
        : b.worker_id,
    }));

    return res.status(200).json({
      success:  true,
      service:  serviceName,
      total:    normalized.length,
      data:     normalized,
      bookings: normalized,
    });
  } catch (err) {
    console.error(`getAvailableBookingsByService (${serviceName}) error:`, err.message);
    return res.status(500).json({
      error:   `Failed to fetch ${serviceName} bookings`,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// =============================================================================
// COD CONFIRM
// =============================================================================
const confirmCOD = async (req, res) => {
  const { booking_id, service } = req.body;
  if (!booking_id) return res.status(400).json({ error: "booking_id is required." });

  const SERVICE_TABLE_MAP = {
    "Cleaning":            "cleaning_bookings",
    "cleaning":            "cleaning_bookings",
    "Home Shifting":       "home_shifting_bookings",
    "home shifting":       "home_shifting_bookings",
    "Office Relocation":   "office_relocation_requests",
    "office relocation":   "office_relocation_requests",
    "Packing & Unpacking": "packing_requests",
    "packing":             "packing_requests",
    "Storage":             "storage_bookings",
    "storage":             "storage_bookings",
    "Vehicle Transport":   "vehicle_transport_requests",
    "vehicle transport":   "vehicle_transport_requests",
  };

  const table = SERVICE_TABLE_MAP[service] || SERVICE_TABLE_MAP[service?.toLowerCase()];
  if (!table) return res.status(400).json({ error: `Unknown service "${service}".` });

  try {
    const check = await pool.query(`SELECT id FROM ${table} WHERE id = $1`, [booking_id]);
    if (check.rows.length === 0)
      return res.status(404).json({ error: `Booking #${booking_id} not found.` });

    await pool.query(
      `UPDATE ${table}
       SET status = 'confirmed', payment_method = 'cod', payment_status = 'pending'
       WHERE id = $1`,
      [booking_id]
    );
    return res.status(200).json({
      success: true, message: "COD confirmed.",
      booking_id, service, payment_method: "cod",
    });
  } catch (err) {
    console.error("confirmCOD error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// 1. HOME SHIFTING
// =============================================================================
const createBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city,
    from_place, to_place, fromPlace, toPlace,
    pickup_floor, pickupFloor, pickup_access, pickupAccess,
    drop_floor, dropFloor, drop_access, dropAccess,
    service_type, serviceType,
    customer_name, customerName,
    customer_phone, customerPhone,
    customer_email, customerEmail,
    refId, ref_id,
  } = req.body;

  const _from    = from_place    || fromPlace    || null;
  const _to      = to_place      || toPlace      || null;
  const _pFloor  = pickup_floor  || pickupFloor  || null;
  const _pAccess = pickup_access || pickupAccess || null;
  const _dFloor  = drop_floor    || dropFloor    || null;
  const _dAccess = drop_access   || dropAccess   || null;
  const _sType   = service_type  || serviceType  || null;
  const _name    = customer_name || customerName || null;
  const _phone   = customer_phone|| customerPhone|| null;
  const _email   = customer_email|| customerEmail|| null;
  const _refId   = ref_id || refId || ("HS" + Math.floor(Math.random() * 9000000 + 1000000));

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
    return res.status(201).json({
      success: true, message: "Booking created!",
      booking_id: booking.id, booking,
    });
  } catch (err) {
    console.error("createBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// 2. CLEANING
// =============================================================================
const createCleaningBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity, fromLocation, toLocation,
    cleaningType, propertyType, preferredTime, frequency,
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
       fromLocation||null, toLocation||null, fromCity||null, toCity||null,
       cleaningType||null, propertyType||null, preferredTime||null, frequency||null,
       customer_name||null, customer_phone||null, customer_email||null, userId]
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

// =============================================================================
// 3. OFFICE RELOCATION
// =============================================================================
const createOfficeRelocationBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity, fromLocation, toLocation,
    pickupFloor, pickupAccess, dropFloor, dropAccess,
    customer_name, customer_phone, customer_email,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO office_relocation_requests
        (mode, city, from_city, to_city, from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access,
         customer_name, customer_phone, customer_email, user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       pickupFloor||null, pickupAccess||null, dropFloor||null, dropAccess||null,
       customer_name||null, customer_phone||null, customer_email||null, userId]
    );
    await sendConfirmationEmail(rows[0], "Office Relocation");
    return res.status(201).json({
      success: true, message: "Office relocation booking created!",
      booking_id: rows[0].id, booking: rows[0],
    });
  } catch (err) {
    console.error("createOfficeRelocationBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// 4. PACKING
// =============================================================================
const createPackingBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity, fromLocation, toLocation,
    pickupFloor, pickupAccess, dropFloor, dropAccess,
    customer_name, customer_phone, customer_email,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO packing_requests
        (mode, city, from_city, to_city, from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access,
         customer_name, customer_phone, customer_email, user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       pickupFloor||null, pickupAccess||null, dropFloor||null, dropAccess||null,
       customer_name||null, customer_phone||null, customer_email||null, userId]
    );
    await sendConfirmationEmail(rows[0], "Packing Service");
    return res.status(201).json({
      success: true, message: "Packing booking created!",
      booking_id: rows[0].id, booking: rows[0],
    });
  } catch (err) {
    console.error("createPackingBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// 5. STORAGE
// =============================================================================
const createStorageBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity, fromLocation, toLocation,
    pickupFloor, pickupAccess, dropFloor, dropAccess,
    customer_name, customer_phone, customer_email,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO storage_bookings
        (mode, city, from_city, to_city, from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access,
         customer_name, customer_phone, customer_email, user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       pickupFloor||null, pickupAccess||null, dropFloor||null, dropAccess||null,
       customer_name||null, customer_phone||null, customer_email||null, userId]
    );
    await sendConfirmationEmail(rows[0], "Storage Service");
    return res.status(201).json({
      success: true, message: "Storage booking created!",
      booking_id: rows[0].id, booking: rows[0],
    });
  } catch (err) {
    console.error("createStorageBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// 6. VEHICLE TRANSPORT
// =============================================================================
const createVehicleTransportBooking = async (req, res) => {
  const userId = getUserId(req);
  const {
    mode, city, fromCity, toCity, fromLocation, toLocation,
    vehicleType, transportMode,
    customer_name, customer_phone, customer_email,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO vehicle_transport_requests
        (mode, city, from_city, to_city, from_location, to_location,
         vehicle_type, transport_mode,
         customer_name, customer_phone, customer_email, user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
       RETURNING *`,
      [mode||null, city||null, fromCity||null, toCity||null,
       fromLocation||null, toLocation||null,
       vehicleType||null, transportMode||null,
       customer_name||null, customer_phone||null, customer_email||null, userId]
    );
    await sendConfirmationEmail(rows[0], "Vehicle Transport");
    return res.status(201).json({
      success: true, message: "Vehicle transport booking created!",
      booking_id: rows[0].id, booking: rows[0],
    });
  } catch (err) {
    console.error("createVehicleTransportBooking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// WORKER: Get available bookings (unified)
// =============================================================================
const getAvailableBookings = async (req, res) => {
  const workerId = req.workerId;
  try {
    const workerResult = await pool.query(
      "SELECT city, service_category FROM workers WHERE id = $1", [workerId]
    );
    if (!workerResult.rows.length) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const SERVICE_TABLES = [
      { table: "home_shifting_bookings",     service: "Home Shifting",     pickup: "from_place",    destination: "to_place"    },
      { table: "cleaning_bookings",          service: "Cleaning",          pickup: "from_location", destination: "to_location" },
      { table: "office_relocation_requests", service: "Office Relocation", pickup: "from_location", destination: "to_location" },
      { table: "packing_requests",           service: "Packing Unpacking", pickup: "address",       destination: "city"        },
      { table: "storage_bookings",           service: "Storage",           pickup: "address",       destination: "city"        },
      { table: "vehicle_transport_requests", service: "Vehicle Transport", pickup: "from_location", destination: "to_location" },
    ];

    let allBookings = [];
    for (const svc of SERVICE_TABLES) {
      try {
        const { rows } = await pool.query(
          `SELECT id, '${svc.service}' AS service_type, city,
                  ${svc.pickup} AS pickup, ${svc.destination} AS destination,
                  customer_name, customer_phone, status, worker_id, created_at,
                  '${svc.table}' AS source_table
           FROM ${svc.table}
           ORDER BY created_at DESC LIMIT 100`
        );
        allBookings = allBookings.concat(rows);
      } catch (err) {
        console.error(`Query error on ${svc.table}:`, err.message);
      }
    }

    allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ success: true, total: allBookings.length, bookings: allBookings });
  } catch (err) {
    console.error("getAvailableBookings error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// WORKER: Get accepted bookings
// =============================================================================
const getWorkerAcceptedBookings = async (req, res) => {
  const workerId = req.workerId;
  try {
    const { rows } = await pool.query(
      `SELECT id, worker_id, booking_id, service, action, assigned_at
       FROM worker_bookings WHERE worker_id = $1 ORDER BY assigned_at DESC`,
      [workerId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getWorkerAcceptedBookings error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// WORKER: Update booking status
// =============================================================================
const updateWorkerBookingStatus = async (req, res) => {
  const { status, service } = req.body;
  const { id } = req.params;

  const SERVICE_TABLE_MAP = {
    "Home Shifting":       "home_shifting_bookings",
    "Cleaning":            "cleaning_bookings",
    "Office Relocation":   "office_relocation_requests",
    "Packing & Unpacking": "packing_requests",
    "Packing Unpacking":   "packing_requests",
    "Storage":             "storage_bookings",
    "Vehicle Transport":   "vehicle_transport_requests",
  };

  const table = SERVICE_TABLE_MAP[service];
  if (!table) return res.status(400).json({ success: false, message: "Valid service name required." });

  const valid = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be: ${valid.join(", ")}` });
  }

  try {
    await pool.query(`UPDATE ${table} SET status = $1 WHERE id = $2`, [status, id]);
    return res.json({ success: true, message: "Status updated." });
  } catch (err) {
    console.error("updateWorkerBookingStatus error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// GET MY BOOKINGS (customer)
// =============================================================================
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
               CASE WHEN vehicle_type IS NOT NULL AND transport_mode IS NOT NULL THEN ' - ' ELSE '' END,
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

// =============================================================================
// ADMIN ROUTES
// =============================================================================
const getAllBookings = async (req, res) => {
  const { status, city, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = "WHERE 1=1";
  const params = [];
  if (status) { params.push(status); where += ` AND status=$${params.length}`; }
  if (city)   { params.push(city);   where += ` AND city=$${params.length}`; }
  params.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM home_shifting_bookings ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const count = await pool.query(
      `SELECT COUNT(*) FROM home_shifting_bookings ${where}`,
      params.slice(0, -2)
    );
    return res.json({ success: true, total: parseInt(count.rows[0].count), bookings: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM home_shifting_bookings WHERE id=$1", [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Booking not found." });
    return res.json({ success: true, booking: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const valid = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(", ")}` });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE home_shifting_bookings SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Booking not found." });
    return res.json({ success: true, booking: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  createBooking,
  createCleaningBooking,
  createOfficeRelocationBooking,
  createPackingBooking,
  createStorageBooking,
  createVehicleTransportBooking,
  confirmCOD,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getAvailableBookings,
  getWorkerAcceptedBookings,
  updateWorkerBookingStatus,
  getAvailableBookingsByService,
};