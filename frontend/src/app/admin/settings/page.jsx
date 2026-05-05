"use client";

import { useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API = `${BASE_URL}/api`;

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "Admin",
    email: "admin@easytogo.in",
    phone: "9800000000",
    company: "Easy To Go",
    city: "Moradabad",
  });

  const [notifs, setNotifs] = useState({
    newBooking: true,
    newQuote: true,
    paymentReceived: true,
    marketingEmails: false,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    newPass: false,
    confirm: false,
  });

  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [passMsg, setPassMsg] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const showMsg = (setter, text, type = "success") => {
    setter({ text, type });
    setTimeout(() => setter({ text: "", type: "" }), 3000);
  };

  // ── Save Profile ──
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          company: profile.company,
          city: profile.city,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(setProfileMsg, data.message || "Failed to save profile.", "error");
        return;
      }
      showMsg(setProfileMsg, "✅ Profile saved successfully!", "success");
    } catch {
      showMsg(setProfileMsg, "Server error. Please try again.", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Change Password ──
  const handleChangePassword = async () => {
    const { current, newPass, confirm } = passwords;

    if (!current.trim()) {
      showMsg(setPassMsg, "Please enter your current password.", "error");
      return;
    }
    if (!newPass.trim() || newPass.length < 6) {
      showMsg(setPassMsg, "New password must be at least 6 characters.", "error");
      return;
    }
    if (newPass !== confirm) {
      showMsg(setPassMsg, "New passwords do not match.", "error");
      return;
    }
    if (current === newPass) {
      showMsg(setPassMsg, "New password must be different from current password.", "error");
      return;
    }

    setPassLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: newPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(setPassMsg, data.message || "Password change failed.", "error");
        return;
      }
      showMsg(setPassMsg, "✅ Password changed successfully!", "success");
      setPasswords({ current: "", newPass: "", confirm: "" });
    } catch {
      showMsg(setPassMsg, "Server error. Please try again.", "error");
    } finally {
      setPassLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: "var(--background)",
    border: "1px solid var(--border-color)",
    color: "var(--foreground)",
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
          Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
          Manage your account and preferences
        </p>
      </div>

      {/* ── Profile ── */}
      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
          👤 Profile Information
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "Full Name", key: "name" },
            { label: "Email", key: "email" },
            { label: "Phone", key: "phone" },
            { label: "Company Name", key: "company" },
            { label: "City", key: "city" },
          ].map((f) => (
            <div key={f.key}>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--nav-text-muted)" }}
              >
                {f.label}
              </label>
              <input
                type="text"
                value={profile[f.key]}
                onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                className={inputCls}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2979d4")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={handleSaveProfile}
            disabled={profileLoading}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-60"
            style={{ backgroundColor: "#2979d4" }}
          >
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
          {profileMsg.text && (
            <span
              className="text-sm font-semibold"
              style={{ color: profileMsg.type === "success" ? "#22c55e" : "#ef4444" }}
            >
              {profileMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* ── Notifications ── */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
          🔔 Notification Preferences
        </h3>
        {[
          { key: "newBooking", label: "New Booking", desc: "Get notified when a new booking is placed" },
          { key: "newQuote", label: "New Quote Request", desc: "Alert when customer requests a quote" },
          { key: "paymentReceived", label: "Payment Received", desc: "Notify when payment is confirmed" },
          { key: "marketingEmails", label: "Marketing Emails", desc: "Receive promotional & update emails" },
        ].map((n) => (
          <div
            key={n.key}
            className="flex items-center justify-between py-2"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {n.label}
              </p>
              <p className="text-xs" style={{ color: "var(--nav-text-muted)" }}>
                {n.desc}
              </p>
            </div>
            <button
              onClick={() => setNotifs({ ...notifs, [n.key]: !notifs[n.key] })}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0"
              style={{ backgroundColor: notifs[n.key] ? "#2979d4" : "rgba(255,255,255,0.1)" }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-300"
                style={{ transform: notifs[n.key] ? "translateX(24px)" : "translateX(4px)" }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* ── Change Password ── */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
          🔒 Change Password
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Current Password — full width */}
          <div className="sm:col-span-2">
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--nav-text-muted)" }}
            >
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="••••••••"
                className={`${inputCls} pr-12`}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2979d4")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                style={{ color: "#2979d4" }}
              >
                {showPasswords.current ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--nav-text-muted)" }}
            >
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.newPass ? "text" : "password"}
                value={passwords.newPass}
                onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                placeholder="Min. 6 characters"
                className={`${inputCls} pr-12`}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2979d4")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({ ...showPasswords, newPass: !showPasswords.newPass })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                style={{ color: "#2979d4" }}
              >
                {showPasswords.newPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--nav-text-muted)" }}
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Re-enter new password"
                className={`${inputCls} pr-12`}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2979d4")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                style={{ color: "#2979d4" }}
              >
                {showPasswords.confirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        {/* Password strength hint */}
        {passwords.newPass && (
          <div className="flex gap-1.5 pt-1">
            {[
              passwords.newPass.length >= 6,
              /[A-Z]/.test(passwords.newPass),
              /[0-9]/.test(passwords.newPass),
              /[^A-Za-z0-9]/.test(passwords.newPass),
            ].map((met, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: met ? "#22c55e" : "var(--border-color)" }}
              />
            ))}
            <span className="text-xs ml-1" style={{ color: "var(--nav-text-muted)" }}>
              {passwords.newPass.length < 6
                ? "Too short"
                : /[^A-Za-z0-9]/.test(passwords.newPass)
                ? "Strong 💪"
                : /[0-9]/.test(passwords.newPass)
                ? "Good"
                : "Fair"}
            </span>
          </div>
        )}

        {/* Confirm match indicator */}
        {passwords.confirm && (
          <p
            className="text-xs font-medium"
            style={{
              color: passwords.newPass === passwords.confirm ? "#22c55e" : "#ef4444",
            }}
          >
            {passwords.newPass === passwords.confirm
              ? "✓ Passwords match"
              : "✗ Passwords do not match"}
          </p>
        )}

        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={handleChangePassword}
            disabled={passLoading}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-60"
            style={{ backgroundColor: "#2979d4" }}
          >
            {passLoading ? "Updating..." : "Update Password"}
          </button>
          {passMsg.text && (
            <span
              className="text-sm font-semibold"
              style={{ color: passMsg.type === "success" ? "#22c55e" : "#ef4444" }}
            >
              {passMsg.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}