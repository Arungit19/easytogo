const express    = require("express");
const passport   = require("passport");
const GoogleStrategy   = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const jwt        = require("jsonwebtoken");
const router     = express.Router();
const authCtrl   = require("../controllers/authController");
const User       = require("../models/userModel");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

// ── Passport serialization ────────────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// ── Google Strategy ───────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  `${process.env.BASE_URL || "http://localhost:5000"}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email  = profile.emails?.[0]?.value || "";
          const avatar = profile.photos?.[0]?.value || "";
          const user   = await User.upsertProfile({
            name: profile.displayName,
            email,
            avatar,
            provider: "google",
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}

// ── Facebook Strategy ─────────────────────────────────────────────────────────
if (process.env.FACEBOOK_APP_ID) {
  passport.use(
    new FacebookStrategy(
      {
        clientID:     process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL:  `${process.env.BASE_URL || "http://localhost:5000"}/api/auth/facebook/callback`,
        profileFields: ["id", "displayName", "photos", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email  = profile.emails?.[0]?.value || "";
          const avatar = profile.photos?.[0]?.value || "";
          const user   = await User.upsertProfile({
            name: profile.displayName,
            email,
            avatar,
            provider: "facebook",
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}

// ── Auth Routes ───────────────────────────────────────────────────────────────
router.post("/register",        authCtrl.register);
router.post("/login",           authCtrl.login);
router.post("/send-otp",        authCtrl.sendOtp);
router.post("/verify-otp",      authCtrl.verifyOtp);
router.post("/forgot-password", authCtrl.forgotPassword);

// Google OAuth
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth?error=google_failed" }),
  authCtrl.googleCallback
);

// Facebook OAuth
router.get("/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
router.get("/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/auth?error=fb_failed" }),
  authCtrl.facebookCallback
);

module.exports = router;