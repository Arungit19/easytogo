// src/controllers/trackingController.js
const { pool } = require("../config/db");

// ─── Stage definitions per service type ───────────────────────────────────────
const STAGES = {
  home_shifting: [
    { key: "pending",    label: "Order Placed",     icon: "📋" },
    { key: "confirmed",  label: "Confirmed",         icon: "✅" },
    { key: "packing",    label: "Packing Started",   icon: "📦" },
    { key: "loading",    label: "Loading on Truck",  icon: "🚛" },
    { key: "in_transit", label: "In Transit",        icon: "🛣️"  },
    { key: "unloading",  label: "Unloading",         icon: "📤" },
    { key: "unpacking",  label: "Unpacking",         icon: "🏠" },
    { key: "completed",  label: "Delivered",         icon: "🎉" },
  ],
  office_relocation: [
    { key: "pending",    label: "Order Placed",     icon: "📋" },
    { key: "confirmed",  label: "Confirmed",         icon: "✅" },
    { key: "packing",    label: "Packing Office",    icon: "📦" },
    { key: "loading",    label: "Loading",           icon: "🚛" },
    { key: "in_transit", label: "In Transit",        icon: "🛣️"  },
    { key: "unloading",  label: "Unloading",         icon: "📤" },
    { key: "unpacking",  label: "Setup at New Office", icon: "🏢" },
    { key: "completed",  label: "Completed",         icon: "🎉" },
  ],
  vehicle_transport: [
    { key: "pending",          label: "Order Placed",      icon: "📋" },
    { key: "confirmed",        label: "Confirmed",          icon: "✅" },
    { key: "picked_up",        label: "Vehicle Picked Up",  icon: "🚗" },
    { key: "in_transit",       label: "In Transit",         icon: "🛣️"  },
    { key: "out_for_delivery", label: "Out for Delivery",   icon: "📍" },
    { key: "delivered",        label: "Delivered",          icon: "🎉" },
  ],
  cleaning: [
    { key: "pending",           label: "Booking Placed",     icon: "📋" },
    { key: "confirmed",         label: "Confirmed",           icon: "✅" },
    { key: "worker_assigned",   label: "Worker Assigned",     icon: "👷" },
    { key: "worker_on_the_way", label: "Worker On The Way",   icon: "🚶" },
    { key: "arrived",           label: "Worker Arrived",      icon: "📍" },
    { key: "in_progress",       label: "Cleaning In Progress",icon: "🧹" },
    { key: "completed",         label: "Completed",           icon: "🎉" },
  ],
  storage: [
    { key: "pending",           label: "Booking Placed",     icon: "📋" },
    { key: "confirmed",         label: "Confirmed",           icon: "✅" },
    { key: "worker_assigned",   label: "Worker Assigned",     icon: "👷" },
    { key: "worker_on_the_way", label: "Worker On The Way",   icon: "🚶" },
    { key: "arrived",           label: "Worker Arrived",      icon: "📍" },
    { key: "in_progress",       label: "Pickup In Progress",  icon: "📦" },
    { key: "completed",         label: "Stored Successfully", icon: "🎉" },
  ],
  packing: [
    { key: "pending",           label: "Booking Placed",     icon: "📋" },
    { key: "confirmed",         label: "Confirmed",           icon: "✅" },
    { key: "worker_assigned",   label: "Worker Assigned",     icon: "👷" },
    { key: "worker_on_the_way", label: "Worker On The Way",   icon: "🚶" },
    { key: "arrived",           label: "Worker Arrived",      icon: "📍" },
    { key: "in_progress",       label: "Packing In Progress", icon: "📦" },
    { key: "completed",         label: "Completed",           icon: "🎉" },
  ],
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function getStages(serviceType) {
  return STAGES[serviceType] ?? STAGES["cleaning"];
}

// ─── Create tracking session (called when booking is confirmed) ───────────────
exports.createSession = async (req, res) => {
  try {
    const {
      booking_id, service_type, worker_id, user_id,
      origin_lat, origin_lng, origin_address,
      dest_lat, dest_lng, dest_address,
    } = req.body;

    if (!booking_id || !service_type || !user_id)
      return res.status(400).json({ message: "booking_id, service_type, user_id required." });

    // Avoid duplicate sessions
    const exists = await pool.query(
      `SELECT id FROM tracking_sessions WHERE booking_id=$1 AND service_type=$2`,
      [booking_id, service_type]
    );
    if (exists.rowCount > 0)
      return res.status(409).json({ message: "Tracking session already exists.", id: exists.rows[0].id });

    const result = await pool.query(
      `INSERT INTO tracking_sessions
        (booking_id, service_type, worker_id, user_id,
         origin_lat, origin_lng, origin_address,
         dest_lat, dest_lng, dest_address, stage, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending','pending')
       RETURNING *`,
      [booking_id, service_type, worker_id ?? null, user_id,
       origin_lat ?? null, origin_lng ?? null, origin_address ?? null,
       dest_lat ?? null, dest_lng ?? null, dest_address ?? null]
    );

    // Log initial stage
    await pool.query(
      `INSERT INTO tracking_stage_history (tracking_session_id, stage, note, updated_by)
       VALUES ($1, 'pending', 'Booking created', 'system')`,
      [result.rows[0].id]
    );

    return res.status(201).json({ success: true, session: result.rows[0] });
  } catch (err) {
    console.error("[tracking] createSession error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─── Get tracking info (user + admin) ────────────────────────────────────────
exports.getTracking = async (req, res) => {
  try {
    const { booking_id, service_type } = req.params;

    const session = await pool.query(
      `SELECT ts.*,
              w.name  AS worker_name,
              w.phone AS worker_phone
       FROM   tracking_sessions ts
       LEFT JOIN workers w ON w.id = ts.worker_id
       WHERE  ts.booking_id  = $1
         AND  ts.service_type = $2`,
      [booking_id, service_type]
    );

    if (session.rowCount === 0)
      return res.status(404).json({ message: "Tracking not found." });

    const s = session.rows[0];
    const stages = getStages(s.service_type);
    const currentIdx = stages.findIndex((st) => st.key === s.stage);

    // Last 50 location breadcrumbs
    const history = await pool.query(
      `SELECT lat, lng, address, recorded_at
       FROM   tracking_location_history
       WHERE  tracking_session_id = $1
       ORDER  BY recorded_at DESC
       LIMIT  50`,
      [s.id]
    );

    // Stage history
    const stageHistory = await pool.query(
      `SELECT stage, note, updated_by, changed_at
       FROM   tracking_stage_history
       WHERE  tracking_session_id = $1
       ORDER  BY changed_at ASC`,
      [s.id]
    );

    return res.json({
      success: true,
      session: s,
      stages,
      currentStageIndex: currentIdx,
      locationHistory: history.rows,
      stageHistory: stageHistory.rows,
    });
  } catch (err) {
    console.error("[tracking] getTracking error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─── Update stage (admin or worker) ─────────────────────────────────────────
exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params; // tracking_session id
    const { stage, note, updated_by = "admin" } = req.body;

    const session = await pool.query(
      `SELECT * FROM tracking_sessions WHERE id=$1`, [id]
    );
    if (session.rowCount === 0)
      return res.status(404).json({ message: "Session not found." });

    const s = session.rows[0];
    const stages = getStages(s.service_type);
    const validKeys = stages.map((st) => st.key);

    if (!validKeys.includes(stage))
      return res.status(400).json({ message: `Invalid stage. Valid: ${validKeys.join(", ")}` });

    const isCompleted = stage === "completed";
    await pool.query(
      `UPDATE tracking_sessions
       SET stage=$1, status=$2,
           started_at   = CASE WHEN stage='pending' AND $1 != 'pending' THEN NOW() ELSE started_at END,
           completed_at = CASE WHEN $1='completed' THEN NOW() ELSE NULL END,
           updated_at   = NOW()
       WHERE id=$3`,
      [stage, isCompleted ? "completed" : "active", id]
    );

    await pool.query(
      `INSERT INTO tracking_stage_history (tracking_session_id, stage, note, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [id, stage, note ?? null, updated_by]
    );

    return res.json({ success: true, stage });
  } catch (err) {
    console.error("[tracking] updateStage error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─── Update live location (worker sends this every ~10s) ─────────────────────
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params; // tracking_session id
    const { lat, lng, address, eta_minutes } = req.body;

    if (lat === undefined || lng === undefined || lat === null || lng === null)
      return res.status(400).json({ message: "lat and lng required." });

    const session = await pool.query(
      `SELECT worker_id FROM tracking_sessions WHERE id=$1`,
      [id]
    );
    if (session.rowCount === 0)
      return res.status(404).json({ message: "Session not found." });
    if (String(session.rows[0].worker_id) !== String(req.workerId))
      return res.status(403).json({ message: "This tracking session belongs to another worker." });

    await pool.query(
      `UPDATE tracking_sessions
       SET current_lat=$1, current_lng=$2, current_address=$3,
           eta_minutes=$4, updated_at=NOW()
       WHERE id=$5`,
      [lat, lng, address ?? null, eta_minutes ?? null, id]
    );

    // Save to history (every update)
    await pool.query(
      `INSERT INTO tracking_location_history (tracking_session_id, lat, lng, address)
       VALUES ($1, $2, $3, $4)`,
      [id, lat, lng, address ?? null]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("[tracking] updateLocation error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─── Admin: get all active tracking sessions ─────────────────────────────────
exports.getAllActiveSessions = async (req, res) => {
  try {
    const { service_type, status = "active" } = req.query;

    let query = `
      SELECT ts.*, w.name AS worker_name, w.phone AS worker_phone
      FROM   tracking_sessions ts
      LEFT JOIN workers w ON w.id = ts.worker_id
      WHERE  ts.status != 'completed'
    `;
    const params = [];

    if (service_type) {
      params.push(service_type);
      query += ` AND ts.service_type = $${params.length}`;
    }

    query += ` ORDER BY ts.updated_at DESC`;

    const result = await pool.query(query, params);
    return res.json({ success: true, sessions: result.rows });
  } catch (err) {
    console.error("[tracking] getAllActiveSessions error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─── Assign worker to session ─────────────────────────────────────────────────
exports.assignWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { worker_id } = req.body;

    if (!worker_id)
      return res.status(400).json({ message: "worker_id required." });

    await pool.query(
      `UPDATE tracking_sessions SET worker_id=$1, updated_at=NOW() WHERE id=$2`,
      [worker_id, id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("[tracking] assignWorker error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─── Export stages (for frontend to consume) ─────────────────────────────────
exports.getStagesForService = (req, res) => {
  const { service_type } = req.params;
  const stages = getStages(service_type);
  return res.json({ success: true, stages });
};
