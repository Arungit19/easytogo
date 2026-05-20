"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCircle, XCircle, Clock, MapPin, Phone,
  LogOut, HardHat, Home, Package, Truck, Building2,
  Archive, Sparkles, RefreshCw, Calendar, Pencil, X, Save,
  WifiOff, Wifi, User, Shield, CreditCard, FileText,
  Upload, AlertCircle, Loader2, Trash2, Camera, ChevronDown,
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

const SERVICE_ENDPOINTS = {
  "Home Shifting":       `${BASE_URL}/api/home-shifting`,
  "Cleaning":            `${BASE_URL}/api/cleaning-booking`,
  "Office Relocation":   `${BASE_URL}/api/office-relocation`,
  "Packing & Unpacking": `${BASE_URL}/api/packing`,
  "Storage":             `${BASE_URL}/api/storage-booking`,
  "Vehicle Transport":   `${BASE_URL}/api/vehicle-transport`,
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

/* ─── Profile Modal Helpers ─────────────────────────────────────────────── */

function PMField({ label, children, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.3)", fontWeight: 700, display: "block", marginBottom: 5,
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
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: "100%", background: disabled ? "rgba(255,255,255,0.02)" : "#1a0808",
        border: `1px solid ${disabled ? "rgba(255,255,255,0.05)" : "rgba(180,40,40,0.3)"}`,
        borderRadius: 10, padding: "10px 14px",
        color: disabled ? "rgba(255,255,255,0.25)" : "#f0e6e6",
        fontSize: "0.84rem", outline: "none", colorScheme: "dark",
        cursor: disabled ? "not-allowed" : "text", transition: "border-color 0.2s",
        WebkitTextSizeAdjust: "100%",
      }}
    />
  );
}

function PMSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{
      width: "100%", background: "#1a0808",
      border: "1px solid rgba(180,40,40,0.3)",
      borderRadius: 10, padding: "10px 14px", color: "#f0e6e6",
      fontSize: "0.84rem", outline: "none", colorScheme: "dark", cursor: "pointer",
      WebkitAppearance: "none", appearance: "none",
    }}>
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
            <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
              <FileText size={26} color="#10b981" />
              <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 600 }}>PDF Uploaded</span>
            </div>
          ) : (
            <img src={preview} alt={label} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
          )}
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
            <button onClick={() => ref.current?.click()} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={12} />
            </button>
            <button onClick={onRemove} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(239,68,68,0.75)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} />
            </button>
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(16,185,129,0.85)", borderRadius: 99, padding: "2px 8px", fontSize: "0.6rem", color: "white", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle size={9} /> Uploaded
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} style={{
          width: "100%", height: 100, borderRadius: 12, cursor: "pointer",
          background: "rgba(255,255,255,0.02)", border: "1.5px dashed rgba(180,40,40,0.25)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} color="#e74c3c" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Tap to upload</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>{hint}</div>
          </div>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*,.pdf" onChange={e => e.target.files[0] && onFile(e.target.files[0])} style={{ display: "none" }} />
    </div>
  );
}

