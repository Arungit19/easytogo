"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API = `${BASE_URL}/api`;
const sanitizePhone = (value) => value.replace(/\D/g, "").slice(0, 10);

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    currentAddress: "",
    city: "",
    state: "",
    pincode: "",
    preferredContact: "phone",
  });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    try {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setForm({
        name:             parsed.name || "",
        email:            parsed.email || "",
        phone:            sanitizePhone(parsed.phone || ""),
        currentAddress:   parsed.currentAddress || "",
        city:             parsed.city || "",
        state:            parsed.state || "",
        pincode:          parsed.pincode || "",
        preferredContact: parsed.preferredContact || "phone",
      });
    } catch { router.push("/login"); }
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const updated = { ...user, avatar: ev.target.result };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new Event("authChange"));
    };
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${API}/users/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...user, avatar: data.avatar || data.url || user.avatar };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("authChange"));
      }
    } catch (err) { console.warn("Avatar upload failed:", err); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = res.ok ? await res.json() : {};
      const updated = { ...user, ...form, ...(data.user || {}) };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new Event("authChange"));
    } catch {
      const updated = { ...user, ...form };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new Event("authChange"));
    } finally {
      setSaving(false);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleCancel = () => {
    setForm({
      name:             user?.name || "",
      email:            user?.email || "",
      phone:            sanitizePhone(user?.phone || ""),
      currentAddress:   user?.currentAddress || "",
      city:             user?.city || "",
      state:            user?.state || "",
      pincode:          user?.pincode || "",
      preferredContact: user?.preferredContact || "phone",
    });
    setEditing(false);
  };

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--page-bg,#f9fafb)" }}>
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: "var(--page-bg,#f9fafb)" }}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ backgroundColor: "var(--card-bg,#fff)", borderColor: "var(--border-color,#e5e7eb)" }}>

          {/* Banner with truck decoration */}
          <div className="h-28 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2979d4 0%, #1a56a8 100%)" }}>
            <svg viewBox="0 0 400 80" className="absolute bottom-0 right-6 opacity-10 w-64" fill="white">
              <rect x="0" y="30" width="220" height="50" rx="4"/>
              <rect x="220" y="10" width="120" height="70" rx="4"/>
              <rect x="240" y="20" width="80" height="40" rx="2" fill="rgba(0,0,0,0.2)"/>
              <circle cx="60" cy="80" r="18"/>
              <circle cx="60" cy="80" r="10" fill="#2979d4"/>
              <circle cx="280" cy="80" r="18"/>
              <circle cx="280" cy="80" r="10" fill="#2979d4"/>
              <circle cx="340" cy="80" r="18"/>
              <circle cx="340" cy="80" r="10" fill="#2979d4"/>
            </svg>
          </div>

          {/* Avatar + action buttons */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">

              {/* Avatar */}
              <div className="relative group w-fit">
                <div
                  className="w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center cursor-pointer"
                  style={{ borderColor: "var(--card-bg,#fff)", backgroundColor: "#dbeafe" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {user.avatar || user.picture ? (
                    <img src={user.avatar || user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-blue-600">{initials}</span>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center">
                    {uploading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19 13v6H5v-6H3v6a2 2 0 002 2h14a2 2 0 002-2v-6h-2zM13 4.83l2.59 2.58L17 6l-5-5-5 5 1.41 1.41L11 4.83V15h2V4.83z"/></svg><span className="text-white text-[9px] font-semibold mt-0.5">Change</span></>
                    }
                  </div>
                </div>
              </div>

              {/* Edit / Save / Cancel */}
              <div className="flex gap-2 pb-1">
                {saved && (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Saved!
                  </span>
                )}
                {editing ? (
                  <>
                    <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-xl border transition-colors hover:bg-gray-50" style={{ borderColor: "var(--border-color,#e5e7eb)", color: "var(--nav-text-muted)" }}>
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#2979d4] text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                      {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all hover:shadow-sm hover:border-blue-300" style={{ borderColor: "var(--border-color,#e5e7eb)", color: "var(--nav-text)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Name + email */}
            <div className="mt-3">
              {editing ? (
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-2xl font-bold bg-transparent border-b-2 border-blue-400 outline-none w-full pb-0.5"
                  style={{ color: "var(--nav-text)" }} placeholder="Your full name" />
              ) : (
                <h1 className="text-2xl font-bold" style={{ color: "var(--nav-text)" }}>{user.name || "User"}</h1>
              )}
              <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: "var(--border-color,#e5e7eb)" }} />

          {/* ── Contact Information ── */}
          <Section title="Contact Information" icon={<PhoneIcon />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="Full Name" icon={<PersonIcon />} editing={editing} value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Arun Kumar" />
              <Field label="Email Address" icon={<EmailIcon />} editing={editing} value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" placeholder="you@example.com" />
              <Field label="Phone Number" icon={<PhoneIcon />} editing={editing} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" placeholder="9876543210" />

              {/* Preferred contact */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Preferred Contact Method</label>
                <div className="flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  {editing ? (
                    <div className="flex gap-2 flex-wrap">
                      {["phone", "email", "whatsapp"].map((opt) => (
                        <button key={opt} type="button" onClick={() => setForm({ ...form, preferredContact: opt })}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.preferredContact === opt ? "bg-[#2979d4] text-white border-[#2979d4]" : "border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                          {opt === "whatsapp" ? "WhatsApp" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: "var(--nav-text)" }}>
                      {form.preferredContact === "whatsapp" ? "WhatsApp" : form.preferredContact ? form.preferredContact.charAt(0).toUpperCase() + form.preferredContact.slice(1) : "Not set"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <div className="border-t" style={{ borderColor: "var(--border-color,#e5e7eb)" }} />

          {/* ── Current Address ── */}
          <Section title="Current Address" icon={<HomeIcon />}>
            <div className="flex flex-col gap-6">

              {/* Street address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Street / House Address</label>
                <div className="flex gap-3">
                  <span className="mt-0.5 text-gray-400 flex-shrink-0"><HomeIcon /></span>
                  {editing ? (
                    <textarea value={form.currentAddress} onChange={(e) => setForm({ ...form, currentAddress: e.target.value })} rows={2}
                      className="flex-1 text-sm rounded-xl border px-3 py-2 outline-none resize-none focus:border-blue-400 transition-colors"
                      style={{ backgroundColor: "var(--card-bg,#fff)", borderColor: "var(--border-color,#e5e7eb)", color: "var(--nav-text)" }}
                      placeholder="Flat no., building name, street, area..." />
                  ) : (
                    <p className="text-sm leading-relaxed" style={{ color: form.currentAddress ? "var(--nav-text)" : "#9ca3af" }}>
                      {form.currentAddress || "No address added"}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Field label="City" icon={<CityIcon />} editing={editing} value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="e.g. Delhi" />
                <Field label="State" icon={<MapIcon />} editing={editing} value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="e.g. Haryana" />
                <Field label="Pincode" icon={<PinIcon />} editing={editing} value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} type="number" placeholder="e.g. 136118" />
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center gap-2 text-xs text-gray-400"
            style={{ borderColor: "var(--border-color,#e5e7eb)", backgroundColor: "var(--page-bg,#f9fafb)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>
            Member since {new Date().getFullYear()}
            <span className="mx-2">·</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><path d="M13 16v-2a2 2 0 014 0v2"/></svg>
            Easy To Go Moving Services
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, icon, children }) {
  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[#2979d4]">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--nav-text)" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ── Field ── */
function Field({ label, icon, editing, value, onChange, type = "text", placeholder }) {
  const handleChange = (e) => {
    onChange(type === "tel" ? sanitizePhone(e.target.value) : e.target.value);
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 flex-shrink-0">{icon}</span>
        {editing ? (
          <input
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            inputMode={type === "tel" ? "numeric" : undefined}
            pattern={type === "tel" ? "[0-9]{10}" : undefined}
            maxLength={type === "tel" ? 10 : undefined}
            className="flex-1 text-sm rounded-xl border px-3 py-2 outline-none focus:border-blue-400 transition-colors"
            style={{ backgroundColor: "var(--card-bg,#fff)", borderColor: "var(--border-color,#e5e7eb)", color: "var(--nav-text)" }} />
        ) : (
          <p className="text-sm" style={{ color: value ? "var(--nav-text)" : "#9ca3af" }}>
            {value || `No ${label.toLowerCase()} added`}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Icons ── */
const PersonIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg>;
const EmailIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>;
const PhoneIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 12 19.79 19.79 0 011.61 3.18 2 2 0 013.58 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 8.5a16 16 0 007.6 7.6l1.06-1.06a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
const HomeIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const CityIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
const MapIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>;
const PinIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>;
