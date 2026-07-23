const jwt  = require("jsonwebtoken");
const User = require("../models/userModel");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

// ── Authenticate any logged-in user ──────────────────────────────────────────
exports.authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer "))
      return res.status(401).json({ message: "No token provided." });

    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found." });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// ── Admin-only guard (use after authenticate) ─────────────────────────────────
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Admins only." });
  next();
};