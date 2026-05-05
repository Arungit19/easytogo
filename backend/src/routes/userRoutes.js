const express  = require("express");
const router   = express.Router();
const userCtrl = require("../controllers/userController");
const { authenticate, adminOnly } = require("../middlewares/authMiddleware");

// ── Current user ──────────────────────────────────────────────────────────────
router.post("/profile", authenticate, userCtrl.upsertProfile);  // sync after login
router.get ("/me",      authenticate, userCtrl.getMe);          // fetch profile
router.put ("/me",      authenticate, userCtrl.updateMe);       // update profile

// ── Admin-only ────────────────────────────────────────────────────────────────
router.get   ("/stats", authenticate, adminOnly, userCtrl.getStats);
router.get   ("/",      authenticate, adminOnly, userCtrl.getAllUsers);
router.get   ("/:id",   authenticate, adminOnly, userCtrl.getUserById);
router.put   ("/:id",   authenticate, adminOnly, userCtrl.updateUser);
router.delete("/:id",   authenticate, adminOnly, userCtrl.deleteUser);

module.exports = router;