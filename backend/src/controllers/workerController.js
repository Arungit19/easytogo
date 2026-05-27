// src/controllers/workerController.js

// dotenv MUST load first — before anything reads process.env
require("dotenv").config();

const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { pool }   = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "homeease_secret_2024";

// Transporter created AFTER dotenv so EMAIL_USER / EMAIL_PASS are already set
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Helper: get readable IST timestamp ───────────────────────────────────────
const nowIST = () =>
  new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

// ── Helper: extract client IP from request ────────────────────────────────────
const getIP = (req) =>
  (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .toString()
    .split(",")[0]
    .trim();

// ── Service → DB Table mapping (used in multiple functions) ──────────────────
const SERVICE_TABLE_MAP = {
  "Home Shifting":       "home_shifting_bookings",
  "Cleaning":            "cleaning_bookings",
  "Office Relocation":   "office_relocation_requests",
  "Packing & Unpacking": "packing_requests",
  "Storage":             "storage_bookings",
  "Vehicle Transport":   "vehicle_transport_requests",
};

const SERVICE_TRACKING_CONFIG = {
  "Home Shifting":       { key: "home_shifting",      origin: "from_place",    destination: "to_place" },
  "Cleaning":            { key: "cleaning",           origin: "from_location", destination: "to_location" },
  "Office Relocation":   { key: "office_relocation",  origin: "from_location", destination: "to_location" },
  "Packing & Unpacking": { key: "packing",            origin: "address",       destination: "city" },
  "Storage":             { key: "storage",            origin: "address",       destination: "city" },
  "Vehicle Transport":   { key: "vehicle_transport",  origin: "from_location", destination: "to_location" },
};

// ── Helper: Send activity alert email to worker ───────────────────────────────
const sendWorkerActivityAlert = async ({ to, name, type, time, ip }) => {
  const isRegister = type === "register";

  const subject = isRegister
    ? "EasyToGo Worker — Registration Received"
    : "EasyToGo Worker — New Login on Your Account";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:28px 32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">EasyToGo</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Worker Portal</p>
      </div>
      <div style="padding:28px 32px;background:#ffffff;">
        <p style="font-size:15px;color:#1f2937;">Hi <strong>${name || "there"}</strong>,</p>
        ${isRegister ? `
          <p style="font-size:14px;color:#374151;line-height:1.6;">
            Your <strong>worker account has been successfully created</strong> on EasyToGo.
            Our admin team will review your application and approve your account shortly.
          </p>
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:18px 0;">
            <p style="font-size:13px;color:#92400e;margin:0;">
              Status: <strong>Pending Approval</strong><br/>
              You will receive another email once your account is approved by the admin.
            </p>
          </div>
        ` : `
          <p style="font-size:14px;color:#374151;line-height:1.6;">
            A <strong>new login</strong> was detected on your EasyToGo worker account.
          </p>
        `}
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0;">
          <table style="width:100%;font-size:13px;color:#4b5563;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-weight:600;color:#111827;width:40%;">Action</td>
              <td style="padding:6px 0;">${isRegister ? "New Worker Registration" : "Worker Login"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-weight:600;color:#111827;">Account</td>
              <td style="padding:6px 0;">${to}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-weight:600;color:#111827;">Time</td>
              <td style="padding:6px 0;">${time}</td>
            </tr>
            ${ip ? `<tr>
              <td style="padding:6px 0;font-weight:600;color:#111827;">IP Address</td>
              <td style="padding:6px 0;">${ip}</td>
            </tr>` : ""}
          </table>
        </div>
        ${!isRegister ? `
          <p style="font-size:13px;color:#6b7280;line-height:1.6;">
            If this was <strong>not you</strong>, please change your password immediately and contact support.
          </p>
        ` : ""}
      </div>
      <div style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          EasyToGo Worker Portal — Automated Security Alert. Do not reply.
        </p>
      </div>
    </div>
  `;

  try {
    console.log(`[WorkerAlert] Sending ${type} email to ${to}...`);
    const info = await transporter.sendMail({
      from: `"EasyToGo Worker Portal" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[WorkerAlert] ✅ Email sent to ${to} — MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[WorkerAlert] ❌ Failed to send ${type} email to ${to}:`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    console.error(`   Response: ${err.response}`);
  }
};

// ── Helper: sign JWT token ────────────────────────────────────────────────────
function signToken(worker) {
  return jwt.sign(
    { id: worker.id, email: worker.email, role: "worker" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// =============================================================================
// REGISTER
// =============================================================================
const register = async (req, res) => {
  const { name, email, phone, serviceCategory, city, availFrom, availTo, password } = req.body;

  if (!name || !email || !phone || !serviceCategory || !city || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM workers WHERE email = $1", [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Email already registered." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO workers (name, email, phone, password, service_category, city, avail_from, avail_to, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id`,
      [name, email.toLowerCase(), phone, hashed, serviceCategory, city, availFrom || "09:00", availTo || "18:00"]
    );

    // Fire registration alert — not awaited so response is instant
    sendWorkerActivityAlert({ to: email, name, type: "register", time: nowIST(), ip: getIP(req) });

    return res.status(201).json({
      success: true,
      message: "Registration successful! Awaiting admin approval.",
      data: { workerId: result.rows[0].id }
    });
  } catch (err) {
    console.error("Worker register error:", err);
    return res.status(500).json({ success: false, message: "Server error. Try again." });
  }
};

