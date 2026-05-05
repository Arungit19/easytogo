// dotenv MUST load first — before anything reads process.env
require("dotenv").config();

const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { pool }   = require("../config/db");
const User       = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

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

// ── Helper: Send login/register activity alert email ─────────────────────────
// Sends a security notification to the user whenever they register or log in.
// Non-blocking — errors are only logged, they never break the main flow.
const sendActivityAlert = async ({ to, name, type, time, ip }) => {
  const isRegister = type === "register";

  const subject = isRegister
    ? "Welcome to EasyToGo — Account Created Successfully"
    : "EasyToGo — New Login Detected on Your Account";

  const actionLine = isRegister
    ? "Your account has been <strong>successfully created</strong> on EasyToGo."
    : "A <strong>new login</strong> was detected on your EasyToGo account.";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#c0392b,#e74c3c);padding:28px 32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">EasyToGo</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">
          ${isRegister ? "Account Registration Alert" : "Login Activity Alert"}
        </p>
      </div>
      <div style="padding:28px 32px;background:#ffffff;">
        <p style="font-size:15px;color:#1f2937;">Hi <strong>${name || "there"}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;">${actionLine}</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0;">
          <table style="width:100%;font-size:13px;color:#4b5563;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-weight:600;color:#111827;width:40%;">Action</td>
              <td style="padding:6px 0;">${isRegister ? "New Account Created" : "Login"}</td>
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
        ${!isRegister
          ? `<p style="font-size:13px;color:#6b7280;line-height:1.6;">If this was <strong>not you</strong>, please change your password immediately and contact our support team.</p>`
          : `<p style="font-size:13px;color:#6b7280;line-height:1.6;">If you did not create this account, please contact our support team immediately.</p>`
        }
      </div>
      <div style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          This is an automated security alert from EasyToGo. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    console.log(`[ActivityAlert] Sending ${type} email to ${to}...`);
    const info = await transporter.sendMail({
      from: `"EasyToGo Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[ActivityAlert] ✅ Email sent to ${to} — MessageId: ${info.messageId}`);
  } catch (err) {
    // Log full error so we can debug — but never block login/register
    console.error(`[ActivityAlert] ❌ Failed to send ${type} email to ${to}:`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    console.error(`   Response: ${err.response}`);
  }
};

// ── OTP Email ─────────────────────────────────────────────────────────────────
const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"EasyToGo" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    html: `<h2>Your OTP: <strong>${otp}</strong></h2><p>Valid for 10 minutes.</p>`,
  });
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const safeUser = (u) => ({
  id:          u.id,
  name:        u.name,
  email:       u.email,
  phone:       u.phone,
  avatar:      u.avatar,
  role:        u.role,
  provider:    u.provider,
  is_verified: u.is_verified,
});

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required." });

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: "Email already registered." });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hash });

    // Fire registration alert — intentionally not awaited so response is instant
    sendActivityAlert({ to: email, name, type: "register", time: nowIST(), ip: getIP(req) });

    return res.status(201).json({ message: "Registered successfully.", data: { user: safeUser(user) } });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── Password Login ────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = (email || phone || "").trim();

    console.log("Login attempt:", identifier);

    if (!identifier || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findByEmailOrPhone(identifier);
    console.log("User found:", user ? `${user.email} | role:${user.role}` : "NOT FOUND");

    if (!user) return res.status(401).json({ message: "No account found with this email." });
    if (!user.password) return res.status(401).json({ message: "This account uses social login. Please use Google or Facebook." });

    const match = await bcrypt.compare(password, user.password);
    console.log("Password match:", match);

    if (!match) return res.status(401).json({ message: "Incorrect password." });

    const token = generateToken(user);

    // Fire login alert — intentionally not awaited so response is instant
    if (user.email) {
      sendActivityAlert({ to: user.email, name: user.name, type: "login", time: nowIST(), ip: getIP(req) });
    }

    return res.json({ message: "Login successful.", data: { token, user: safeUser(user) } });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ── Send OTP ──────────────────────────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const identifier = email || phone;
    if (!identifier) return res.status(400).json({ message: "Email or phone required." });

    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(`DELETE FROM otps WHERE identifier = $1`, [identifier]);
    await pool.query(
      `INSERT INTO otps (identifier, otp, expires_at) VALUES ($1, $2, $3)`,
      [identifier, otp, expiresAt]
    );

    if (email) {
      await sendOtpEmail(email, otp);
    } else {
      console.log(`OTP for ${phone}: ${otp}`);
    }

    return res.json({ message: `OTP sent to ${identifier}.` });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ message: "Failed to send OTP: " + err.message });
  }
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;
    const identifier = email || phone;
    if (!identifier || !otp)
      return res.status(400).json({ message: "Identifier and OTP required." });

    const { rows } = await pool.query(
      `SELECT * FROM otps
       WHERE identifier = $1 AND otp = $2 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [identifier, otp]
    );

    if (!rows.length) return res.status(400).json({ message: "Invalid or expired OTP." });

    await pool.query(`DELETE FROM otps WHERE identifier = $1`, [identifier]);

    let user = await User.findByEmailOrPhone(identifier);
    const isNewUser = !user;

    if (!user) {
      user = await User.create({ name: "", email: email || null, phone: phone || null, password: null });
    }
    await User.verify(identifier);
    user = await User.findById(user.id);

    const token = generateToken(user);

    // Fire activity alert for OTP-based login or new registration
    if (email) {
      sendActivityAlert({
        to: email, name: user.name || "User",
        type: isNewUser ? "register" : "login",
        time: nowIST(), ip: getIP(req),
      });
    }

    return res.json({ message: "OTP verified.", data: { token, user: safeUser(user) } });
  } catch (err) {
    console.error("verifyOtp error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const identifier = email || phone;
    if (!identifier) return res.status(400).json({ message: "Email or phone required." });

    const user = await User.findByEmailOrPhone(identifier);
    if (!user) return res.status(404).json({ message: "No account found." });

    return exports.sendOtp(req, res);
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ── Google OAuth callback ─────────────────────────────────────────────────────
exports.googleCallback = async (req, res) => {
  try {
    const { user } = req;
    const token = generateToken(user);

    if (user.email) {
      sendActivityAlert({ to: user.email, name: user.name, type: "login", time: nowIST(), ip: getIP(req) });
    }

    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("googleCallback error:", err);
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/auth?error=oauth_failed`);
  }
};

// ── Facebook OAuth callback ───────────────────────────────────────────────────
exports.facebookCallback = async (req, res) => {
  try {
    const { user } = req;
    const token = generateToken(user);

    if (user.email) {
      sendActivityAlert({ to: user.email, name: user.name, type: "login", time: nowIST(), ip: getIP(req) });
    }

    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("facebookCallback error:", err);
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/auth?error=oauth_failed`);
  }
};