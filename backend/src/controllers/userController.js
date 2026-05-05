const User = require("../models/userModel");

// ── POST /api/users/profile  — upsert profile after login ────────────────────
exports.upsertProfile = async (req, res) => {
  try {
    const { name, email, phone, avatar, provider } = req.body;
    const user = await User.upsertProfile({ name, email, phone, avatar, provider });
    return res.json({ message: "Profile synced.", data: { user } });
  } catch (err) {
    console.error("upsertProfile:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/users/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ data: { user } });
  } catch (err) {
    console.error("getMe:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/users/me ─────────────────────────────────────────────────────────
// Accepts: name, phone, avatar, currentAddress, city, state, pincode, preferredContact
exports.updateMe = async (req, res) => {
  try {
    const {
      name,
      phone,
      avatar,
      currentAddress,
      city,
      state,
      pincode,
      preferredContact,
    } = req.body;

    const user = await User.update(req.user.id, {
      name,
      phone,
      avatar,
      currentAddress,
      city,
      state,
      pincode,
      preferredContact,
    });

    return res.json({ message: "Profile updated.", data: { user } });
  } catch (err) {
    console.error("updateMe:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ═══════════════════════════  ADMIN ROUTES  ══════════════════════════════════

// ── GET /api/users  (admin) ───────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    return res.json({ data: { users } });
  } catch (err) {
    console.error("getAllUsers:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/users/:id  (admin) ───────────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ data: { user } });
  } catch (err) {
    console.error("getUserById:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/users/:id  (admin) ───────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.update(req.params.id, { name, phone, avatar });
    return res.json({ message: "User updated.", data: { user } });
  } catch (err) {
    console.error("updateUser:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── DELETE /api/users/:id  (admin) ────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    await User.delete(req.params.id);
    return res.json({ message: "User deleted." });
  } catch (err) {
    console.error("deleteUser:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/users/stats  (admin) ─────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const { pool } = require("../config/db");
    const [total, admins, verified, providers] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'admin'`),
      pool.query(`SELECT COUNT(*) FROM users WHERE is_verified = TRUE`),
      pool.query(`SELECT provider, COUNT(*) FROM users GROUP BY provider`),
    ]);
    return res.json({
      data: {
        totalUsers:    parseInt(total.rows[0].count),
        adminCount:    parseInt(admins.rows[0].count),
        verifiedUsers: parseInt(verified.rows[0].count),
        byProvider:    providers.rows,
      },
    });
  } catch (err) {
    console.error("getStats:", err);
    res.status(500).json({ message: "Server error." });
  }
};