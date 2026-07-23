// src/middlewares/workerAuthMiddleware.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "homeease_secret_2024";

const workerAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "worker") {
      return res.status(403).json({ success: false, message: "Access denied. Workers only." });
    }
    req.workerId = decoded.id;
    req.workerEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// Admin auth (uses same JWT but checks admin role OR master key)
const adminAuth = (req, res, next) => {
  // Allow master key for admin panel
  const masterKey = req.headers["x-admin-key"];
  if (masterKey && masterKey === (process.env.ADMIN_MASTER_KEY || "homeease_admin_2024")) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Admin auth required." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access only." });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

module.exports = { workerAuth, adminAuth };