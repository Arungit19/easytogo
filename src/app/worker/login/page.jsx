"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Briefcase, MapPin, Clock, X, Mail, KeyRound, Lock } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API = `${BASE_URL}/api`;

const SERVICE_CATEGORIES = [
  "House Shifting & Office Relocation",
  "Packing Unpacking",
  "Cleaning",
  "Vehicle Transport",
  "Storage Solution",
];

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
  "Noida", "Gurgaon", "Faridabad", "Ghaziabad", "Moradabad",
];

// ─── Forgot Password Modal ────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  // step: "email" → "otp" → "reset" → "done"
  const [step, setStep] = useState("email");

  const [fpEmail, setFpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const inputBase =
    "w-full bg-[#1a0808] border border-[rgba(180,40,40,0.3)] rounded-lg px-4 py-2.5 text-sm text-[#f0e6e6] placeholder:text-[#6b4040] focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]/30 transition-all duration-200";
  const labelBase =
    "block text-[10px] text-[#9a7070] uppercase tracking-widest mb-1.5";

  // Step 1 — send OTP to email
  const handleSendOtp = async () => {
    setError("");
    if (!fpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/worker/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Could not send OTP. Try again."); return; }
      setInfo("OTP sent to your email. Check your inbox.");
      setStep("otp");
    } catch {
      setError("Server error. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = async () => {
    setError("");
    if (!otp.trim() || otp.length < 4) {
      setError("Enter the OTP sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/worker/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Invalid or expired OTP."); return; }
      setInfo("");
      setStep("reset");
    } catch {
      setError("Server error. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — reset password
  const handleResetPassword = async () => {
    setError("");
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/worker/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim(), otp: otp.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Password reset failed."); return; }
      setStep("done");
    } catch {
      setError("Server error. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-[#130606] border border-[rgba(180,40,40,0.25)] rounded-2xl shadow-[0_0_60px_rgba(139,0,0,0.4)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(180,40,40,0.2)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[rgba(192,57,43,0.15)] border border-[rgba(192,57,43,0.3)] flex items-center justify-center">
              <KeyRound size={13} className="text-[#c0392b]" />
            </div>
            <span
              className="text-white font-bold text-sm"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              Reset Password
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b4040] hover:text-[#9a7070] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {["email", "otp", "reset"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                    step === s || (step === "done" && i < 3)
                      ? "bg-[#c0392b] text-white"
                      : ["email", "otp", "reset"].indexOf(step) > i
                      ? "bg-[rgba(192,57,43,0.4)] text-[#e74c3c]"
                      : "bg-[#1a0808] border border-[rgba(180,40,40,0.3)] text-[#6b4040]"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`h-px w-8 transition-all duration-300 ${
                      ["email", "otp", "reset"].indexOf(step) > i
                        ? "bg-[#c0392b]"
                        : "bg-[rgba(180,40,40,0.2)]"
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="ml-auto text-[10px] text-[#6b4040] uppercase tracking-widest">
              {step === "email" && "Step 1 of 3"}
              {step === "otp" && "Step 2 of 3"}
              {step === "reset" && "Step 3 of 3"}
              {step === "done" && "Complete"}
            </span>
          </div>

          {/* ── STEP 1: Email ── */}
          {step === "email" && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Mail size={14} className="text-[#c0392b]" />
                <h3 className="text-white font-bold text-base" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  Enter your email
                </h3>
              </div>
              <p className="text-[#6b4040] text-xs mb-5">
                We'll send a one-time password to your registered email address.
              </p>
              <div className="mb-5">
                <label className={labelBase}>Email Address</label>
                <input
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  placeholder="worker@example.com"
                  className={inputBase}
                  autoFocus
                />
              </div>
              {error && <ErrorBox msg={error} />}
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-2.5 bg-[#c0392b] hover:bg-[#e74c3c] active:scale-[0.98] text-white font-bold text-xs tracking-widest uppercase rounded-lg transition-all duration-200 disabled:opacity-50 shadow-[0_4px_20px_rgba(192,57,43,0.35)]"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound size={14} className="text-[#c0392b]" />
                <h3 className="text-white font-bold text-base" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  Enter OTP
                </h3>
              </div>
              <p className="text-[#6b4040] text-xs mb-5">
                {info || `OTP sent to ${fpEmail}. Check your inbox (and spam).`}
              </p>
              <div className="mb-5">
                <label className={labelBase}>One-Time Password</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  placeholder="Enter 4–6 digit OTP"
                  className={`${inputBase} text-center tracking-[0.4em] text-lg font-bold`}
                  autoFocus
                />
              </div>
              {error && <ErrorBox msg={error} />}
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full py-2.5 bg-[#c0392b] hover:bg-[#e74c3c] active:scale-[0.98] text-white font-bold text-xs tracking-widest uppercase rounded-lg transition-all duration-200 disabled:opacity-50 shadow-[0_4px_20px_rgba(192,57,43,0.35)]"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                className="w-full mt-2 py-2 text-xs text-[#6b4040] hover:text-[#9a7070] transition-colors"
              >
                ← Change email
              </button>
            </div>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === "reset" && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock size={14} className="text-[#c0392b]" />
                <h3 className="text-white font-bold text-base" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  Set new password
                </h3>
              </div>
              <p className="text-[#6b4040] text-xs mb-5">
                Choose a strong password with at least 6 characters.
              </p>
              <div className="mb-3">
                <label className={labelBase}>New Password</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={`${inputBase} pr-10`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b4040] hover:text-[#9a7070]"
                  >
                    {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="mb-5">
                <label className={labelBase}>Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                    placeholder="Re-enter new password"
                    className={`${inputBase} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b4040] hover:text-[#9a7070]"
                  >
                    {showConfirmPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {error && <ErrorBox msg={error} />}
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full py-2.5 bg-[#c0392b] hover:bg-[#e74c3c] active:scale-[0.98] text-white font-bold text-xs tracking-widest uppercase rounded-lg transition-all duration-200 disabled:opacity-50 shadow-[0_4px_20px_rgba(192,57,43,0.35)]"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[rgba(39,174,96,0.15)] border border-[rgba(39,174,96,0.3)] flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-base mb-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                Password Reset!
              </h3>
              <p className="text-[#6b4040] text-xs mb-6">
                Your password has been updated. You can now log in with your new credentials.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-[#c0392b] hover:bg-[#e74c3c] active:scale-[0.98] text-white font-bold text-xs tracking-widest uppercase rounded-lg transition-all duration-200 shadow-[0_4px_20px_rgba(192,57,43,0.35)]"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-lg px-3 py-2 mb-4">
      <p className="text-[#e74c3c] text-xs">{msg}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkerLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotModal, setShowForgotModal] = useState(false); // ← NEW

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register state
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    phone: "",
    serviceCategory: "",
    city: "",
    availFrom: "09:00",
    availTo: "18:00",
    password: "",
    confirmPassword: "",
  });
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const inputBase =
    "w-full bg-[#1a0808] border border-[rgba(180,40,40,0.3)] rounded-lg px-4 py-2.5 text-sm text-[#f0e6e6] placeholder:text-[#6b4040] focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]/30 transition-all duration-200";
  const labelBase =
    "block text-[10px] text-[#9a7070] uppercase tracking-widest mb-1.5";

  const handleLogin = async () => {
    setLoginError("");
    if (!loginEmail.trim()) { setLoginError("Email is required."); return; }
    if (!loginPassword.trim()) { setLoginError("Password is required."); return; }

    setLoginLoading(true);
    try {
      const res = await fetch(`${API}/worker/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.message || "Login failed. Check your credentials."); return; }

      localStorage.setItem("workerToken", data.data.token);
      localStorage.setItem("worker", JSON.stringify(data.data.worker));
      router.push("/worker/dashboard");
    } catch {
      setLoginError("Server error. Make sure backend is running.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegError(""); setRegSuccess("");
    const { name, email, phone, serviceCategory, city, availFrom, availTo, password, confirmPassword } = regData;

    if (!name.trim()) { setRegError("Full name is required."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setRegError("Enter a valid email."); return; }
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone)) { setRegError("Enter a valid 10-digit phone number."); return; }
    if (!serviceCategory) { setRegError("Please select a service category."); return; }
    if (!city) { setRegError("Please select your city."); return; }
    if (!password || password.length < 6) { setRegError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setRegError("Passwords do not match."); return; }

    setRegLoading(true);
    try {
      const res = await fetch(`${API}/worker/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, serviceCategory, city, availFrom, availTo, password }),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.message || "Registration failed."); return; }

      setRegSuccess("Account created! Awaiting admin approval. You can now login.");
      setTimeout(() => setActiveTab("login"), 2000);
    } catch {
      setRegError("Server error. Make sure backend is running.");
    } finally {
      setRegLoading(false);
    }
  };

  const updateReg = (field, value) =>
    setRegData((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      {/* Forgot Password Modal */}
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}

      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-10"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/60 -z-10" />

      <div className="min-h-screen flex items-center justify-center px-4 py-8 pt-20 md:pt-24">
        <div className="w-full max-w-[900px] flex rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(139,0,0,0.3)] border border-[rgba(180,40,40,0.2)]">

          {/* RIGHT PANEL */}
          <div className="flex-1 bg-[#130606] flex flex-col overflow-y-auto max-h-screen">
            {/* Mobile header */}
            <div className="md:hidden bg-gradient-to-r from-[#1a0505] to-[#2d0a0a] px-4 py-5 flex items-center gap-3 border-b border-[rgba(180,40,40,0.2)]">
              <button onClick={() => router.push("/")} className="text-[#9a7070] hover:text-white">
                <ArrowLeft size={16} />
              </button>
              <div className="w-7 h-7 rounded-full bg-[#c0392b] flex items-center justify-center">
                <Briefcase size={14} color="white" />
              </div>
              <span className="text-white font-bold text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                HomeEase — Worker Portal
              </span>
            </div>

            <div className="flex-1 p-6 md:p-8">
              {/* Tabs */}
              <div className="flex border-b border-[rgba(180,40,40,0.25)] mb-6">
                {["login", "register"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setLoginError(""); setRegError(""); setRegSuccess(""); }}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-b-2 -mb-px ${
                      activeTab === tab
                        ? "text-[#e74c3c] border-[#e74c3c]"
                        : "text-[#6b4040] border-transparent hover:text-[#9a7070]"
                    }`}
                  >
                    {tab === "login" ? "Login" : "Register"}
                  </button>
                ))}
              </div>

              {/* ── LOGIN ── */}
              {activeTab === "login" && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    Sign in to your portal
                  </h2>
                  <p className="text-[#6b4040] text-xs mb-6">Enter your worker credentials to continue.</p>

                  <div className="mb-4">
                    <label className={labelBase}>Email Address</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder="worker@example.com"
                      className={inputBase}
                    />
                  </div>

                  <div className="mb-2">
                    <label className={labelBase}>Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPwd ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="Enter your password"
                        className={`${inputBase} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPwd(!showLoginPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b4040] hover:text-[#9a7070]"
                      >
                        {showLoginPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end mb-5">
                    {/* ✅ FIX: onClick now opens the modal */}
                    <button
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-[#c0392b] hover:text-[#e74c3c] hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {loginError && (
                    <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-lg px-3 py-2 mb-4">
                      <p className="text-[#e74c3c] text-xs">{loginError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleLogin}
                    disabled={loginLoading}
                    className="w-full py-3 bg-[#c0392b] hover:bg-[#e74c3c] active:scale-[0.98] text-white font-bold text-xs tracking-widest uppercase rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(192,57,43,0.35)]"
                  >
                    {loginLoading ? "Signing in..." : "Sign In"}
                  </button>

                  <p className="text-center text-xs text-[#6b4040] mt-5">
                    New worker?{" "}
                    <button
                      onClick={() => setActiveTab("register")}
                      className="text-[#e74c3c] hover:underline font-semibold"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              )}

              {/* ── REGISTER ── */}
              {activeTab === "register" && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    Create Worker Account
                  </h2>
                  <p className="text-[#6b4040] text-xs mb-6">Fill details below. Account needs admin approval.</p>

                  {/* Name + Phone */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className={labelBase}>Full Name</label>
                      <input
                        type="text"
                        value={regData.name}
                        onChange={(e) => updateReg("name", e.target.value)}
                        placeholder="Worker Name"
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className={labelBase}>Phone Number</label>
                      <div className="flex gap-1.5">
                        <span className="flex items-center px-2.5 bg-[#1a0808] border border-[rgba(180,40,40,0.3)] rounded-lg text-xs text-[#c0392b] font-bold">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={regData.phone}
                          onChange={(e) => updateReg("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="9876543210"
                          className={`${inputBase} flex-1`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-4">
                    <label className={labelBase}>Email Address</label>
                    <input
                      type="email"
                      value={regData.email}
                      onChange={(e) => updateReg("email", e.target.value)}
                      placeholder="worker@example.com"
                      className={inputBase}
                    />
                  </div>

                  {/* Service Category + City */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className={labelBase}>
                        <span className="flex items-center gap-1.5">
                          <Briefcase size={10} />
                          Service Category
                        </span>
                      </label>
                      <select
                        value={regData.serviceCategory}
                        onChange={(e) => updateReg("serviceCategory", e.target.value)}
                        className={`${inputBase} cursor-pointer`}
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="">Select category</option>
                        {SERVICE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelBase}>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={10} />
                          City
                        </span>
                      </label>
                      <select
                        value={regData.city}
                        onChange={(e) => updateReg("city", e.target.value)}
                        className={`${inputBase} cursor-pointer`}
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="">Select city</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="mb-4">
                    <label className={labelBase}>
                      <span className="flex items-center gap-1.5">
                        <Clock size={10} />
                        Availability Hours
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-[#6b4040] uppercase tracking-widest mb-1 block">From</label>
                        <input
                          type="time"
                          value={regData.availFrom}
                          onChange={(e) => updateReg("availFrom", e.target.value)}
                          className={inputBase}
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-[#6b4040] uppercase tracking-widest mb-1 block">Until</label>
                        <input
                          type="time"
                          value={regData.availTo}
                          onChange={(e) => updateReg("availTo", e.target.value)}
                          className={inputBase}
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className={labelBase}>Password</label>
                      <div className="relative">
                        <input
                          type={showRegPwd ? "text" : "password"}
                          value={regData.password}
                          onChange={(e) => updateReg("password", e.target.value)}
                          placeholder="Min. 6 characters"
                          className={`${inputBase} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPwd(!showRegPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b4040] hover:text-[#9a7070]"
                        >
                          {showRegPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelBase}>Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showRegConfirm ? "text" : "password"}
                          value={regData.confirmPassword}
                          onChange={(e) => updateReg("confirmPassword", e.target.value)}
                          placeholder="Re-enter password"
                          className={`${inputBase} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirm(!showRegConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b4040] hover:text-[#9a7070]"
                        >
                          {showRegConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {regError && (
                    <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-lg px-3 py-2 mb-4">
                      <p className="text-[#e74c3c] text-xs">{regError}</p>
                    </div>
                  )}
                  {regSuccess && (
                    <div className="bg-[rgba(39,174,96,0.1)] border border-[rgba(39,174,96,0.3)] rounded-lg px-3 py-2 mb-4">
                      <p className="text-[#27ae60] text-xs">{regSuccess}</p>
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={regLoading}
                    className="w-full py-3 bg-[#c0392b] hover:bg-[#e74c3c] active:scale-[0.98] text-white font-bold text-xs tracking-widest uppercase rounded-lg transition-all duration-200 disabled:opacity-50 shadow-[0_4px_20px_rgba(192,57,43,0.35)]"
                  >
                    {regLoading ? "Creating Account..." : "Register as Worker"}
                  </button>

                  <p className="text-center text-xs text-[#6b4040] mt-4">
                    Already registered?{" "}
                    <button
                      onClick={() => setActiveTab("login")}
                      className="text-[#e74c3c] hover:underline font-semibold"
                    >
                      Login
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}