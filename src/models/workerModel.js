// src/models/workerModel.js
const { pool } = require("/config/db");

// ── Create workers table if not exists ─────────────────────────────────────
const createWorkersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workers (
      id               SERIAL PRIMARY KEY,
      name             VARCHAR(150) NOT NULL,
      email            VARCHAR(200) NOT NULL UNIQUE,
      phone            VARCHAR(15)  NOT NULL UNIQUE,
      password         TEXT         NOT NULL,
      service_category VARCHAR(100) NOT NULL,
      city             VARCHAR(100) NOT NULL,
      avail_from       VARCHAR(10)  DEFAULT '09:00',
      avail_to         VARCHAR(10)  DEFAULT '18:00',
      status           VARCHAR(20)  DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected')),
      is_available     BOOLEAN      DEFAULT true,
      rejection_reason TEXT,
      approved_at      TIMESTAMPTZ,
      last_login       TIMESTAMPTZ,
      created_at       TIMESTAMPTZ  DEFAULT NOW(),
      updated_at       TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS worker_declined_bookings (
      worker_id   INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      booking_id  INTEGER NOT NULL,
      declined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (worker_id, booking_id)
    );

    CREATE TABLE IF NOT EXISTS admin_notifications (
      id         SERIAL PRIMARY KEY,
      type       VARCHAR(50),
      title      TEXT,
      message    TEXT,
      data       JSONB,
      is_read    BOOLEAN     DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};

// ── Register worker ────────────────────────────────────────────────────────
const createWorker = async ({ name, email, phone, password, serviceCategory, city, availFrom, availTo }) => {
  const result = await pool.query(
    `INSERT INTO workers
       (name, email, phone, password, service_category, city, avail_from, avail_to)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, name, email, phone, service_category, city, avail_from, avail_to, status, created_at`,
    [name, email.toLowerCase(), phone, password, serviceCategory, city,
     availFrom || "09:00", availTo || "18:00"]
  );
  return result.rows[0];
};

// ── Find by email ──────────────────────────────────────────────────────────
const findWorkerByEmail = async (email) => {
  const result = await pool.query(
    "SELECT * FROM workers WHERE email = $1",
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
};

// ── Find by email OR phone (for duplicate check) ───────────────────────────
const findWorkerByEmailOrPhone = async (email, phone) => {
  const result = await pool.query(
    "SELECT id FROM workers WHERE email = $1 OR phone = $2",
    [email.toLowerCase(), phone]
  );
  return result.rows[0] || null;
};

// ── Update last login ──────────────────────────────────────────────────────
const updateWorkerLogin = async (id) => {
  await pool.query("UPDATE workers SET last_login = NOW() WHERE id = $1", [id]);
};

// ── Get all workers (admin) ────────────────────────────────────────────────
const getAllWorkers = async () => {
  const result = await pool.query(
    `SELECT
       w.id, w.name, w.email, w.phone, w.service_category, w.city,
       w.avail_from, w.avail_to, w.status, w.is_available,
       w.rejection_reason, w.approved_at, w.last_login, w.created_at,
       COALESCE(
         (SELECT COUNT(*) FROM bookings WHERE worker_id = w.id AND status = 'confirmed'), 0
       ) AS confirmed_count,
       COALESCE(
         (SELECT COUNT(*) FROM bookings WHERE worker_id = w.id AND status = 'completed'), 0
       ) AS completed_count
     FROM workers w
     ORDER BY
       CASE w.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
       w.created_at DESC`
  );
  return result.rows;
};

// ── Get worker by id ───────────────────────────────────────────────────────
const getWorkerById = async (id) => {
  const result = await pool.query("SELECT * FROM workers WHERE id = $1", [id]);
  return result.rows[0] || null;
};

// ── Approve worker ─────────────────────────────────────────────────────────
const approveWorker = async (id) => {
  const result = await pool.query(
    `UPDATE workers SET status = 'approved', approved_at = NOW()
     WHERE id = $1 RETURNING id, name, email, status`,
    [id]
  );
  return result.rows[0] || null;
};

// ── Reject worker ──────────────────────────────────────────────────────────
const rejectWorker = async (id, reason) => {
  const result = await pool.query(
    `UPDATE workers SET status = 'rejected', rejection_reason = $1
     WHERE id = $2 RETURNING id, name, email, status`,
    [reason || "Rejected by admin", id]
  );
  return result.rows[0] || null;
};

// ── Delete worker ──────────────────────────────────────────────────────────
const deleteWorker = async (id) => {
  await pool.query("DELETE FROM workers WHERE id = $1", [id]);
};

// ── Toggle availability ────────────────────────────────────────────────────
const setWorkerAvailability = async (id, isAvailable) => {
  await pool.query("UPDATE workers SET is_available = $1 WHERE id = $2", [isAvailable, id]);
};

// ── Get bookings for worker (time-filtered) ────────────────────────────────
const getBookingsForWorker = async (worker) => {
  // Try unified bookings table first
  try {
    const result = await pool.query(
      `SELECT
         b.id, b.service_category AS "serviceType",
         b.service_type AS "serviceSubType",
         b.booking_time AS "bookingTime",
         b.preferred_time AS "scheduledTime",
         b.status,
         b.city, b.from_location AS address, b.to_location AS location,
         b.amount, b.description,
         b.customer_name AS "customerName",
         b.customer_phone AS "customerPhone",
         b.confirmed_by AS "confirmedBy",
         b.worker_id,
         b.created_at
       FROM bookings b
       WHERE (
         b.status = 'pending'
         OR (b.status IN ('confirmed','completed') AND b.worker_id = $1)
       )
       AND (b.service_category ILIKE $2 OR $2 = '')
       AND (b.city ILIKE $3 OR $3 = '')
       AND b.id NOT IN (
         SELECT booking_id FROM worker_declined_bookings WHERE worker_id = $1
       )
       ORDER BY b.created_at DESC
       LIMIT 100`,
      [worker.id, `%${worker.service_category || ""}%`, `%${worker.city || ""}%`]
    );
    return result.rows;
  } catch {
    return [];
  }
};

// ── Accept booking ─────────────────────────────────────────────────────────
const acceptBooking = async (bookingId, workerId, workerName) => {
  // Check if taken
  const check = await pool.query(
    "SELECT status, worker_id FROM bookings WHERE id = $1",
    [bookingId]
  );
  if (!check.rows.length) return { error: "Booking not found" };

  const b = check.rows[0];
  if (b.status === "confirmed" && b.worker_id !== workerId) {
    return { error: "Already taken by another worker" };
  }

  const result = await pool.query(
    `UPDATE bookings
     SET status = 'confirmed', worker_id = $1, confirmed_by = $2, confirmed_at = NOW()
     WHERE id = $3 AND (status = 'pending' OR worker_id = $1)
     RETURNING *`,
    [workerId, workerName, bookingId]
  );
  if (!result.rows.length) return { error: "Booking was just taken by another worker" };
  return { data: result.rows[0] };
};

// ── Decline booking (soft) ─────────────────────────────────────────────────
const declineBooking = async (bookingId, workerId) => {
  await pool.query(
    `INSERT INTO worker_declined_bookings (worker_id, booking_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [workerId, bookingId]
  );
};

// ── Admin notification ─────────────────────────────────────────────────────
const createAdminNotification = async ({ type, title, message, data }) => {
  await pool.query(
    `INSERT INTO admin_notifications (type, title, message, data)
     VALUES ($1, $2, $3, $4)`,
    [type, title, message, JSON.stringify(data)]
  );
};

const getAdminNotifications = async () => {
  const result = await pool.query(
    "SELECT * FROM admin_notifications WHERE is_read = false ORDER BY created_at DESC LIMIT 50"
  );
  return result.rows;
};

const markNotificationRead = async (workerId) => {
  await pool.query(
    `UPDATE admin_notifications SET is_read = true
     WHERE data->>'workerId' = $1`,
    [String(workerId)]
  );
};

module.exports = {
  createWorkersTable,
  createWorker,
  findWorkerByEmail,
  findWorkerByEmailOrPhone,
  updateWorkerLogin,
  getAllWorkers,
  getWorkerById,
  approveWorker,
  rejectWorker,
  deleteWorker,
  setWorkerAvailability,
  getBookingsForWorker,
  acceptBooking,
  declineBooking,
  createAdminNotification,
  getAdminNotifications,
  markNotificationRead,
};