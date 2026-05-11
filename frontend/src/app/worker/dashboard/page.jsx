"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCircle, XCircle, Clock, MapPin, Phone,
  LogOut, HardHat, Home, Package, Truck, Building2,
  Archive, Sparkles, RefreshCw, Calendar, Pencil, X, Save,
  WifiOff, Wifi, User, Shield, CreditCard, FileText,
  Upload, AlertCircle, Loader2, Trash2, Camera,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API = `${BASE_URL}/api`;

const SERVICE_ICONS = {
  "Home Shifting":       Home,
  "Cleaning":            Sparkles,
  "Office Relocation":   Building2,
  "Packing & Unpacking": Package,
  "Storage":             Archive,
  "Vehicle Transport":   Truck,
};

const STATUS_STYLE = {
  pending:     { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "Pending" },
  confirmed:   { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "Confirmed" },
  in_progress: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  label: "In Progress" },
  completed:   { color: "#10b981", bg: "rgba(16,185,129,0.12)",  label: "Completed" },
  cancelled:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   label: "Cancelled" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE MODAL HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function PMField({ label, children, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.3)", fontWeight: 700, display: "block", marginBottom: 6,
      }}>{label}</label>
      {children}
      {error && (
        <div style={{ fontSize: "0.62rem", color: "#f87171", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={10} /> {error}
        </div>
      )}
    </div>
  );
}

function PMInput({ value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        background: disabled ? "rgba(255,255,255,0.02)" : "#1a0808",
        border: `1px solid ${disabled ? "rgba(255,255,255,0.05)" : "rgba(180,40,40,0.3)"}`,
        borderRadius: 10, padding: "10px 14px",
        color: disabled ? "rgba(255,255,255,0.25)" : "#f0e6e6",
        fontSize: "0.84rem", outline: "none", colorScheme: "dark",
        cursor: disabled ? "not-allowed" : "text",
        transition: "border-color 0.2s",
      }}
    />
  );
}

function PMSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%", background: "#1a0808",
        border: "1px solid rgba(180,40,40,0.3)",
        borderRadius: 10, padding: "10px 14px", color: "#f0e6e6",
        fontSize: "0.84rem", outline: "none", colorScheme: "dark", cursor: "pointer",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DocUpload({ label, icon: Icon, preview, onFile, onRemove, hint }) {
  const ref = useRef();
  const isPdf = preview === "pdf";
  return (
    <div>
      <label style={{
        fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.3)", fontWeight: 700, display: "block", marginBottom: 8,
      }}>{label}</label>
      {preview ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }}>
          {isPdf ? (
            <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
              <FileText size={28} color="#10b981" />
              <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 600 }}>PDF Uploaded</span>
            </div>
          ) : (
            <img src={preview} alt={label} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
          )}
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
            <button onClick={() => ref.current?.click()} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={12} />
            </button>
            <button onClick={onRemove} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239,68,68,0.75)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} />
            </button>
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(16,185,129,0.85)", borderRadius: 99, padding: "2px 8px", fontSize: "0.6rem", color: "white", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle size={9} /> Uploaded
          </div>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          style={{
            width: "100%", height: 110, borderRadius: 12, cursor: "pointer",
            background: "rgba(255,255,255,0.02)", border: "1.5px dashed rgba(180,40,40,0.25)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 8, transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(231,76,60,0.5)"; e.currentTarget.style.background = "rgba(231,76,60,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(180,40,40,0.25)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        >
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={16} color="#e74c3c" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Click to upload</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>{hint}</div>
          </div>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*,.pdf" onChange={e => e.target.files[0] && onFile(e.target.files[0])} style={{ display: "none" }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKER PROFILE MODAL
// ══════════════════════════════════════════════════════════════════════════════

function WorkerProfileModal({ worker, token, onClose, onSaved }) {
  const avatarRef = useRef();
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]             = useState("");
  const [errors, setErrors]               = useState({});
  const [activeSection, setActiveSection] = useState("basic");

  const [avatarFile,     setAvatarFile]     = useState(null);
  const [avatarPreview,  setAvatarPreview]  = useState(worker?.profileImage || worker?.avatar || "");
  const [aadhaarFile,    setAadhaarFile]    = useState(null);
  const [aadhaarPreview, setAadhaarPreview] = useState(worker?.aadhaarImage || "");
  const [panFile,        setPanFile]        = useState(null);
  const [panPreview,     setPanPreview]     = useState(worker?.panImage || "");

  const [form, setForm] = useState({
    name:             worker?.name             || "",
    city:             worker?.city             || "",
    address:          worker?.address          || "",
    serviceCategory:  worker?.serviceCategory  || "",
    experience:       worker?.experience       || "",
    availability:     worker?.availability     || "",
    bio:              worker?.bio              || "",
    aadhaarNumber:    worker?.aadhaarNumber    || "",
    panNumber:        worker?.panNumber        || "",
    vehicleType:      worker?.vehicleType      || "",
    emergencyContact: worker?.emergencyContact || "",
  });

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleAvatarFile = file => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleDocFile = (file, setFile, setPreview) => {
    setFile(file);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "pdf");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber.replace(/\s/g, "")))
      e.aadhaarNumber = "Aadhaar must be 12 digits";
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.toUpperCase()))
      e.panNumber = "Invalid PAN (e.g. ABCDE1234F)";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatarFile)  fd.append("profileImage", avatarFile);
      if (aadhaarFile) fd.append("aadhaarImage", aadhaarFile);
      if (panFile)     fd.append("panImage",     panFile);
      fd.append("workerId", worker.id);

      const res = await fetch(`${API}/worker/update-profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors({ global: data.message || "Update failed." }); return; }

      const updated = {
        ...worker, ...form,
        profileImage: avatarPreview,
        aadhaarImage: aadhaarPreview,
        panImage:     panPreview,
      };
      localStorage.setItem("worker", JSON.stringify(updated));
      setSuccess("Profile updated successfully!");
      setTimeout(() => { onSaved(updated); onClose(); }, 1400);
    } catch {
      setErrors({ global: "Server error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const serviceCats = ["Home Shifting","Cleaning","Office Relocation","Packing & Unpacking","Storage","Vehicle Transport","All Services"]
    .map(s => ({ value: s, label: s }));

  const expOptions = [
    { value: "",          label: "Select Experience" },
    { value: "0-1 years", label: "0–1 years" },
    { value: "1-3 years", label: "1–3 years" },
    { value: "3-5 years", label: "3–5 years" },
    { value: "5-10 years",label: "5–10 years" },
    { value: "10+ years", label: "10+ years" },
  ];

  const sections = [
    { key: "basic",     label: "Basic Info", icon: User },
    { key: "documents", label: "Documents",  icon: Shield },
  ];

  return (
    <>
      <style>{`
        .pm-scroll::-webkit-scrollbar{width:4px}
        .pm-scroll::-webkit-scrollbar-track{background:transparent}
        .pm-scroll::-webkit-scrollbar-thumb{background:rgba(192,57,43,0.3);border-radius:4px}
        .pm-sec-btn{flex:1;padding:9px 12px;border-radius:10px;cursor:pointer;transition:all 0.2s;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.35);font-size:0.72rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit}
        .pm-sec-btn.active{background:rgba(231,76,60,0.12);border-color:rgba(231,76,60,0.35);color:#e74c3c}
        .pm-sec-btn:hover:not(.active){background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6)}
        @keyframes pm-in{from{opacity:0;transform:scale(0.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pm-success{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes pm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      <div
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, backdropFilter: "blur(5px)",
        }}
      >
        <div style={{
          width: "100%", maxWidth: 520, background: "#130606",
          border: "1px solid rgba(180,40,40,0.22)", borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(139,0,0,0.35), 0 40px 80px rgba(0,0,0,0.65)",
          animation: "pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          display: "flex", flexDirection: "column", maxHeight: "92vh",
        }}>

          {/* Header */}
          <div style={{
            padding: "18px 22px 16px",
            borderBottom: "1px solid rgba(180,40,40,0.12)",
            background: "linear-gradient(180deg,rgba(192,57,43,0.1) 0%,transparent 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Clickable avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: "2.5px solid rgba(231,76,60,0.45)",
                  overflow: "hidden", background: "linear-gradient(135deg,#c0392b,#e74c3c)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }} onClick={() => avatarRef.current?.click()}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <User size={24} color="white" />}
                </div>
                <button
                  onClick={() => avatarRef.current?.click()}
                  style={{
                    position: "absolute", bottom: -2, right: -2,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "linear-gradient(135deg,#c0392b,#e74c3c)",
                    border: "2.5px solid #130606", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Camera size={10} color="white" />
                </button>
                <input ref={avatarRef} type="file" accept="image/*"
                  onChange={e => e.target.files[0] && handleAvatarFile(e.target.files[0])}
                  style={{ display: "none" }} />
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>Edit Profile</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <Camera size={9} /> Tap photo to change
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex" }}>
              <X size={16} />
            </button>
          </div>

          {/* Security notice */}
          <div style={{
            margin: "14px 22px 0",
            background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: 10, padding: "8px 12px", fontSize: "0.65rem",
            color: "rgba(245,158,11,0.85)", display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
          }}>
            <Shield size={11} style={{ flexShrink: 0 }} />
            Phone &amp; Email are locked for security — contact support to change them.
          </div>

          {/* Locked fields */}
          <div style={{ padding: "12px 22px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flexShrink: 0 }}>
            <PMField label="Phone (Locked)">
              <PMInput value={worker?.phone || "—"} disabled />
            </PMField>
            <PMField label="Email (Locked)">
              <PMInput value={worker?.email || "—"} disabled />
            </PMField>
          </div>

          {/* Section tabs */}
          <div style={{ padding: "12px 22px 0", display: "flex", gap: 8, flexShrink: 0 }}>
            {sections.map(s => (
              <button key={s.key} className={`pm-sec-btn ${activeSection === s.key ? "active" : ""}`} onClick={() => setActiveSection(s.key)}>
                <s.icon size={13} /> {s.label}
              </button>
            ))}
          </div>

          {/* Scrollable body */}
          <div className="pm-scroll" style={{ overflowY: "auto", padding: "16px 22px", flex: 1 }}>

            {activeSection === "basic" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <PMField label="Full Name *" error={errors.name}>
                    <PMInput value={form.name} onChange={set("name")} placeholder="Your full name" />
                  </PMField>
                  <PMField label="City">
                    <PMInput value={form.city} onChange={set("city")} placeholder="Your city" />
                  </PMField>
                </div>

                <PMField label="Full Address">
                  <PMInput value={form.address} onChange={set("address")} placeholder="Street, Area, PIN Code" />
                </PMField>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <PMField label="Service Category">
                    <PMSelect value={form.serviceCategory} onChange={set("serviceCategory")}
                      options={[{ value: "", label: "Select Service" }, ...serviceCats]} />
                  </PMField>
                  <PMField label="Experience">
                    <PMSelect value={form.experience} onChange={set("experience")} options={expOptions} />
                  </PMField>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <PMField label="Availability Hours">
                    <PMInput value={form.availability} onChange={set("availability")} placeholder="09:00 – 18:00" />
                  </PMField>
                  <PMField label="Emergency Contact">
                    <PMInput value={form.emergencyContact} onChange={set("emergencyContact")} placeholder="+91 XXXXX XXXXX" />
                  </PMField>
                </div>

                <PMField label="Vehicle Type (if applicable)">
                  <PMSelect value={form.vehicleType} onChange={set("vehicleType")} options={[
                    { value: "",           label: "None / Not applicable" },
                    { value: "Bike",       label: "Bike / Motorcycle" },
                    { value: "Auto",       label: "Auto Rickshaw" },
                    { value: "Mini Truck", label: "Mini Truck" },
                    { value: "Tempo",      label: "Tempo / Tata Ace" },
                    { value: "Truck",      label: "Truck (Large)" },
                    { value: "Car",        label: "Car" },
                  ]} />
                </PMField>

                <PMField label="Short Bio">
                  <textarea
                    value={form.bio}
                    onChange={set("bio")}
                    placeholder="Tell customers about your experience, skills, and services..."
                    rows={3}
                    style={{
                      width: "100%", background: "#1a0808",
                      border: "1px solid rgba(180,40,40,0.3)",
                      borderRadius: 10, padding: "10px 14px", color: "#f0e6e6",
                      fontSize: "0.84rem", outline: "none", colorScheme: "dark",
                      resize: "vertical", lineHeight: 1.6, fontFamily: "inherit",
                    }}
                  />
                </PMField>
              </>
            )}

            {activeSection === "documents" && (
              <>
                <div style={{
                  background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)",
                  borderRadius: 12, padding: "10px 14px", marginBottom: 18,
                  fontSize: "0.68rem", color: "rgba(147,197,253,0.85)", lineHeight: 1.55,
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <Shield size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Your documents are encrypted and stored securely. They are used only for identity verification and will not be shared publicly.</span>
                </div>

                {/* Aadhaar */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CreditCard size={15} color="#e74c3c" />
                    </div>
                    <div>
                      <div style={{ color: "white", fontWeight: 700, fontSize: "0.82rem" }}>Aadhaar Card</div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.62rem" }}>Government ID – Required</div>
                    </div>
                  </div>

                  <PMField label="Aadhaar Number" error={errors.aadhaarNumber}>
                    <PMInput
                      value={form.aadhaarNumber}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 12);
                        setForm(f => ({ ...f, aadhaarNumber: v }));
                      }}
                      placeholder="XXXX XXXX XXXX"
                    />
                  </PMField>

                  <DocUpload
                    label="Aadhaar Card Image / PDF"
                    icon={Upload}
                    preview={aadhaarPreview}
                    onFile={f => handleDocFile(f, setAadhaarFile, setAadhaarPreview)}
                    onRemove={() => { setAadhaarFile(null); setAadhaarPreview(""); }}
                    hint="JPG, PNG or PDF · Max 5MB"
                  />
                </div>

                {/* PAN */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileText size={15} color="#e74c3c" />
                    </div>
                    <div>
                      <div style={{ color: "white", fontWeight: 700, fontSize: "0.82rem" }}>PAN Card</div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.62rem" }}>Tax ID – Optional but recommended</div>
                    </div>
                  </div>

                  <PMField label="PAN Number" error={errors.panNumber}>
                    <PMInput
                      value={form.panNumber}
                      onChange={e => setForm(f => ({ ...f, panNumber: e.target.value.toUpperCase().slice(0, 10) }))}
                      placeholder="ABCDE1234F"
                    />
                  </PMField>

                  <DocUpload
                    label="PAN Card Image / PDF"
                    icon={Upload}
                    preview={panPreview}
                    onFile={f => handleDocFile(f, setPanFile, setPanPreview)}
                    onRemove={() => { setPanFile(null); setPanPreview(""); }}
                    hint="JPG, PNG or PDF · Max 5MB"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 22px 18px",
            borderTop: "1px solid rgba(180,40,40,0.1)",
            flexShrink: 0, background: "rgba(0,0,0,0.25)",
          }}>
            {errors.global && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.7rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={12} /> {errors.global}
              </div>
            )}
            {success && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.72rem", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, animation: "pm-success 0.4s ease" }}>
                <CheckCircle size={13} /> {success}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, padding: 11, borderRadius: 10, border: "none",
                  background: saving ? "rgba(192,57,43,0.4)" : "linear-gradient(135deg,#c0392b,#e74c3c)",
                  color: "white", fontWeight: 700, fontSize: "0.78rem",
                  letterSpacing: "0.05em", textTransform: "uppercase",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving ? "none" : "0 4px 20px rgba(192,57,43,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "all 0.2s", fontFamily: "inherit",
                }}
              >
                {saving
                  ? <><Loader2 size={14} style={{ animation: "pm-spin 1s linear infinite" }} /> Saving...</>
                  : <><Save size={14} /> Save Profile</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ONLINE TOGGLE
// ══════════════════════════════════════════════════════════════════════════════

function OnlineToggle({ isOnline, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 14px", borderRadius: 99, cursor: "pointer",
        transition: "all 0.25s ease", userSelect: "none",
        border: isOnline ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(239,68,68,0.4)",
        background: isOnline ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.12)",
      }}
    >
      <div style={{
        width: 34, height: 18, borderRadius: 99, position: "relative",
        flexShrink: 0, transition: "all 0.3s ease",
        background: isOnline ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(239,68,68,0.35)",
        border: isOnline ? "none" : "1px solid rgba(239,68,68,0.5)",
      }}>
        <div style={{
          position: "absolute", top: 2, width: 14, height: 14,
          borderRadius: "50%", background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)", transition: "left 0.25s ease",
          left: isOnline ? 18 : 2,
        }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {isOnline ? <Wifi size={11} color="#10b981" /> : <WifiOff size={11} color="#f87171" />}
        <span style={{
          fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em",
          textTransform: "uppercase", color: isOnline ? "#10b981" : "#f87171",
        }}>
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFLINE BANNER
// ══════════════════════════════════════════════════════════════════════════════

function OfflineBanner({ onGoOnline }) {
  return (
    <div style={{
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
      borderRadius: 14, padding: "14px 18px", marginBottom: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <WifiOff size={16} color="#f87171" />
        </div>
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f87171", marginBottom: 2 }}>
            You are currently Offline
          </div>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
            New booking notifications are paused. Go online to receive new job alerts.
          </div>
        </div>
      </div>
      <button onClick={onGoOnline} style={{
        padding: "8px 16px", borderRadius: 99, border: "none", color: "white",
        fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.05em",
        textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
        background: "linear-gradient(135deg,#059669,#10b981)",
        boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
        display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
      }}>
        <Wifi size={12} /> Go Online
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY MODAL
// ══════════════════════════════════════════════════════════════════════════════

function AvailabilityModal({ worker, token, onClose, onSaved }) {
  const [availFrom, setAvailFrom] = useState("09:00");
  const [availTo,   setAvailTo]   = useState("18:00");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  useEffect(() => {
    if (!worker?.availability) return;
    const match = worker.availability.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (match) { setAvailFrom(match[1]); setAvailTo(match[2]); }
  }, [worker]);

  const handleSave = async () => {
    setError(""); setSuccess("");
    if (!availFrom || !availTo) { setError("Please select both times."); return; }
    if (availFrom >= availTo)   { setError("End time must be after start time."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/worker/update-availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workerId: worker.id, availFrom, availTo, availability: `${availFrom} - ${availTo}` }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message || "Failed."); return; }
      const updated = { ...worker, availability: `${availFrom} - ${availTo}`, availFrom, availTo };
      localStorage.setItem("worker", JSON.stringify(updated));
      setSuccess("Availability updated!");
      setTimeout(() => { onSaved(updated); onClose(); }, 1200);
    } catch { setError("Server error."); } finally { setLoading(false); }
  };

  const inp = { width: "100%", background: "#1a0808", border: "1px solid rgba(180,40,40,0.3)", borderRadius: 10, padding: "10px 14px", color: "#f0e6e6", fontSize: "0.88rem", outline: "none", colorScheme: "dark" };
  const lbl = { fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.3)", marginBottom: 6, display: "block", fontWeight: 600 };
  const presets = [
    { label: "Morning",   from: "06:00", to: "12:00" },
    { label: "Afternoon", from: "12:00", to: "18:00" },
    { label: "Evening",   from: "18:00", to: "23:00" },
    { label: "Full Day",  from: "08:00", to: "20:00" },
  ];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#130606", border: "1px solid rgba(180,40,40,0.25)", borderRadius: 20, boxShadow: "0 0 60px rgba(139,0,0,0.4)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(180,40,40,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={14} color="#c0392b" />
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>Set Availability</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>Set your working hours</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>
          {worker?.availability && (
            <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "8px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 8, fontSize: "0.72rem", color: "#10b981", fontWeight: 600 }}>
              <Clock size={11} /> Current: {worker.availability}
            </div>
          )}
          <div style={{ marginBottom: 18 }}>
            <span style={lbl}>Quick Select</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {presets.map(p => (
                <button key={p.label} onClick={() => { setAvailFrom(p.from); setAvailTo(p.to); }} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, transition: "all 0.15s", background: availFrom === p.from && availTo === p.to ? "rgba(192,57,43,0.2)" : "rgba(255,255,255,0.04)", border: availFrom === p.from && availTo === p.to ? "1px solid rgba(192,57,43,0.5)" : "1px solid rgba(255,255,255,0.07)", color: availFrom === p.from && availTo === p.to ? "#e74c3c" : "rgba(255,255,255,0.5)", fontFamily: "inherit" }}>
                  <div>{p.label}</div>
                  <div style={{ fontSize: "0.6rem", opacity: 0.7, marginTop: 2 }}>{p.from} – {p.to}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div><label style={lbl}>From (Start)</label><input type="time" value={availFrom} onChange={e => setAvailFrom(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Until (End)</label><input type="time" value={availTo} onChange={e => setAvailTo(e.target.value)} style={inp} /></div>
          </div>
          {availFrom && availTo && availFrom < availTo && (
            <div style={{ background: "rgba(192,57,43,0.07)", border: "1px dashed rgba(192,57,43,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>New availability:</span>
              <span style={{ color: "#e74c3c", fontWeight: 700, fontSize: "0.85rem" }}>{availFrom} – {availTo}</span>
            </div>
          )}
          {error   && <div style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: "0.72rem", color: "#e74c3c" }}>{error}</div>}
          {success && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: "0.72rem", color: "#10b981", fontWeight: 600 }}>✓ {success}</div>}
          <button onClick={handleSave} disabled={loading} style={{ width: "100%", padding: "11px", borderRadius: 10, background: loading ? "rgba(192,57,43,0.4)" : "linear-gradient(135deg, #c0392b, #e74c3c)", border: "none", color: "white", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 20px rgba(192,57,43,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit" }}>
            <Save size={13} /> {loading ? "Saving..." : "Save Availability"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIF BELL
// ══════════════════════════════════════════════════════════════════════════════

function NotifBell({ count, onClick }) {
  return (
    <button onClick={onClick} style={{ position: "relative", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: "white" }}>
      <Bell size={18} />
      {count > 0 && (
        <span style={{ position: "absolute", top: -4, right: -4, background: "#e74c3c", color: "white", borderRadius: "99px", fontSize: "0.6rem", fontWeight: 700, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOKING CARD
// ══════════════════════════════════════════════════════════════════════════════

function BookingCard({ booking, onAccept, onDecline, workerBookingIds }) {
  const [expanded, setExpanded] = useState(false);
  const [acting,   setActing]   = useState(false);
  const s    = STATUS_STYLE[booking.workerStatus || booking.status] || STATUS_STYLE.pending;
  const Icon = SERVICE_ICONS[booking.service] || Package;
  const isAlreadyTaken = booking.workerStatus === "confirmed" && !workerBookingIds?.includes(booking.id);
  const isMyConfirmed  = booking.workerStatus === "confirmed" &&  workerBookingIds?.includes(booking.id);
  const isPending      = !booking.workerStatus || booking.workerStatus === "pending";

  const handleAccept  = async () => { setActing(true); await onAccept(booking);  setActing(false); };
  const handleDecline = async () => { setActing(true); await onDecline(booking); setActing(false); };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: isMyConfirmed ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.07)", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flex: 1 }}>
          <div style={{ background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 10, padding: "8px 10px", flexShrink: 0 }}>
            <Icon size={18} color="#e74c3c" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "white", marginBottom: 4 }}>{booking.service}</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={10} /> {booking.city || "—"}
              <span style={{ opacity: 0.4 }}>·</span>
              <Clock size={10} /> {fmtDate(booking.created_at)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: isAlreadyTaken ? "#9ca3af" : s.color, background: isAlreadyTaken ? "rgba(156,163,175,0.1)" : s.bg }}>
            {isAlreadyTaken ? "Taken by another" : isMyConfirmed ? "✓ You confirmed" : s.label}
          </span>
          {booking.preferred_time && booking.preferred_time !== "—" && (
            <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 3 }}>
              <Calendar size={9} /> {booking.preferred_time}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginBottom: 14 }}>
            {[
              ["From",           booking.from_place || "—"],
              ["To",             booking.to_place   || "—"],
              ["Service Type",   booking.service_type || "—"],
              ["City",           booking.city || "—"],
              ["Customer Phone", booking.customer_phone || "—"],
              ["Booking Date",   fmtDate(booking.created_at)],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>

          {isPending && !isAlreadyTaken && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAccept} disabled={acting} style={{ flex: 1, padding: "9px", borderRadius: 8, background: "linear-gradient(135deg,#059669,#10b981)", border: "none", color: "white", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }}>
                <CheckCircle size={13} /> {acting ? "..." : "Accept Booking"}
              </button>
              <button onClick={handleDecline} disabled={acting} style={{ flex: 1, padding: "9px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }}>
                <XCircle size={13} /> {acting ? "..." : "Decline"}
              </button>
            </div>
          )}
          {isMyConfirmed && (
            <div style={{ padding: "9px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", textAlign: "center", fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
              ✓ You have confirmed this booking
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export default function WorkerDashboard() {
  const router = useRouter();
  const [worker,          setWorker]          = useState(null);
  const [token,           setToken]           = useState(null);
  const [bookings,        setBookings]        = useState([]);
  const [myBookingIds,    setMyBookingIds]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState("new");
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [notifications,   setNotifications]   = useState([]);
  const [error,           setError]           = useState("");
  const [lastFetch,       setLastFetch]       = useState(null);
  const [showAvailModal,  setShowAvailModal]  = useState(false);
  const [showProfileModal,setShowProfileModal]= useState(false);  // ← NEW

  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("workerIsOnline");
    return stored === null ? true : stored === "true";
  });

  const pollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("workerIsOnline", String(isOnline));
  }, [isOnline]);

  const handleToggleOnline = () => {
    setIsOnline(prev => {
      const next = !prev;
      if (next) setActiveTab("new");
      if (!next && activeTab === "new") setActiveTab("mine");
      return next;
    });
  };

  // Auth guard
  useEffect(() => {
    const raw = localStorage.getItem("worker") || localStorage.getItem("workerData");
    const t   = localStorage.getItem("workerToken");
    if (!raw || !t) { router.push("/worker/login"); return; }
    try {
      const parsed = JSON.parse(raw);
      setWorker(parsed);
      setToken(t);
      localStorage.setItem("worker", raw);
    } catch { router.push("/worker/login"); }
  }, [router]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!token || !worker) return;

    const endpoints = [
      { url: `${BASE_URL}/api/home-shifting`,     service: "Home Shifting" },
      { url: `${BASE_URL}/api/cleaning-booking`,  service: "Cleaning" },
      { url: `${BASE_URL}/api/office-relocation`, service: "Office Relocation" },
      { url: `${BASE_URL}/api/packing`,           service: "Packing & Unpacking" },
      { url: `${BASE_URL}/api/storage-booking`,   service: "Storage" },
      { url: `${BASE_URL}/api/vehicle-transport`, service: "Vehicle Transport" },
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map(({ url }) =>
          fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(d => Array.isArray(d) ? d : (d?.data ?? d?.bookings ?? []))
            .catch(() => [])
        )
      );

      const all = [];
      results.forEach((result, i) => {
        if (result.status !== "fulfilled") return;
        const { service } = endpoints[i];
        result.value.forEach(b => {
          all.push({
            id:             b.id,
            service,
            status:         b.status || "pending",
            workerStatus:
              b.worker_id === worker.id
                ? (b.worker_status || b.status || "confirmed")
                : (b.status === "confirmed" ? "confirmed" : "pending"),
            worker_id:      b.worker_id,
            created_at:     b.created_at,
            city:           b.city || b.from_city || "—",
            from_place:     b.from_place || b.from_location || b.from_city || "—",
            to_place:       b.to_place   || b.to_location   || b.to_city   || "—",
            service_type:   b.service_type || service,
            customer_phone: b.customer_phone || b.phone || "—",
            preferred_time: b.preferred_time || b.scheduled_time || "—",
            user_id:        b.user_id || b.customer_id || 0,
          });
        });
      });

      const sorted = all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (lastFetch && isOnline) {
        const newOnes = sorted.filter(
          b => new Date(b.created_at) > lastFetch && b.status === "pending" && !b.worker_id
        );
        if (newOnes.length > 0) {
          setNotifications(prev => [
            ...newOnes.map(b => ({
              id:      `${b.service}-${b.id}-${Date.now()}`,
              message: `New ${b.service} booking in ${b.city}`,
              time:    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              read:    false,
            })),
            ...prev,
          ].slice(0, 20));
          if ("Notification" in window && Notification.permission === "granted") {
            newOnes.forEach(b =>
              new Notification("New Booking Alert!", { body: `New ${b.service} booking in ${b.city}`, icon: "/logo.png" })
            );
          }
        }
      }

      setBookings(sorted);
      setMyBookingIds(sorted.filter(b => b.worker_id === worker?.id).map(b => b.id));
      setLastFetch(new Date());
      setError("");
    } catch (e) {
      console.error(e);
      setError("Failed to load bookings. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [token, worker, lastFetch, isOnline]);

  useEffect(() => {
    if (!token || !worker) return;
    fetchBookings();
    pollRef.current = setInterval(fetchBookings, 30000);
    return () => clearInterval(pollRef.current);
  }, [token, worker?.id]); // eslint-disable-line

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission();
  }, []);

  const handleAccept = async (booking) => {
    try {
      const res = await fetch(`${API}/workers/accept-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: booking.id, service: booking.service }),
      });
      if (!res.ok) {
        const epMap = {
          "Home Shifting":       `${BASE_URL}/api/home-shifting`,
          "Cleaning":            `${BASE_URL}/api/cleaning-booking`,
          "Office Relocation":   `${BASE_URL}/api/office-relocation`,
          "Packing & Unpacking": `${BASE_URL}/api/packing`,
          "Storage":             `${BASE_URL}/api/storage-booking`,
          "Vehicle Transport":   `${BASE_URL}/api/vehicle-transport`,
        };
        const ep = epMap[booking.service];
        if (ep) {
          await fetch(`${ep}/${booking.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: "confirmed", worker_id: worker.id, worker_name: worker.name }),
          });
        }
      }
      setMyBookingIds(prev => [...prev, booking.id]);
      setBookings(prev =>
        prev.map(b =>
          b.id === booking.id && b.service === booking.service
            ? { ...b, workerStatus: "confirmed", worker_id: worker.id, status: "confirmed" }
            : b
        )
      );
      setNotifications(prev => [{
        id:      `accepted-${booking.id}-${Date.now()}`,
        message: `✓ You accepted ${booking.service} in ${booking.city}`,
        time:    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        read:    true,
      }, ...prev].slice(0, 20));
    } catch {
      setError("Failed to accept booking. Try again.");
    }
  };

  const handleDecline = async (booking) => {
    setBookings(prev => prev.filter(b => !(b.id === booking.id && b.service === booking.service)));
  };

  const handleLogout = () => {
    localStorage.removeItem("workerToken");
    localStorage.removeItem("worker");
    localStorage.removeItem("workerData");
    router.push("/worker/login");
  };

  const handleAvailSaved   = updated => setWorker(updated);
  const handleProfileSaved = updated => setWorker(updated);   // ← NEW

  // Derived
  const newBookings = bookings.filter(b => (!b.worker_id || b.worker_id === null) && b.status === "pending");
  const myBookings  = bookings.filter(b => b.worker_id === worker?.id);
  const allBookings = bookings;
  const unreadCount = notifications.filter(n => !n.read).length;

  const visibleTabs = isOnline
    ? [
        { key: "new",  label: `New Bookings (${newBookings.length})` },
        { key: "mine", label: `My Jobs (${myBookings.length})` },
        { key: "all",  label: `All (${allBookings.length})` },
      ]
    : [
        { key: "mine", label: `My Jobs (${myBookings.length})` },
        { key: "all",  label: `All (${allBookings.length})` },
      ];

  const tabBookings =
    activeTab === "new"  ? newBookings :
    activeTab === "mine" ? myBookings  : allBookings;

  if (!worker) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        * { font-family:'Sora',sans-serif; box-sizing:border-box; margin:0; padding:0; }
        body { background:#0d0505; }
        .dash-root { min-height:100vh; background:#0d0505; }
        .topbar { position:sticky; top:0; z-index:100; background:rgba(13,5,5,0.95); backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.06); padding:12px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .worker-pill { display:flex; align-items:center; gap:10px; background:rgba(231,76,60,0.08); border:1px solid rgba(231,76,60,0.2); border-radius:99px; padding:6px 14px 6px 8px; cursor:pointer; transition:all 0.2s; }
        .worker-pill:hover { background:rgba(231,76,60,0.14); border-color:rgba(231,76,60,0.4); }
        .worker-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#c0392b,#e74c3c); display:flex; align-items:center; justify-content:center; overflow:hidden; border:1.5px solid rgba(231,76,60,0.4); flex-shrink:0; }
        .worker-name { font-size:0.78rem; font-weight:600; color:white; }
        .worker-cat  { font-size:0.62rem; color:rgba(231,76,60,0.8); }
        .edit-profile-hint { font-size:0.58rem; color:rgba(255,255,255,0.25); display:flex; align-items:center; gap:3px; margin-top:1px; }
        .topbar-right { display:flex; align-items:center; gap:8px; }
        .icon-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:8px; cursor:pointer; color:rgba(255,255,255,0.6); transition:all 0.2s; }
        .icon-btn:hover { background:rgba(255,255,255,0.08); color:white; }
        .main-wrap { max-width:860px; margin:0 auto; padding:24px 16px 60px; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:24px; }
        @media(max-width:560px){ .stats-row{ grid-template-columns:repeat(2,1fr); } }
        .stat-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:16px 14px; text-align:center; }
        .stat-num { font-size:1.6rem; font-weight:800; color:#e74c3c; }
        .stat-lbl { font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em; color:rgba(255,255,255,0.3); margin-top:3px; font-weight:600; }
        .tab-row { display:flex; gap:0; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:20px; }
        .tab-btn { flex:1; padding:11px; font-size:0.75rem; font-weight:600; letter-spacing:0.05em; background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; transition:all 0.2s; border-bottom:2px solid transparent; margin-bottom:-1px; font-family:inherit; }
        .tab-btn.active { color:#e74c3c; border-bottom-color:#e74c3c; }
        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .section-title { font-size:0.95rem; font-weight:700; color:white; }
        .refresh-btn { display:flex; align-items:center; gap:5px; font-size:0.7rem; color:rgba(255,255,255,0.35); background:none; border:1px solid rgba(255,255,255,0.08); cursor:pointer; padding:5px 10px; border-radius:8px; font-family:inherit; }
        .empty-state { text-align:center; padding:60px 20px; color:rgba(255,255,255,0.2); }
        .empty-icon { font-size:3rem; margin-bottom:12px; }
        .empty-title { font-size:0.9rem; font-weight:600; margin-bottom:6px; }
        .empty-sub { font-size:0.75rem; }
        .notif-panel { position:absolute; top:60px; right:16px; z-index:200; width:320px; background:#1a0a0a; border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.6); }
        .notif-header { padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; }
        .notif-title { font-size:0.8rem; font-weight:700; color:white; }
        .notif-item { padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; gap:10px; align-items:flex-start; }
        .notif-dot { width:7px; height:7px; border-radius:50%; background:#e74c3c; flex-shrink:0; margin-top:5px; }
        .notif-dot.read { background:rgba(255,255,255,0.15); }
        .notif-msg  { font-size:0.72rem; color:rgba(255,255,255,0.7); line-height:1.4; }
        .notif-time { font-size:0.62rem; color:rgba(255,255,255,0.3); margin-top:3px; }
        .poll-indicator { display:flex; align-items:center; gap:5px; font-size:0.65rem; color:rgba(255,255,255,0.2); }
        .pulse-dot { width:6px; height:6px; border-radius:50%; background:#10b981; animation:pulse 2s infinite; }
        .pulse-dot.offline { background:#ef4444; animation:none; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        .err-banner { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:10px 14px; font-size:0.75rem; color:#f87171; margin-bottom:16px; }
        .skeleton { border-radius:14px; height:80px; margin-bottom:12px; animation:shimmer 1.4s infinite; background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%); background-size:600px 100%; }
        @keyframes shimmer { from{background-position:-600px 0} to{background-position:600px 0} }
        .avail-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .avail-badge { display:inline-flex; align-items:center; gap:5px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:99px; padding:5px 12px; font-size:0.65rem; color:#10b981; font-weight:600; }
        .edit-avail-btn { display:inline-flex; align-items:center; gap:5px; background:rgba(192,57,43,0.08); border:1px solid rgba(192,57,43,0.25); border-radius:99px; padding:5px 12px; font-size:0.65rem; color:#e74c3c; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:inherit; }
        .edit-avail-btn:hover { background:rgba(192,57,43,0.16); border-color:rgba(192,57,43,0.45); }
      `}</style>

      {/* Modals */}
      {showAvailModal && (
        <AvailabilityModal worker={worker} token={token} onClose={() => setShowAvailModal(false)} onSaved={handleAvailSaved} />
      )}
      {showProfileModal && (
        <WorkerProfileModal worker={worker} token={token} onClose={() => setShowProfileModal(false)} onSaved={handleProfileSaved} />
      )}

      <div className="dash-root">

        {/* TOP BAR */}
        <div className="topbar" style={{ position: "relative" }}>

          {/* Worker pill — click to open profile modal */}
          <div className="worker-pill" onClick={() => setShowProfileModal(true)} title="Edit your profile">
            <div className="worker-avatar">
              {worker.profileImage || worker.avatar
                ? <img src={worker.profileImage || worker.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <HardHat size={14} color="white" />}
            </div>
            <div>
              <div className="worker-name">{worker.name || "Worker"}</div>
              <div className="worker-cat">{worker.serviceCategory || "All Services"}</div>
              <div className="edit-profile-hint"><Pencil size={8} /> Edit profile</div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="poll-indicator">
              <div className={`pulse-dot ${!isOnline ? "offline" : ""}`} />
              {isOnline ? "Live" : "Offline"}
            </div>
            <OnlineToggle isOnline={isOnline} onToggle={handleToggleOnline} />
            <NotifBell count={unreadCount} onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }} />
            <button className="icon-btn" onClick={handleLogout} title="Logout"><LogOut size={16} /></button>
          </div>

          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-header">
                <span className="notif-title">🔔 Notifications</span>
                <button onClick={() => setNotifications([])} style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Clear all</button>
              </div>
              {notifications.length === 0
                ? <div style={{ padding: "24px", textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>No notifications yet</div>
                : notifications.map(n => (
                  <div key={n.id} className="notif-item">
                    <div className={`notif-dot ${n.read ? "read" : ""}`} />
                    <div>
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <div className="main-wrap">

          {!isOnline && (
            <OfflineBanner onGoOnline={() => { setIsOnline(true); setActiveTab("new"); }} />
          )}

          {/* Worker info + availability */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "white", marginBottom: 4 }}>My Dashboard</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={10} /> {worker.city || "—"}
                <span style={{ opacity: 0.4 }}>·</span>
                <Phone size={10} /> {worker.phone || "—"}
              </div>
            </div>
            <div className="avail-row">
              <span className="avail-badge"><Clock size={10} /> {worker.availability || "Not set"}</span>
              <button className="edit-avail-btn" onClick={() => setShowAvailModal(true)}>
                <Pencil size={10} /> Edit Time
              </button>
              {/* Edit profile shortcut button */}
              <button className="edit-avail-btn" onClick={() => setShowProfileModal(true)}
                style={{ background: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.25)", color: "#60a5fa" }}>
                <User size={10} /> Edit Profile
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { num: newBookings.length, lbl: "New Alerts" },
              { num: myBookings.length,  lbl: "My Bookings" },
              { num: myBookings.filter(b => b.status === "completed").length, lbl: "Completed" },
              { num: allBookings.length, lbl: "Total" },
            ].map(s => (
              <div key={s.lbl} className="stat-card">
                <div className="stat-num">{s.num}</div>
                <div className="stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          {error && <div className="err-banner">⚠ {error}</div>}

          {/* Tabs */}
          <div className="tab-row">
            {visibleTabs.map(t => (
              <button key={t.key} className={`tab-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="section-header">
            <div className="section-title">
              {activeTab === "new"  && "Available Bookings"}
              {activeTab === "mine" && "My Confirmed Jobs"}
              {activeTab === "all"  && "All Bookings"}
            </div>
            <button className="refresh-btn" onClick={fetchBookings}><RefreshCw size={11} /> Refresh</button>
          </div>

          {loading && [1, 2, 3].map(i => <div key={i} className="skeleton" />)}

          {!loading && tabBookings.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                {activeTab === "new" ? "🔔" : activeTab === "mine" ? "📋" : "📂"}
              </div>
              <div className="empty-title">
                {activeTab === "new"  && "No new bookings right now"}
                {activeTab === "mine" && "You haven't confirmed any bookings yet"}
                {activeTab === "all"  && "No bookings found"}
              </div>
              <div className="empty-sub">
                {activeTab === "new"  && "New bookings will appear here automatically."}
                {activeTab === "mine" && "Accept a booking from the New Bookings tab."}
                {activeTab === "all"  && "Bookings will show here once placed."}
              </div>
            </div>
          )}

          {!loading && tabBookings.map(b => (
            <BookingCard
              key={`${b.service}-${b.id}`}
              booking={b}
              onAccept={handleAccept}
              onDecline={handleDecline}
              workerBookingIds={myBookingIds}
            />
          ))}
        </div>
      </div>
    </>
  );
}