/* ─── Worker Profile Modal ──────────────────────────────────────────────── */

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
  const handleAvatarFile = file => { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); };
  const handleDocFile = (file, setFile, setPreview) => {
    setFile(file); setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "pdf");
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
    setErrors({}); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatarFile)  fd.append("profileImage", avatarFile);
      if (aadhaarFile) fd.append("aadhaarImage", aadhaarFile);
      if (panFile)     fd.append("panImage",     panFile);
      fd.append("workerId", worker.id);
      const res = await fetch(`${API}/worker/update-profile`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors({ global: data.message || "Update failed." }); return; }
      const updated = { ...worker, ...form, profileImage: avatarPreview, aadhaarImage: aadhaarPreview, panImage: panPreview };
      localStorage.setItem("worker", JSON.stringify(updated));
      setSuccess("Profile updated successfully!");
      setTimeout(() => { onSaved(updated); onClose(); }, 1400);
    } catch { setErrors({ global: "Server error. Please try again." }); }
    finally { setSaving(false); }
  };

  const serviceCats = ["Home Shifting","Cleaning","Office Relocation","Packing & Unpacking","Storage","Vehicle Transport","All Services"].map(s => ({ value: s, label: s }));
  const expOptions  = [
    { value: "", label: "Select Experience" },
    { value: "0-1 years", label: "0–1 years" },
    { value: "1-3 years", label: "1–3 years" },
    { value: "3-5 years", label: "3–5 years" },
    { value: "5-10 years",label: "5–10 years" },
    { value: "10+ years", label: "10+ years" },
  ];
  const sections = [{ key: "basic", label: "Basic Info", icon: User }, { key: "documents", label: "Documents", icon: Shield }];

  return (
    <>
      <style>{`
        .pm-scroll::-webkit-scrollbar{width:3px}
        .pm-scroll::-webkit-scrollbar-thumb{background:rgba(192,57,43,0.3);border-radius:4px}
        .pm-sec-btn{flex:1;padding:9px 8px;border-radius:10px;cursor:pointer;transition:all 0.2s;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.35);font-size:0.72rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;min-height:44px}
        .pm-sec-btn.active{background:rgba(231,76,60,0.12);border-color:rgba(231,76,60,0.35);color:#e74c3c}
        @keyframes pm-in{from{opacity:0;transform:scale(0.96) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      <div
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.88)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: 0, backdropFilter: "blur(5px)",
        }}
      >
        <div style={{
          width: "100%", maxWidth: 520,
          background: "#130606",
          border: "1px solid rgba(180,40,40,0.22)",
          borderRadius: "20px 20px 0 0",
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(139,0,0,0.35), 0 -20px 60px rgba(0,0,0,0.5)",
          animation: "pm-in 0.3s cubic-bezier(0.34,1.2,0.64,1)",
          display: "flex", flexDirection: "column",
          maxHeight: "94vh",
        }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
          </div>

          <div style={{
            padding: "12px 18px 14px",
            borderBottom: "1px solid rgba(180,40,40,0.12)",
            background: "linear-gradient(180deg,rgba(192,57,43,0.1) 0%,transparent 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  border: "2px solid rgba(231,76,60,0.45)",
                  overflow: "hidden", background: "linear-gradient(135deg,#c0392b,#e74c3c)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }} onClick={() => avatarRef.current?.click()}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <User size={22} color="white" />}
                </div>
                <button onClick={() => avatarRef.current?.click()} style={{
                  position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%",
                  background: "linear-gradient(135deg,#c0392b,#e74c3c)", border: "2px solid #130606",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}><Camera size={10} color="white" /></button>
                <input ref={avatarRef} type="file" accept="image/*" onChange={e => e.target.files[0] && handleAvatarFile(e.target.files[0])} style={{ display: "none" }} />
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: "1rem" }}>Edit Profile</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <Camera size={9} /> Tap photo to change
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 9, cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", minWidth: 38, minHeight: 38, alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ margin: "12px 18px 0", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 10, padding: "8px 12px", fontSize: "0.65rem", color: "rgba(245,158,11,0.85)", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <Shield size={11} style={{ flexShrink: 0 }} />
            Phone &amp; Email are locked — contact support to change.
          </div>

          <div style={{ padding: "12px 18px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flexShrink: 0 }}>
            <PMField label="Phone (Locked)"><PMInput value={worker?.phone || "—"} disabled /></PMField>
            <PMField label="Email (Locked)"><PMInput value={worker?.email || "—"} disabled /></PMField>
          </div>

          <div style={{ padding: "10px 18px 0", display: "flex", gap: 8, flexShrink: 0 }}>
            {sections.map(s => (
              <button key={s.key} className={`pm-sec-btn ${activeSection === s.key ? "active" : ""}`} onClick={() => setActiveSection(s.key)}>
                <s.icon size={13} /> {s.label}
              </button>
            ))}
          </div>

          <div className="pm-scroll" style={{ overflowY: "auto", padding: "14px 18px", flex: 1, WebkitOverflowScrolling: "touch" }}>
            {activeSection === "basic" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                  <PMField label="Full Name *" error={errors.name}><PMInput value={form.name} onChange={set("name")} placeholder="Your full name" /></PMField>
                  <PMField label="City"><PMInput value={form.city} onChange={set("city")} placeholder="Your city" /></PMField>
                </div>
                <PMField label="Full Address"><PMInput value={form.address} onChange={set("address")} placeholder="Street, Area, PIN Code" /></PMField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                  <PMField label="Service Category">
                    <PMSelect value={form.serviceCategory} onChange={set("serviceCategory")} options={[{ value: "", label: "Select Service" }, ...serviceCats]} />
                  </PMField>
                  <PMField label="Experience">
                    <PMSelect value={form.experience} onChange={set("experience")} options={expOptions} />
                  </PMField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                  <PMField label="Availability Hours"><PMInput value={form.availability} onChange={set("availability")} placeholder="09:00 – 18:00" /></PMField>
                  <PMField label="Emergency Contact"><PMInput value={form.emergencyContact} onChange={set("emergencyContact")} placeholder="+91 XXXXX XXXXX" /></PMField>
                </div>
                <PMField label="Vehicle Type">
                  <PMSelect value={form.vehicleType} onChange={set("vehicleType")} options={[
                    { value: "", label: "None / Not applicable" }, { value: "Bike", label: "Bike" }, { value: "Auto", label: "Auto Rickshaw" },
                    { value: "Mini Truck", label: "Mini Truck" }, { value: "Tempo", label: "Tempo / Tata Ace" },
                    { value: "Truck", label: "Truck (Large)" }, { value: "Car", label: "Car" },
                  ]} />
                </PMField>
                <PMField label="Short Bio">
                  <textarea value={form.bio} onChange={set("bio")} placeholder="Tell customers about your experience..." rows={3}
                    style={{ width: "100%", background: "#1a0808", border: "1px solid rgba(180,40,40,0.3)", borderRadius: 10, padding: "10px 14px", color: "#f0e6e6", fontSize: "0.84rem", outline: "none", colorScheme: "dark", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                </PMField>
              </>
            )}
            {activeSection === "documents" && (
              <>
                <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: "0.68rem", color: "rgba(147,197,253,0.85)", lineHeight: 1.55, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Shield size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Documents are encrypted. Used only for identity verification, never shared publicly.</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={14} color="#e74c3c" /></div>
                    <div><div style={{ color: "white", fontWeight: 700, fontSize: "0.82rem" }}>Aadhaar Card</div><div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.62rem" }}>Government ID – Required</div></div>
                  </div>
                  <PMField label="Aadhaar Number" error={errors.aadhaarNumber}>
                    <PMInput value={form.aadhaarNumber} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 12); setForm(f => ({ ...f, aadhaarNumber: v })); }} placeholder="XXXX XXXX XXXX" />
                  </PMField>
                  <DocUpload label="Aadhaar Card Image / PDF" icon={Upload} preview={aadhaarPreview}
                    onFile={f => handleDocFile(f, setAadhaarFile, setAadhaarPreview)}
                    onRemove={() => { setAadhaarFile(null); setAadhaarPreview(""); }} hint="JPG, PNG or PDF · Max 5MB" />
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={14} color="#e74c3c" /></div>
                    <div><div style={{ color: "white", fontWeight: 700, fontSize: "0.82rem" }}>PAN Card</div><div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.62rem" }}>Tax ID – Optional</div></div>
                  </div>
                  <PMField label="PAN Number" error={errors.panNumber}>
                    <PMInput value={form.panNumber} onChange={e => setForm(f => ({ ...f, panNumber: e.target.value.toUpperCase().slice(0, 10) }))} placeholder="ABCDE1234F" />
                  </PMField>
                  <DocUpload label="PAN Card Image / PDF" icon={Upload} preview={panPreview}
                    onFile={f => handleDocFile(f, setPanFile, setPanPreview)}
                    onRemove={() => { setPanFile(null); setPanPreview(""); }} hint="JPG, PNG or PDF · Max 5MB" />
                </div>
              </>
            )}
          </div>

          <div style={{ padding: "12px 18px 20px", borderTop: "1px solid rgba(180,40,40,0.1)", flexShrink: 0, background: "rgba(0,0,0,0.25)" }}>
            {errors.global && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: "0.7rem", color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={12} /> {errors.global}
              </div>
            )}
            {success && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: "0.72rem", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={13} /> {success}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 2, padding: 12, borderRadius: 10, border: "none",
                background: saving ? "rgba(192,57,43,0.4)" : "linear-gradient(135deg,#c0392b,#e74c3c)",
                color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.04em",
                textTransform: "uppercase", cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 4px 20px rgba(192,57,43,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                transition: "all 0.2s", fontFamily: "inherit", minHeight: 44,
              }}>
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

function OnlineToggle({ isOnline, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "7px 11px",
      borderRadius: 99, cursor: "pointer", transition: "all 0.25s ease", userSelect: "none",
      border: isOnline ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(239,68,68,0.4)",
      background: isOnline ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.12)",
      minHeight: 38,
    }}>
      <div style={{
        width: 32, height: 17, borderRadius: 99, position: "relative", flexShrink: 0,
        transition: "all 0.3s ease",
        background: isOnline ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(239,68,68,0.35)",
        border: isOnline ? "none" : "1px solid rgba(239,68,68,0.5)",
      }}>
        <div style={{ position: "absolute", top: 2, width: 13, height: 13, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", transition: "left 0.25s ease", left: isOnline ? 17 : 2 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {isOnline ? <Wifi size={11} color="#10b981" /> : <WifiOff size={11} color="#f87171" />}
        <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: isOnline ? "#10b981" : "#f87171" }}>
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </button>
  );
}

function OfflineBanner({ onGoOnline }) {
  return (
    <div style={{
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
      borderRadius: 14, padding: "14px 16px", marginBottom: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <WifiOff size={15} color="#f87171" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f87171", marginBottom: 2 }}>You're Offline</div>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.4, whiteSpace: "normal" }}>Go online to receive new job alerts.</div>
        </div>
      </div>
      <button onClick={onGoOnline} style={{
        padding: "9px 16px", borderRadius: 99, border: "none", color: "white",
        fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.04em", textTransform: "uppercase",
        cursor: "pointer", whiteSpace: "nowrap", background: "linear-gradient(135deg,#059669,#10b981)",
        boxShadow: "0 4px 16px rgba(16,185,129,0.3)", display: "flex", alignItems: "center", gap: 6,
        fontFamily: "inherit", minHeight: 40,
      }}>
        <Wifi size={12} /> Go Online
      </button>
    </div>
  );
}

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
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.82)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0,
    }}>
      <div style={{
        width: "100%", maxWidth: 440, background: "#130606",
        border: "1px solid rgba(180,40,40,0.25)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 0 60px rgba(139,0,0,0.4)",
        maxHeight: "92vh", overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 14px", borderBottom: "1px solid rgba(180,40,40,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={13} color="#c0392b" />
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>Set Availability</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>Set your working hours</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 6, minWidth: 38, minHeight: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "18px 18px 24px" }}>
          {worker?.availability && (
            <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontSize: "0.72rem", color: "#10b981", fontWeight: 600 }}>
              <Clock size={11} /> Current: {worker.availability}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <span style={lbl}>Quick Select</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {presets.map(p => (
                <button key={p.label} onClick={() => { setAvailFrom(p.from); setAvailTo(p.to); }} style={{
                  padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                  transition: "all 0.15s", minHeight: 52,
                  background: availFrom === p.from && availTo === p.to ? "rgba(192,57,43,0.2)" : "rgba(255,255,255,0.04)",
                  border: availFrom === p.from && availTo === p.to ? "1px solid rgba(192,57,43,0.5)" : "1px solid rgba(255,255,255,0.07)",
                  color: availFrom === p.from && availTo === p.to ? "#e74c3c" : "rgba(255,255,255,0.5)", fontFamily: "inherit",
                }}>
                  <div>{p.label}</div>
                  <div style={{ fontSize: "0.6rem", opacity: 0.7, marginTop: 2 }}>{p.from} – {p.to}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div><label style={lbl}>From (Start)</label><input type="time" value={availFrom} onChange={e => setAvailFrom(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Until (End)</label><input type="time" value={availTo} onChange={e => setAvailTo(e.target.value)} style={inp} /></div>
          </div>
          {availFrom && availTo && availFrom < availTo && (
            <div style={{ background: "rgba(192,57,43,0.07)", border: "1px dashed rgba(192,57,43,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>New availability:</span>
              <span style={{ color: "#e74c3c", fontWeight: 700 }}>{availFrom} – {availTo}</span>
            </div>
          )}
          {error   && <div style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.72rem", color: "#e74c3c" }}>{error}</div>}
          {success && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.72rem", color: "#10b981", fontWeight: 600 }}>✓ {success}</div>}
          <button onClick={handleSave} disabled={loading} style={{
            width: "100%", padding: "13px", borderRadius: 10, minHeight: 46,
            background: loading ? "rgba(192,57,43,0.4)" : "linear-gradient(135deg, #c0392b, #e74c3c)",
            border: "none", color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em",
            textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 20px rgba(192,57,43,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit",
          }}>
            <Save size={13} /> {loading ? "Saving..." : "Save Availability"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifBell({ count, onClick }) {
  return (
    <button onClick={onClick} style={{ position: "relative", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: "white", minWidth: 40, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Bell size={17} />
      {count > 0 && (
        <span style={{ position: "absolute", top: -4, right: -4, background: "#e74c3c", color: "white", borderRadius: "99px", fontSize: "0.58rem", fontWeight: 700, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

/* ─── FIX 1: City Filter — service filter bhi added ────────────────────── */

function FilterBar({ allBookings, selectedCity, onCityChange, selectedService, onServiceChange }) {
  const [showCityDrop,    setShowCityDrop]    = useState(false);
  const [showServiceDrop, setShowServiceDrop] = useState(false);
  const cityRef    = useRef(null);
  const serviceRef = useRef(null);

  const cities   = ["All Cities",   ...new Set(allBookings.map(b => b.city).filter(c => c && c !== "—"))].sort();
  const services = ["All Services", ...new Set(allBookings.map(b => b.service).filter(Boolean))].sort();

  useEffect(() => {
    const handler = e => {
      if (cityRef.current    && !cityRef.current.contains(e.target))    setShowCityDrop(false);
      if (serviceRef.current && !serviceRef.current.contains(e.target)) setShowServiceDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dropStyle = {
    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 999,
    background: "#1a0a0a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, minWidth: 170, maxHeight: 260, overflowY: "auto",
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)", WebkitOverflowScrolling: "touch",
  };
  const itemStyle = (active) => ({
    width: "100%", padding: "10px 14px", textAlign: "left", fontSize: "0.72rem",
    background: active ? "rgba(192,57,43,0.15)" : "transparent",
    border: "none", color: active ? "#e74c3c" : "rgba(255,255,255,0.6)",
    cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
    fontWeight: active ? 600 : 400,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  });
  const btnStyle = (hasFilter) => ({
    display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
    borderRadius: 99, cursor: "pointer",
    border: hasFilter ? "1px solid rgba(192,57,43,0.5)" : "1px solid rgba(255,255,255,0.12)",
    background: hasFilter ? "rgba(192,57,43,0.12)" : "rgba(255,255,255,0.04)",
    color: hasFilter ? "#e74c3c" : "rgba(255,255,255,0.5)",
    fontSize: "0.7rem", fontWeight: 600, fontFamily: "inherit", minHeight: 34,
    transition: "all 0.2s", whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {/* City Filter */}
      <div style={{ position: "relative" }} ref={cityRef}>
        <button onClick={() => { setShowCityDrop(s => !s); setShowServiceDrop(false); }} style={btnStyle(!!selectedCity)}>
          <MapPin size={11} />
          {selectedCity || "City"}
          <ChevronDown size={10} style={{ transform: showCityDrop ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
        {showCityDrop && (
          <div style={dropStyle}>
            {cities.map(city => (
              <button key={city} onClick={() => { onCityChange(city === "All Cities" ? null : city); setShowCityDrop(false); }}
                style={itemStyle((selectedCity === null && city === "All Cities") || selectedCity === city)}>
                📍 {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Service Filter */}
      <div style={{ position: "relative" }} ref={serviceRef}>
        <button onClick={() => { setShowServiceDrop(s => !s); setShowCityDrop(false); }} style={btnStyle(!!selectedService)}>
          <Package size={11} />
          {selectedService ? selectedService.split(" ")[0] : "Service"}
          <ChevronDown size={10} style={{ transform: showServiceDrop ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
        {showServiceDrop && (
          <div style={dropStyle}>
            {services.map(svc => (
              <button key={svc} onClick={() => { onServiceChange(svc === "All Services" ? null : svc); setShowServiceDrop(false); }}
                style={itemStyle((selectedService === null && svc === "All Services") || selectedService === svc)}>
                🔧 {svc}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear filters */}
      {(selectedCity || selectedService) && (
        <button onClick={() => { onCityChange(null); onServiceChange(null); }} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
          borderRadius: 99, border: "1px solid rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.08)", color: "#f87171",
          fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          <X size={9} /> Clear
        </button>
      )}
    </div>
  );
}

/* ─── FIX 2: Booking Card — accept button reliable kiya ────────────────── */

function BookingCard({ booking, onAccept, onDecline, workerId }) {
  const [expanded, setExpanded] = useState(false);
  const [acting,   setActing]   = useState(false);
  const [actMsg,   setActMsg]   = useState("");

  // FIX: String comparison both ways — worker_id number ya string dono handle
  const wid          = workerId ? String(workerId) : null;
  const bwid         = booking.worker_id != null ? String(booking.worker_id) : null;
  const isMyBooking  = !!bwid && !!wid && bwid === wid;
  const isTakenByOther = !!bwid && !isMyBooking;
  // FIX: Pending = worker_id null/empty AND status pending ya koi status nahi
  const isPending = !bwid && ["pending", "new", "", null, undefined].includes(
    (booking.status || "").toLowerCase()
  );

  const displayStatus = isMyBooking
    ? (booking.status || "confirmed")
    : (booking.status || "pending");
  const s    = STATUS_STYLE[displayStatus] || STATUS_STYLE.pending;
  const Icon = SERVICE_ICONS[booking.service] || Package;

  const handleAccept = async (e) => {
    e.stopPropagation(); // card expand na ho
    if (acting) return;
    setActing(true);
    setActMsg("");
    try {
      const result = await onAccept(booking);
      if (result?.error) {
        setActMsg(result.error);
        setActing(false);
      }
      // success case mein parent state update karega, acting false ho jayega
    } catch {
      setActMsg("Something went wrong. Please retry.");
      setActing(false);
    }
  };

  const handleDecline = async (e) => {
    e.stopPropagation();
    if (acting) return;
    setActing(true);
    await onDecline(booking);
    setActing(false);
  };

  return (
    <div style={{
      background: isMyBooking ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.03)",
      border: isMyBooking
        ? "1px solid rgba(16,185,129,0.35)"
        : isTakenByOther ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.09)",
      borderRadius: 14, marginBottom: 10, overflow: "hidden",
      opacity: isTakenByOther ? 0.55 : 1, transition: "all 0.2s",
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            background: isMyBooking ? "rgba(16,185,129,0.12)" : "rgba(231,76,60,0.12)",
            border: `1px solid ${isMyBooking ? "rgba(16,185,129,0.25)" : "rgba(231,76,60,0.2)"}`,
            borderRadius: 10, padding: "8px 9px", flexShrink: 0,
          }}>
            <Icon size={17} color={isMyBooking ? "#10b981" : "#e74c3c"} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "white", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{booking.service}</div>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <MapPin size={9} /> {booking.city || "—"}
              <span style={{ opacity: 0.4 }}>·</span>
              <Clock size={9} /> {fmtDate(booking.created_at)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <span style={{
            fontSize: "0.63rem", fontWeight: 700, padding: "3px 9px", borderRadius: 99,
            color: isTakenByOther ? "#9ca3af" : isMyBooking ? "#10b981" : s.color,
            background: isTakenByOther ? "rgba(156,163,175,0.1)" : isMyBooking ? "rgba(16,185,129,0.12)" : s.bg,
            whiteSpace: "nowrap",
          }}>
            {isTakenByOther ? "Taken" : isMyBooking ? "✓ Accepted" : s.label}
          </span>
          {/* FIX: Accept button card ke bahar bhi visible — pending cards mein directly show */}
          {isPending && (
            <button
              onClick={handleAccept}
              disabled={acting}
              style={{
                padding: "5px 10px", borderRadius: 8, border: "none",
                background: acting ? "rgba(5,150,105,0.3)" : "linear-gradient(135deg,#059669,#10b981)",
                color: "white", fontWeight: 700, fontSize: "0.62rem",
                cursor: acting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 4,
                fontFamily: "inherit", minHeight: 28,
                boxShadow: acting ? "none" : "0 2px 8px rgba(16,185,129,0.3)",
              }}
            >
              {acting
                ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Wait...</>
                : <><CheckCircle size={10} /> Accept</>}
            </button>
          )}
          <ChevronDown size={13} color="rgba(255,255,255,0.2)" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px 16px", marginBottom: 14 }}>
            {[
              ["From",           booking.from_place     || "—"],
              ["To",             booking.to_place       || "—"],
              ["Service Type",   booking.service_type   || booking.service || "—"],
              ["City",           booking.city           || "—"],
              ["Customer Phone", booking.customer_phone || "—"],
              ["Booking Date",   fmtDate(booking.created_at)],
              ["Preferred Time", booking.preferred_time || "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", fontWeight: 600, wordBreak: "break-word" }}>{val}</div>
              </div>
            ))}
          </div>

          {isPending && (
            <>
              {actMsg && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "7px 12px", marginBottom: 10, fontSize: "0.7rem", color: "#f87171", display: "flex", alignItems: "center", gap: 5 }}>
                  <AlertCircle size={11} /> {actMsg}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAccept} disabled={acting} style={{
                  flex: 1, padding: "11px", borderRadius: 8, minHeight: 44,
                  background: acting ? "rgba(5,150,105,0.3)" : "linear-gradient(135deg,#059669,#10b981)",
                  border: "none", color: "white", fontWeight: 700, fontSize: "0.75rem",
                  cursor: acting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  fontFamily: "inherit", transition: "all 0.2s",
                  boxShadow: acting ? "none" : "0 4px 14px rgba(16,185,129,0.3)",
                }}>
                  {acting
                    ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Accepting...</>
                    : <><CheckCircle size={13} /> Accept Booking</>}
                </button>
                <button onClick={handleDecline} disabled={acting} style={{
                  flex: 1, padding: "11px", borderRadius: 8, minHeight: 44,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171", fontWeight: 700, fontSize: "0.75rem",
                  cursor: acting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit",
                }}>
                  <XCircle size={13} /> Decline
                </button>
              </div>
            </>
          )}

          {isMyBooking && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", textAlign: "center", fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
              ✓ You accepted this — contact the customer to proceed.
            </div>
          )}

          {isTakenByOther && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(156,163,175,0.06)", border: "1px solid rgba(156,163,175,0.15)", textAlign: "center", fontSize: "0.72rem", color: "#9ca3af" }}>
              Another worker has already accepted this booking.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── FIX 3: Main Dashboard — fetchBookings aur handleAccept fixed ──────── */

export default function WorkerDashboard() {
  const router = useRouter();
  const [worker,           setWorker]           = useState(null);
  const [token,            setToken]            = useState(null);
  const [bookings,         setBookings]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState("new");
  const [notifOpen,        setNotifOpen]        = useState(false);
  const [notifications,    setNotifications]    = useState([]);
  const [error,            setError]            = useState("");
  const [showAvailModal,   setShowAvailModal]   = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCity,     setSelectedCity]     = useState(null);
  const [selectedService,  setSelectedService]  = useState(null); // NEW

  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("workerIsOnline");
    return stored === null ? true : stored === "true";
  });

  const pollRef      = useRef(null);
  const workerRef    = useRef(null);
  const lastFetchRef = useRef(null);
  const notifRef     = useRef(null);
  const tokenRef     = useRef(null); // FIX: token ref for handleAccept

  useEffect(() => { localStorage.setItem("workerIsOnline", String(isOnline)); }, [isOnline]);

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
      workerRef.current = parsed;
      setToken(t);
      tokenRef.current = t; // FIX
      localStorage.setItem("worker", raw);
    } catch { router.push("/worker/login"); }
  }, [router]);

  // FIX: fetchBookings — status check loosened, worker_id normalised
  const fetchBookings = useCallback(async (tkn, wkr) => {
    const activeToken  = tkn  || tokenRef.current;
    const activeWorker = wkr  || workerRef.current;
    if (!activeToken || !activeWorker) return;

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
          fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${activeToken}` } })
            .then(r => r.ok ? r.json() : [])
            .then(d => Array.isArray(d) ? d : (d?.data ?? d?.bookings ?? d?.results ?? []))
            .catch(() => [])
        )
      );

      const all = [];
      results.forEach((result, i) => {
        if (result.status !== "fulfilled") return;
        const { service } = endpoints[i];
        result.value.forEach(b => {
          // FIX: worker_id ko hamesha string mein store karo, "0" aur "" ko null maano
          const rawWid = b.worker_id;
          const normWid = (rawWid == null || rawWid === 0 || rawWid === "0" || rawWid === "")
            ? null
            : String(rawWid);

          all.push({
            id:             b.id,
            service,
            // FIX: status normalize — "new", blank, null sab ko "pending" maano
            status:         ["new", "", null, undefined].includes(b.status)
                              ? "pending"
                              : (b.status || "pending").toLowerCase(),
            worker_id:      normWid,
            created_at:     b.created_at || b.createdAt || new Date().toISOString(),
            city:           b.city || b.from_city || b.location || "—",
            from_place:     b.from_place || b.from_location || b.from_city || "—",
            to_place:       b.to_place   || b.to_location   || b.to_city   || "—",
            service_type:   b.service_type || service,
            customer_phone: b.customer_phone || b.phone || b.mobile || "—",
            preferred_time: b.preferred_time || b.scheduled_time || b.date || "—",
            user_id:        b.user_id || b.customer_id || 0,
          });
        });
      });

      const sorted = all.sort((a, b_) => new Date(b_.created_at) - new Date(a.created_at));

      // Notifications for new pending bookings
      const prevFetch = lastFetchRef.current;
      if (prevFetch && isOnline) {
        const fresh = sorted.filter(b =>
          new Date(b.created_at) > prevFetch &&
          !b.worker_id &&
          b.status === "pending"
        );
        if (fresh.length > 0) {
          setNotifications(prev => [
            ...fresh.map(b => ({
              id: `new-${b.service}-${b.id}-${Date.now()}`,
              message: `🆕 New ${b.service} booking in ${b.city}`,
              time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              read: false,
            })),
            ...prev,
          ].slice(0, 20));
          if ("Notification" in window && Notification.permission === "granted")
            fresh.forEach(b => new Notification("New Booking Alert!", { body: `New ${b.service} booking in ${b.city}`, icon: "/logo.png" }));
        }
      }

      setBookings(sorted);
      lastFetchRef.current = new Date();
      setError("");
    } catch (e) {
      console.error("fetchBookings error:", e);
      setError("Failed to load bookings. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (!token || !worker) return;
    fetchBookings(token, worker);
    pollRef.current = setInterval(() => fetchBookings(tokenRef.current, workerRef.current), 30_000);
    return () => clearInterval(pollRef.current);
  }, [token, worker?.id]); // eslint-disable-line

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  /* ── FIX: handleAccept — simplified, reliable ── */
  const handleAccept = useCallback(async (booking) => {
    const wkr = workerRef.current;
    const tkn = tokenRef.current;
    if (!wkr || !tkn) return { error: "Session expired. Please login again." };

    const wid = String(wkr.id);
    const ep  = SERVICE_ENDPOINTS[booking.service];

    // Optimistic UI update
    setBookings(prev => prev.map(b =>
      b.id === booking.id && b.service === booking.service
        ? { ...b, status: "confirmed", worker_id: wid }
        : b
    ));

    const payload = {
      bookingId:   booking.id,
      service:     booking.service,
      workerId:    wkr.id,
      workerName:  wkr.name  || "",
      workerPhone: wkr.phone || "",
    };

    // Try 1: Primary worker accept endpoint
    try {
      const r = await fetch(`${API}/worker/accept-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkn}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        _onAcceptSuccess(booking, wkr);
        return { success: true };
      }
    } catch { /* try next */ }

    // Try 2: Service-specific PATCH
    if (ep) {
      try {
        const r = await fetch(`${ep}/${booking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkn}` },
          body: JSON.stringify({ status: "confirmed", worker_id: wkr.id, worker_name: wkr.name, worker_phone: wkr.phone }),
        });
        if (r.ok) {
          _onAcceptSuccess(booking, wkr);
          return { success: true };
        }
      } catch { /* try next */ }

      // Try 3: Service-specific PUT
      try {
        const r = await fetch(`${ep}/${booking.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkn}` },
          body: JSON.stringify({ status: "confirmed", worker_id: wkr.id, worker_name: wkr.name }),
        });
        if (r.ok) {
          _onAcceptSuccess(booking, wkr);
          return { success: true };
        }
      } catch { /* all failed */ }
    }

    // All failed — revert
    setBookings(prev => prev.map(b =>
      b.id === booking.id && b.service === booking.service
        ? { ...b, status: "pending", worker_id: null }
        : b
    ));
    return { error: "Could not accept booking. Please check your connection and try again." };
  }, []);

  function _onAcceptSuccess(booking, wkr) {
    setNotifications(prev => [{
      id: `accepted-${booking.id}-${Date.now()}`,
      message: `✓ Accepted: ${booking.service} in ${booking.city}`,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      read: true,
    }, ...prev].slice(0, 20));
    // Refresh after 1.5s to sync real server state
    setTimeout(() => fetchBookings(tokenRef.current, workerRef.current), 1500);
  }

  const handleDecline = useCallback(async (booking) => {
    setBookings(prev => prev.filter(b => !(b.id === booking.id && b.service === booking.service)));
  }, []);

  const handleLogout = () => {
    clearInterval(pollRef.current);
    ["workerToken","worker","workerData"].forEach(k => localStorage.removeItem(k));
    router.push("/worker/login");
  };

  const handleWorkerUpdate = updated => {
    setWorker(updated);
    workerRef.current = updated;
  };

  const workerId    = worker ? String(worker.id) : null;
  const newBookings = bookings.filter(b => !b.worker_id && b.status === "pending");
  const myBookings  = bookings.filter(b => b.worker_id && String(b.worker_id) === workerId);

  // Apply filters
  const applyFilters = (list) => list.filter(b => {
    if (selectedCity    && b.city    !== selectedCity)    return false;
    if (selectedService && b.service !== selectedService) return false;
    return true;
  });

  const filteredNewBookings = applyFilters(newBookings);
  const filteredMyBookings  = applyFilters(myBookings);
  const filteredAllBookings = applyFilters(bookings);

  const visibleTabs = isOnline
    ? [
        { key: "new",  label: "New Jobs",  count: filteredNewBookings.length },
        { key: "mine", label: "My Jobs",   count: filteredMyBookings.length },
        { key: "all",  label: "All",       count: filteredAllBookings.length },
      ]
    : [
        { key: "mine", label: "My Jobs",   count: filteredMyBookings.length },
        { key: "all",  label: "All",       count: filteredAllBookings.length },
      ];

  const tabBookings = activeTab === "new" ? filteredNewBookings : activeTab === "mine" ? filteredMyBookings : filteredAllBookings;

  if (!worker) return null;

  const hasFilters = selectedCity || selectedService;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { font-family:'Sora',sans-serif; box-sizing:border-box; margin:0; padding:0; }
        html { -webkit-text-size-adjust:100%; }
        body { background:#0d0505; overflow-x:hidden; }
        .dash-root { min-height:100vh; background:#0d0505; }

        .topbar {
          position:sticky; top:0; z-index:100;
          background:rgba(13,5,5,0.96); backdrop-filter:blur(12px);
          border-bottom:1px solid rgba(255,255,255,0.06);
          padding:10px 14px;
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }
        .worker-pill {
          display:flex; align-items:center; gap:8px;
          background:rgba(231,76,60,0.08); border:1px solid rgba(231,76,60,0.2);
          border-radius:99px; padding:6px 12px 6px 6px; cursor:pointer;
          transition:all 0.2s; min-height:44px; overflow:hidden;
          flex-shrink:1; min-width:0;
        }
        .worker-pill:hover { background:rgba(231,76,60,0.14); border-color:rgba(231,76,60,0.4); }
        .worker-avatar {
          width:30px; height:30px; border-radius:50%;
          background:linear-gradient(135deg,#c0392b,#e74c3c);
          display:flex; align-items:center; justify-content:center;
          overflow:hidden; border:1.5px solid rgba(231,76,60,0.4); flex-shrink:0;
        }
        .worker-name { font-size:0.78rem; font-weight:600; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .worker-cat  { font-size:0.6rem; color:rgba(231,76,60,0.8); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .edit-profile-hint { font-size:0.56rem; color:rgba(255,255,255,0.22); display:flex; align-items:center; gap:3px; margin-top:1px; }
        .topbar-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .icon-btn {
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:10px; padding:0; cursor:pointer; color:rgba(255,255,255,0.6);
          transition:all 0.2s; min-width:40px; min-height:40px;
          display:flex; align-items:center; justify-content:center;
        }
        .icon-btn:hover { background:rgba(255,255,255,0.08); color:white; }

        .main-wrap { max-width:860px; margin:0 auto; padding:18px 12px 80px; }
        @media(min-width:640px){ .main-wrap{ padding:24px 20px 60px; } }

        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:20px; }
        @media(max-width:480px){ .stats-row{ grid-template-columns:repeat(2,1fr); gap:8px; } }
        .stat-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px 10px; text-align:center; }
        .stat-num { font-size:1.5rem; font-weight:800; color:#e74c3c; }
        .stat-lbl { font-size:0.6rem; text-transform:uppercase; letter-spacing:0.05em; color:rgba(255,255,255,0.3); margin-top:3px; font-weight:600; }

        .tab-row { display:flex; gap:0; border-bottom:1px solid rgba(255,255,255,0.06); overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .tab-row::-webkit-scrollbar { display:none; }
        .tab-btn { flex:1; min-width:80px; padding:11px 8px; font-size:0.73rem; font-weight:600; letter-spacing:0.04em; background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; transition:all 0.2s; border-bottom:2px solid transparent; margin-bottom:-1px; font-family:inherit; white-space:nowrap; }
        .tab-btn.active { color:#e74c3c; border-bottom-color:#e74c3c; }

        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px; }
        .section-title { font-size:0.9rem; font-weight:700; color:white; }
        .refresh-btn { display:flex; align-items:center; gap:5px; font-size:0.7rem; color:rgba(255,255,255,0.35); background:none; border:1px solid rgba(255,255,255,0.08); cursor:pointer; padding:6px 10px; border-radius:8px; font-family:inherit; min-height:36px; }

        .empty-state { text-align:center; padding:50px 20px; color:rgba(255,255,255,0.2); }
        .empty-icon { font-size:2.6rem; margin-bottom:10px; }
        .empty-title { font-size:0.88rem; font-weight:600; margin-bottom:6px; }
        .empty-sub { font-size:0.73rem; }

        .notif-panel {
          position:fixed; top:60px; right:8px; left:8px; z-index:200;
          background:#1a0a0a; border:1px solid rgba(255,255,255,0.1);
          border-radius:14px; overflow:hidden;
          box-shadow:0 20px 60px rgba(0,0,0,0.6);
          max-height:70vh; display:flex; flex-direction:column;
        }
        @media(min-width:480px){ .notif-panel{ left:auto; width:320px; } }
        .notif-header { padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
        .notif-title { font-size:0.8rem; font-weight:700; color:white; }
        .notif-list  { overflow-y:auto; -webkit-overflow-scrolling:touch; }
        .notif-item  { padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; gap:10px; align-items:flex-start; }
        .notif-dot   { width:7px; height:7px; border-radius:50%; background:#e74c3c; flex-shrink:0; margin-top:5px; }
        .notif-dot.read { background:rgba(255,255,255,0.15); }
        .notif-msg  { font-size:0.72rem; color:rgba(255,255,255,0.7); line-height:1.4; }
        .notif-time { font-size:0.62rem; color:rgba(255,255,255,0.3); margin-top:3px; }

        .poll-indicator { display:flex; align-items:center; gap:5px; font-size:0.65rem; color:rgba(255,255,255,0.2); }
        .pulse-dot { width:6px; height:6px; border-radius:50%; background:#10b981; animation:pulse 2s infinite; }
        .pulse-dot.offline { background:#ef4444; animation:none; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .err-banner { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:10px 14px; font-size:0.75rem; color:#f87171; margin-bottom:14px; }
        .skeleton { border-radius:14px; height:76px; margin-bottom:10px; animation:shimmer 1.4s infinite; background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%); background-size:600px 100%; }
        @keyframes shimmer { from{background-position:-600px 0} to{background-position:600px 0} }
        .avail-row { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .avail-badge { display:inline-flex; align-items:center; gap:5px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:99px; padding:5px 11px; font-size:0.63rem; color:#10b981; font-weight:600; }
        .edit-avail-btn { display:inline-flex; align-items:center; gap:5px; background:rgba(192,57,43,0.08); border:1px solid rgba(192,57,43,0.25); border-radius:99px; padding:5px 11px; font-size:0.63rem; color:#e74c3c; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:inherit; min-height:30px; }
        .edit-avail-btn:hover { background:rgba(192,57,43,0.16); border-color:rgba(192,57,43,0.45); }
        .worker-info-row { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:18px; }
        .worker-info-title { font-size:1.15rem; font-weight:800; color:white; margin-bottom:4px; }
        .worker-info-sub { font-size:0.7rem; color:rgba(255,255,255,0.35); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

        /* FIX: filter bar + tabs layout */
        .tabs-filter-wrap { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
        .filter-active-badge { display:inline-flex; align-items:center; gap:4px; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.25); border-radius:6px; padding:4px 10px; font-size:0.65rem; color:#e74c3c; font-weight:600; }

        @media(max-width:360px){
          .online-label { display:none; }
          .worker-pill { padding:6px 8px 6px 6px; }
        }
      `}</style>

      {showAvailModal && (
        <AvailabilityModal worker={worker} token={token} onClose={() => setShowAvailModal(false)} onSaved={handleWorkerUpdate} />
      )}
      {showProfileModal && (
        <WorkerProfileModal worker={worker} token={token} onClose={() => setShowProfileModal(false)} onSaved={handleWorkerUpdate} />
      )}

      <div className="dash-root">

        {/* TOP BAR */}
        <div className="topbar">
          <div className="worker-pill" onClick={() => setShowProfileModal(true)} title="Edit your profile">
            <div className="worker-avatar">
              {(worker.profileImage || worker.avatar)
                ? <img src={worker.profileImage || worker.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <HardHat size={13} color="white" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="worker-name">{worker.name || "Worker"}</div>
              <div className="worker-cat">{worker.serviceCategory || "All Services"}</div>
              <div className="edit-profile-hint"><Pencil size={7} /> Edit profile</div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="poll-indicator">
              <div className={`pulse-dot ${!isOnline ? "offline" : ""}`} />
              <span className="online-label">{isOnline ? "Live" : "Offline"}</span>
            </div>
            <OnlineToggle isOnline={isOnline} onToggle={handleToggleOnline} />
            <div style={{ position: "relative" }} ref={notifRef}>
              <NotifBell count={notifications.filter(n => !n.read).length} onClick={() => {
                setNotifOpen(o => !o);
                if (!notifOpen) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              }} />
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-header">
                    <span className="notif-title">🔔 Notifications</span>
                    <button onClick={() => setNotifications([])} style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", minHeight: 32 }}>
                      Clear all
                    </button>
                  </div>
                  <div className="notif-list">
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
                      ))}
                  </div>
                </div>
              )}
            </div>
            <button className="icon-btn" onClick={handleLogout} title="Logout"><LogOut size={15} /></button>
          </div>
        </div>

        <div className="main-wrap">

          {!isOnline && <OfflineBanner onGoOnline={() => { setIsOnline(true); setActiveTab("new"); }} />}

          {/* Worker info */}
          <div className="worker-info-row">
            <div>
              <div className="worker-info-title">My Dashboard</div>
              <div className="worker-info-sub">
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={10} /> {worker.city || "—"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={10} /> {worker.phone || "—"}</span>
              </div>
            </div>
            <div className="avail-row">
              <span className="avail-badge"><Clock size={10} /> {worker.availability || "Not set"}</span>
              <button className="edit-avail-btn" onClick={() => setShowAvailModal(true)}>
                <Pencil size={9} /> Time
              </button>
              <button className="edit-avail-btn" onClick={() => setShowProfileModal(true)}
                style={{ background: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.25)", color: "#60a5fa" }}>
                <User size={9} /> Profile
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { num: filteredNewBookings.length,                                       lbl: "Available" },
              { num: filteredMyBookings.length,                                        lbl: "My Jobs" },
              { num: filteredMyBookings.filter(b => b.status === "completed").length,  lbl: "Completed" },
              { num: filteredAllBookings.length,                                       lbl: "Total" },
            ].map(s => (
              <div key={s.lbl} className="stat-card">
                <div className="stat-num">{s.num}</div>
                <div className="stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          {error && (
            <div className="err-banner">
              ⚠ {error}
              <button onClick={() => fetchBookings(tokenRef.current, workerRef.current)} style={{ marginLeft: 8, textDecoration: "underline", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.75rem", fontFamily: "inherit" }}>
                Retry
              </button>
            </div>
          )}

          {/* Tabs + Filters */}
          <div className="tabs-filter-wrap">
            <div className="tab-row">
              {visibleTabs.map(t => (
                <button key={t.key} className={`tab-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
                  {t.label} <span style={{ opacity: 0.6, fontSize: "0.65rem" }}>({t.count})</span>
                </button>
              ))}
            </div>
            <FilterBar
              allBookings={bookings}
              selectedCity={selectedCity}
              onCityChange={setSelectedCity}
              selectedService={selectedService}
              onServiceChange={setSelectedService}
            />
          </div>

          {/* Section header */}
          <div className="section-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div className="section-title">
                {activeTab === "new"  && "Available Bookings"}
                {activeTab === "mine" && "My Confirmed Jobs"}
                {activeTab === "all"  && "All Bookings"}
              </div>
              {hasFilters && (
                <div className="filter-active-badge">
                  🔍 {[selectedCity, selectedService].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <button className="refresh-btn" onClick={() => fetchBookings(tokenRef.current, workerRef.current)}>
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {loading && [1, 2, 3].map(i => <div key={i} className="skeleton" />)}

          {!loading && tabBookings.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">{activeTab === "new" ? "🔔" : activeTab === "mine" ? "📋" : "📂"}</div>
              <div className="empty-title">
                {hasFilters
                  ? `No bookings for selected filter`
                  : activeTab === "new"  ? "No new bookings right now"
                  : activeTab === "mine" ? "No accepted bookings yet"
                  : "No bookings found"}
              </div>
              <div className="empty-sub">
                {hasFilters && "Try clearing the filter to see all bookings."}
                {!hasFilters && activeTab === "new"  && "Auto-refreshes every 30 seconds."}
                {!hasFilters && activeTab === "mine" && "Accept a booking from the New tab."}
                {!hasFilters && activeTab === "all"  && "Bookings will show here once placed."}
              </div>
            </div>
          )}

          {!loading && tabBookings.map(b => (
            <BookingCard
              key={`${b.service}-${b.id}`}
              booking={b}
              onAccept={handleAccept}
              onDecline={handleDecline}
              workerId={workerId}
            />
          ))}

        </div>
      </div>
    </>
  );
}