// =============================================================================
// LOGIN
// =============================================================================
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM workers WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const worker = result.rows[0];

    if (worker.status === "pending") {
      return res.status(403).json({ success: false, message: "Your account is pending admin approval." });
    }
    if (worker.status === "rejected") {
      return res.status(403).json({ success: false, message: "Your account has been rejected. Contact support." });
    }

    const match = await bcrypt.compare(password, worker.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = signToken(worker);

    // Fire login alert — not awaited so response is instant
    sendWorkerActivityAlert({ to: worker.email, name: worker.name, type: "login", time: nowIST(), ip: getIP(req) });

    const safeWorker = {
      id:              worker.id,
      name:            worker.name,
      email:           worker.email,
      phone:           worker.phone,
      serviceCategory: worker.service_category,
      city:            worker.city,
      availability:    `${worker.avail_from}-${worker.avail_to}`,
      status:          worker.status,
      rating:          worker.rating,
      totalJobs:       worker.total_jobs,
    };

    return res.json({ success: true, message: "Login successful.", data: { token, worker: safeWorker } });
  } catch (err) {
    console.error("Worker login error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// GET PROFILE
// =============================================================================
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, service_category, city, avail_from, avail_to,
              status, rating, total_jobs, created_at
       FROM workers WHERE id = $1`,
      [req.workerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }
    const w = result.rows[0];
    return res.json({ success: true, data: { ...w, availability: `${w.avail_from}-${w.avail_to}` } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// ADMIN: Get all workers
// =============================================================================
const getAllWorkers = async (req, res) => {
  try {
    const status = req.query.status || null;
    let query = `SELECT id, name, email, phone, service_category, city, avail_from, avail_to,
                        status, rating, total_jobs, created_at FROM workers`;
    const params = [];
    if (status) { query += " WHERE status = $1"; params.push(status); }
    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// ADMIN: Approve / Reject worker
// =============================================================================
const updateWorkerStatus = async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'." });
  }

  try {
    const result = await pool.query(
      "UPDATE workers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email",
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const { name, email } = result.rows[0];
    if (email) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:${status === "approved"
            ? "linear-gradient(135deg,#059669,#10b981)"
            : "linear-gradient(135deg,#dc2626,#ef4444)"};padding:28px 32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;">EasyToGo Worker Portal</h1>
          </div>
          <div style="padding:28px 32px;background:#fff;">
            <p style="font-size:15px;color:#1f2937;">Hi <strong>${name}</strong>,</p>
            ${status === "approved"
              ? `<p style="font-size:14px;color:#374151;line-height:1.6;">🎉 Congratulations! Your worker account has been <strong>approved</strong>. You can now log in and start accepting bookings.</p>`
              : `<p style="font-size:14px;color:#374151;line-height:1.6;">Your worker account application has been <strong>rejected</strong>. Please contact support for more information.</p>`
            }
          </div>
          <div style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">EasyToGo Worker Portal — Automated Notification</p>
          </div>
        </div>
      `;
      transporter.sendMail({
        from: `"EasyToGo Worker Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: status === "approved"
          ? "EasyToGo — Your Worker Account is Approved! 🎉"
          : "EasyToGo — Worker Account Application Update",
        html,
      }).catch(err => console.error("[WorkerAlert] Approval email failed:", err.message));
    }

    return res.json({ success: true, message: `Worker ${status} successfully.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// ADMIN: Delete worker
// =============================================================================
const deleteWorker = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM workers WHERE id = $1", [id]);
    return res.json({ success: true, message: "Worker deleted." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// WORKER: Accept Booking  ← MAIN FIX
// Flow:
//   1. Check booking exists aur already accepted nahi hai
//   2. Service table mein worker_id + status = 'confirmed' UPDATE karo
//   3. worker_bookings history table mein INSERT karo
//   4. Worker ka total_jobs increment karo
// =============================================================================
const acceptBooking = async (req, res) => {
  const { bookingId, booking_id, service } = req.body;
  const workerId = req.workerId;

  // bookingId ya booking_id dono accept karo
  const bId = bookingId || booking_id;

  if (!bId || !service) {
    return res.status(400).json({
      success: false,
      message: "bookingId aur service dono required hain.",
    });
  }

  const table = SERVICE_TABLE_MAP[service];
  const trackingConfig = SERVICE_TRACKING_CONFIG[service];
  if (!table) {
    return res.status(400).json({
      success: false,
      message: `Unknown service: "${service}". Valid: ${Object.keys(SERVICE_TABLE_MAP).join(", ")}`,
    });
  }

  try {
    // ── Step 1: Booking exist karti hai? Already accepted hai? ───────────────
    const originCol = trackingConfig?.origin || "NULL";
    const destCol = trackingConfig?.destination || "NULL";
    const check = await pool.query(
      `SELECT id, worker_id, status, user_id,
              ${originCol} AS origin_address,
              ${destCol} AS dest_address
       FROM ${table}
       WHERE id = $1`,
      [bId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Booking #${bId} not found in ${service}.`,
      });
    }

    const existing = check.rows[0];

    // Kisi aur ne already accept kar liya
    if (
      existing.worker_id !== null &&
      existing.worker_id !== undefined &&
      String(existing.worker_id) !== String(workerId)
    ) {
      return res.status(409).json({
        success: false,
        message: "Yeh booking pehle se kisi aur worker ne accept kar li hai.",
      });
    }

    // ── Step 2: Service table mein worker_id SET karo ← YEH MAIN FIX HAI ───
    // Pehle updated_at column check karo — agar nahi hai to without it update karo
    let updateQuery;
    try {
      await pool.query(
        `UPDATE ${table}
         SET worker_id = $1,
             status    = 'confirmed',
             updated_at = NOW()
         WHERE id = $2`,
        [workerId, bId]
      );
    } catch (colErr) {
      // updated_at column nahi hai — without it retry karo
      if (colErr.message.includes("updated_at")) {
        await pool.query(
          `UPDATE ${table}
           SET worker_id = $1,
               status    = 'confirmed'
           WHERE id = $2`,
          [workerId, bId]
        );
      } else {
        throw colErr; // koi aur error hai — rethrow
      }
    }

    console.log(`[acceptBooking] ✅ ${service} #${bId} → worker ${workerId} assigned, status=confirmed`);

    let trackingSession = null;
    if (trackingConfig) {
      try {
        const stage = ["cleaning", "storage", "packing"].includes(trackingConfig.key)
          ? "worker_assigned"
          : "confirmed";
        const upsert = await pool.query(
          `INSERT INTO tracking_sessions
             (booking_id, service_type, worker_id, user_id,
              origin_address, dest_address, stage, status, started_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
           ON CONFLICT (booking_id, service_type)
           DO UPDATE SET
             worker_id = EXCLUDED.worker_id,
             user_id = COALESCE(tracking_sessions.user_id, EXCLUDED.user_id),
             origin_address = COALESCE(tracking_sessions.origin_address, EXCLUDED.origin_address),
             dest_address = COALESCE(tracking_sessions.dest_address, EXCLUDED.dest_address),
             stage = CASE
               WHEN tracking_sessions.stage = 'pending' THEN EXCLUDED.stage
               ELSE tracking_sessions.stage
             END,
             status = CASE
               WHEN tracking_sessions.status = 'completed' THEN tracking_sessions.status
               ELSE 'active'
             END,
             started_at = COALESCE(tracking_sessions.started_at, NOW()),
             updated_at = NOW()
           RETURNING *`,
          [
            bId,
            trackingConfig.key,
            workerId,
            existing.user_id || null,
            existing.origin_address || null,
            existing.dest_address || null,
            stage,
          ]
        );

        trackingSession = upsert.rows[0];

        await pool.query(
          `INSERT INTO tracking_stage_history (tracking_session_id, stage, note, updated_by)
           VALUES ($1, $2, 'Worker accepted booking', 'worker')`,
          [trackingSession.id, stage]
        );
      } catch (trackingErr) {
        console.warn("[acceptBooking] tracking session upsert failed (non-fatal):", trackingErr.message);
      }
    }

    // ── Step 3: worker_bookings history mein insert karo ────────────────────
    try {
      await pool.query(
        `INSERT INTO worker_bookings (worker_id, booking_id, service, action)
         VALUES ($1, $2, $3, 'accepted')
         ON CONFLICT DO NOTHING`,
        [workerId, bId, service]
      );
    } catch (histErr) {
      // History insert fail ho to bhi main accept successful hai — sirf log karo
      console.warn("[acceptBooking] worker_bookings insert failed (non-fatal):", histErr.message);
    }

    // ── Step 4: Worker ka total_jobs increment karo ──────────────────────────
    try {
      await pool.query(
        `UPDATE workers
         SET total_jobs = COALESCE(total_jobs, 0) + 1
         WHERE id = $1`,
        [workerId]
      );
    } catch (jobErr) {
      console.warn("[acceptBooking] total_jobs update failed (non-fatal):", jobErr.message);
    }

    return res.status(200).json({
      success:   true,
      message:   "Booking successfully accepted!",
      bookingId: bId,
      service,
      workerId,
      status:    "confirmed",
      trackingSession,
      trackingSessionId: trackingSession?.id || null,
      trackingServiceType: trackingConfig?.key || null,
      trackingUrl: trackingConfig?.key ? `/tracking/${bId}/${trackingConfig.key}` : null,
    });

  } catch (err) {
    console.error("[acceptBooking] ❌ Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error: " + err.message,
    });
  }
};

// =============================================================================
// WORKER: Get my accepted bookings
// =============================================================================
const getMyBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, worker_id, booking_id, service, action, assigned_at
       FROM worker_bookings
       WHERE worker_id = $1
       ORDER BY assigned_at DESC`,
      [req.workerId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getMyBookings error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// WORKER: Update profile
// =============================================================================
const updateProfile = async (req, res) => {
  const workerId = req.workerId;
  const {
    name, city, address, serviceCategory, experience,
    availability, bio, aadhaarNumber, panNumber,
    vehicleType, emergencyContact, availFrom, availTo,
  } = req.body;

  try {
    // Parse availability string "HH:MM - HH:MM" if availFrom/availTo not separate
    let aFrom = availFrom;
    let aTo   = availTo;
    if (!aFrom && availability) {
      const match = availability.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
      if (match) { aFrom = match[1]; aTo = match[2]; }
    }

    await pool.query(
      `UPDATE workers SET
        name             = COALESCE($1,  name),
        city             = COALESCE($2,  city),
        service_category = COALESCE($3,  service_category),
        avail_from       = COALESCE($4,  avail_from),
        avail_to         = COALESCE($5,  avail_to),
        updated_at       = NOW()
       WHERE id = $6`,
      [name || null, city || null, serviceCategory || null, aFrom || null, aTo || null, workerId]
    );

    return res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// WORKER: Update availability
// =============================================================================
const updateAvailability = async (req, res) => {
  const workerId = req.workerId;
  const { availFrom, availTo, availability } = req.body;

  let aFrom = availFrom;
  let aTo   = availTo;

  // Parse "HH:MM - HH:MM" string if separate values not given
  if (!aFrom && availability) {
    const match = availability.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (match) { aFrom = match[1]; aTo = match[2]; }
  }

  if (!aFrom || !aTo) {
    return res.status(400).json({ success: false, message: "availFrom aur availTo required hain." });
  }

  try {
    await pool.query(
      `UPDATE workers SET avail_from = $1, avail_to = $2, updated_at = NOW() WHERE id = $3`,
      [aFrom, aTo, workerId]
    );
    return res.json({
      success: true,
      message: "Availability updated.",
      availability: `${aFrom} - ${aTo}`,
    });
  } catch (err) {
    console.error("updateAvailability error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  register,
  login,
  getProfile,
  getAllWorkers,
  updateWorkerStatus,
  deleteWorker,
  acceptBooking,
  getMyBookings,
  updateProfile,
  updateAvailability,
};
