"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  confirmed:   { label: "Confirmed",   color: "#2979d4", bg: "rgba(41,121,212,0.12)",  dot: "#2979d4" },
  in_progress: { label: "In Progress", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  dot: "#8b5cf6" },
  completed:   { label: "Completed",   color: "#10b981", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  cancelled:   { label: "Cancelled",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
};

const PAYMENT_CONFIG = {
  paid:    { label: "Paid",             color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "✅" },
  cod:     { label: "Cash on Delivery", color: "#ca8a04", bg: "rgba(202,138,4,0.12)",  icon: "💵" },
  pending: { label: "Unpaid",           color: "#ef4444", bg: "rgba(239,68,68,0.10)",  icon: "❌" },
  free:    { label: "Free",             color: "#6b7280", bg: "rgba(107,114,128,0.10)",icon: "🎁" },
};

const SERVICE_ICONS = {
  "Home Shifting":       "🏠",
  "Cleaning":            "🧹",
  "Office Relocation":   "🏢",
  "Packing & Unpacking": "📦",
  "Storage":             "🏪",
  "Vehicle Transport":   "🚗",
};

const SERVICE_API_MAP = {
  "Home Shifting":       "/api/home-shifting",
  "Cleaning":            "/api/cleaning-booking",
  "Office Relocation":   "/api/office-relocation",
  "Packing & Unpacking": "/api/packing",
  "Storage":             "/api/storage-booking",
  "Vehicle Transport":   "/api/vehicle-transport",
};

// ── Tracking Steps (shown when status = confirmed or in_progress) ────────
const TRACKING_STEPS = [
  { key: "booking_placed",   label: "Booking Placed",       icon: "📋", desc: "Your booking has been received" },
  { key: "worker_assigned",  label: "Worker Assigned",      icon: "👷", desc: "A worker has been assigned to your booking" },
  { key: "worker_accepted",  label: "Worker Accepted",      icon: "✅", desc: "Worker accepted and is preparing" },
  { key: "worker_on_the_way",label: "Worker On The Way",    icon: "🚗", desc: "Worker is heading to your location" },
  { key: "arrived",          label: "Worker Arrived",       icon: "📍", desc: "Worker has arrived at your location" },
  { key: "in_progress",      label: "Service In Progress",  icon: "⚡", desc: "Service is currently being done" },
  { key: "completed",        label: "Service Completed",    icon: "🎉", desc: "Your service has been completed" },
];

// Map booking status → which tracking step is "active"
function getTrackingStepIndex(booking) {
  const s = booking.status;
  const ts = booking.tracking_status; // optional fine-grained field from API
  if (s === "pending")     return 0;
  if (s === "confirmed") {
    if (ts === "worker_on_the_way") return 3;
    if (ts === "arrived")           return 4;
    if (ts === "worker_accepted")   return 2;
    return 1; // worker_assigned by default when confirmed
  }
  if (s === "in_progress") return 5;
  if (s === "completed")   return 6;
  return 0;
}

const FILTERS = [
  { key: "all",         label: "All" },
  { key: "pending",     label: "Pending" },
  { key: "confirmed",   label: "Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed" },
  { key: "cancelled",   label: "Cancelled" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function toTitleCase(str) {
  if (!str) return "—";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolvePaymentStatus(b) {
  if (b.payment_status) return b.payment_status;
  if (b.payment_method === "cod" || b.payment_method === "cash_on_delivery") return "cod";
  if (b.razorpay_payment_id || b.payment_id) return "paid";
  return "pending";
}

async function fetchAllBookings(userEmail) {
  if (!userEmail) return [];

  const endpoints = [
    { url: "/api/home-shifting",     service: "Home Shifting" },
    { url: "/api/cleaning-booking",  service: "Cleaning" },
    { url: "/api/office-relocation", service: "Office Relocation" },
    { url: "/api/packing",           service: "Packing & Unpacking" },
    { url: "/api/storage-booking",   service: "Storage" },
    { url: "/api/vehicle-transport", service: "Vehicle Transport" },
  ];

  const results = await Promise.allSettled(
    endpoints.map(({ url }) =>
      fetch(`${url}?email=${encodeURIComponent(userEmail)}`, { cache: "no-store" })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : [])
        .catch(() => [])
    )
  );

  const all = [];
  results.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const { service } = endpoints[i];
    result.value.forEach(b => {
      if (!b.customer_email) return;
      if (b.customer_email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) return;
      all.push({
        id:              b.id,
        service,
        status:          b.status || "pending",
        tracking_status: b.tracking_status || null,
        worker_name:     b.worker_name || b.assigned_worker || null,
        worker_phone:    b.worker_phone || null,
        worker_eta:      b.worker_eta  || null,
        worker_location: b.worker_location || null,
        accepted_at:     b.accepted_at || null,
        payment_status:  resolvePaymentStatus(b),
        payment_method:  b.payment_method || "—",
        payment_id:      b.razorpay_payment_id || b.payment_id || null,
        payment_amount:  b.payment_amount || b.amount || null,
        paid_at:         b.paid_at || b.payment_date || null,
        created_at:      b.created_at,
        city:            b.city || b.from_city || "—",
        from:            b.from_place || b.from_location || b.from_city || "—",
        to:              b.to_place   || b.to_location   || b.to_city   || "—",
        service_type:    b.service_type || b.cleaning_type || b.vehicle_type || "—",
        vehicle_type:    b.vehicle_type || "—",
        ref:             b.ref_id || b.booking_ref || `#${b.id}`,
        pickup_floor:    b.pickup_floor  || "—",
        pickup_access:   b.pickup_access || "—",
        drop_floor:      b.drop_floor    || "—",
        drop_access:     b.drop_access   || "—",
        property_type:   b.property_type || "—",
        frequency:       b.frequency     || "—",
        preferred_time:  b.preferred_time || "—",
        transport_mode:  b.transport_mode || "—",
        customer_name:   b.customer_name || b.name || "Customer",
        customer_email:  b.customer_email,
        customer_phone:  b.customer_phone || b.phone || "",
      });
    });
  });

  return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ── Fetch live tracking update for a single booking ──────────────────────
async function fetchBookingTracking(booking) {
  const endpoint = SERVICE_API_MAP[booking.service];
  if (!endpoint) return null;
  try {
    const res = await fetch(
      `${endpoint}/${booking.id}/tracking`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Load Razorpay script ──────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Live Tracking Panel ───────────────────────────────────────────────────
function LiveTrackingPanel({ booking, onUpdate }) {
  const activeStep   = getTrackingStepIndex(booking);
  const showTracking = ["confirmed", "in_progress", "completed"].includes(booking.status);
  const isLive       = ["confirmed", "in_progress"].includes(booking.status);
  const intervalRef  = useRef(null);
  const [lastPoll, setLastPoll] = useState(null);

  // Poll for live updates every 30s while booking is active
  useEffect(() => {
    if (!isLive) return;
    const poll = async () => {
      const data = await fetchBookingTracking(booking);
      if (data) {
        setLastPoll(new Date());
        onUpdate(booking.id, booking.service, data);
      }
    };
    poll();
    intervalRef.current = setInterval(poll, 30000);
    return () => clearInterval(intervalRef.current);
  }, [booking.id, booking.status, isLive]);

  if (!showTracking) return null;

  return (
    <div className="tracking-panel">
      {/* Header */}
      <div className="tracking-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>📡</span>
          <div>
            <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--nav-text, #0f172a)" }}>
              Live Tracking
            </div>
            {isLive && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span className="live-dot" />
                <span style={{ fontSize: ".65rem", color: "#10b981", fontWeight: 600 }}>LIVE</span>
                {lastPoll && (
                  <span style={{ fontSize: ".62rem", color: "#9ca3af", marginLeft: 4 }}>
                    Updated {new Date(lastPoll).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Worker info pill */}
        {booking.worker_name && (
          <div className="worker-pill">
            <span style={{ fontSize: ".9rem" }}>👷</span>
            <div>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--nav-text, #0f172a)" }}>
                {booking.worker_name}
              </div>
              {booking.worker_phone && (
                <a href={`tel:${booking.worker_phone}`}
                  style={{ fontSize: ".65rem", color: "#2979d4", fontWeight: 600, textDecoration: "none" }}>
                  📞 {booking.worker_phone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ETA banner */}
      {booking.worker_eta && ["confirmed", "in_progress"].includes(booking.status) && (
        <div className="eta-banner">
          <span style={{ fontSize: "1rem" }}>🕐</span>
          <span style={{ fontSize: ".8rem", fontWeight: 600, color: "#2979d4" }}>
            ETA: <strong>{booking.worker_eta}</strong>
          </span>
          {booking.worker_location && (
            <span style={{ fontSize: ".75rem", color: "#6b7280", marginLeft: 8 }}>
              📍 {booking.worker_location}
            </span>
          )}
        </div>
      )}

      {/* Steps timeline */}
      <div className="tracking-steps">
        {TRACKING_STEPS.map((step, idx) => {
          const isDone    = idx < activeStep;
          const isCurrent = idx === activeStep;
          const isFuture  = idx > activeStep;

          return (
            <div key={step.key} className="tracking-step">
              {/* Connector line */}
              {idx < TRACKING_STEPS.length - 1 && (
                <div className={`step-line ${isDone || isCurrent ? "done" : ""}`} />
              )}

              {/* Icon */}
              <div className={`step-icon ${isDone ? "done" : isCurrent ? "current" : "future"}`}>
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: ".7rem" }}>{step.icon}</span>
                )}
              </div>

              {/* Label */}
              <div className="step-text">
                <div style={{
                  fontSize: ".8rem",
                  fontWeight: isCurrent ? 700 : 600,
                  color: isDone ? "#10b981" : isCurrent ? "#2979d4" : "#9ca3af",
                }}>
                  {step.label}
                  {isCurrent && isLive && <span className="pulse-chip">NOW</span>}
                </div>
                {(isDone || isCurrent) && (
                  <div style={{ fontSize: ".68rem", color: "#9ca3af", marginTop: 2 }}>
                    {step.desc}
                    {isCurrent && booking.accepted_at && (
                      <span style={{ marginLeft: 6, color: "#b0b8c4" }}>
                        · {fmtDate(booking.accepted_at)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Payment Badge ──────────────────────────────────────────────────────────
function PaymentBadge({ status }) {
  const pc = PAYMENT_CONFIG[status] || PAYMENT_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: ".68rem", fontWeight: 700,
      padding: "4px 10px", borderRadius: 99,
      color: pc.color, backgroundColor: pc.bg,
      whiteSpace: "nowrap",
    }}>
      {pc.icon} {pc.label}
    </span>
  );
}

// ── Pay Now Button ─────────────────────────────────────────────────────────
function PayNowButton({ booking, onSuccess }) {
  const [paying, setPaying] = useState(false);
  const [err, setErr]       = useState(null);

  const canPay =
    booking.payment_status === "pending" &&
    booking.payment_amount &&
    Number(booking.payment_amount) > 0;

  if (!canPay) return null;

  const handlePay = async () => {
    setErr(null);
    setPaying(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setErr("Payment gateway could not load. Check your internet connection.");
      setPaying(false);
      return;
    }
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(booking.payment_amount),
          booking_id: booking.id,
          service: booking.service,
          ref: booking.ref,
        }),
      });
      if (!orderRes.ok) throw new Error("Could not create payment order.");
      const { order_id, key_id, currency = "INR" } = await orderRes.json();

      const options = {
        key: key_id,
        amount: Number(booking.payment_amount) * 100,
        currency,
        name: "Your Company Name",
        description: `${booking.service} — ${booking.ref}`,
        order_id,
        prefill: {
          name: booking.customer_name, email: booking.customer_email, contact: booking.customer_phone,
        },
        theme: { color: "#2979d4" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                booking_id:   booking.id,
                service:      booking.service,
                api_endpoint: SERVICE_API_MAP[booking.service],
              }),
            });
            if (!verifyRes.ok) throw new Error("Payment verification failed.");
            const result = await verifyRes.json();
            if (result.success) {
              onSuccess({ bookingId: booking.id, service: booking.service, payment_id: response.razorpay_payment_id, paid_at: new Date().toISOString() });
            } else {
              setErr("Payment verification failed. Please contact support.");
            }
          } catch (e) {
            setErr(e.message || "Verification error.");
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        setErr(`Payment failed: ${resp.error?.description || "Unknown error"}`);
        setPaying(false);
      });
      rzp.open();
    } catch (e) {
      setErr(e.message || "Something went wrong.");
      setPaying(false);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <button onClick={handlePay} disabled={paying} style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 22px",
        background: paying ? "#94a3b8" : "linear-gradient(135deg, #2979d4, #1d5baa)",
        color: "#fff", border: "none", borderRadius: 12,
        fontSize: ".85rem", fontWeight: 700,
        cursor: paying ? "not-allowed" : "pointer",
        boxShadow: paying ? "none" : "0 4px 16px rgba(41,121,212,0.35)",
        transition: "all .2s", fontFamily: "'Sora', sans-serif",
      }}>
        {paying ? (
          <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />Processing…</>
        ) : (
          <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>Pay Now ₹{Number(booking.payment_amount).toLocaleString("en-IN")}</>
        )}
      </button>
      {err && (
        <div style={{ marginTop: 8, fontSize: ".76rem", color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "8px 12px", borderRadius: 8, fontWeight: 500 }}>
          ⚠️ {err}
        </div>
      )}
    </div>
  );
}

// ── Success Toast ──────────────────────────────────────────────────────────
function SuccessToast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "#10b981", color: "#fff", padding: "14px 24px", borderRadius: 14,
      fontSize: ".87rem", fontWeight: 700, boxShadow: "0 8px 32px rgba(16,185,129,.45)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 10,
      animation: "slideUp .35s ease", fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: "1.1rem" }}>🎉</span>
      {message}
      <button onClick={onClose} style={{
        background: "rgba(255,255,255,.25)", border: "none", color: "#fff",
        borderRadius: "50%", width: 20, height: 20, cursor: "pointer",
        fontSize: ".7rem", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 6,
      }}>✕</button>
    </div>
  );
}

// ── Single Booking Card ────────────────────────────────────────────────────
function BookingCard({ booking, index, onPaymentSuccess, onTrackingUpdate }) {
  const [expanded, setExpanded]     = useState(false);
  const [localBooking, setLocalBooking] = useState(booking);
  const [activeTab, setActiveTab]   = useState("details"); // "details" | "tracking"

  const sc   = STATUS_CONFIG[localBooking.status] || STATUS_CONFIG.pending;
  const icon = SERVICE_ICONS[localBooking.service] || "📋";
  const pc   = PAYMENT_CONFIG[localBooking.payment_status] || PAYMENT_CONFIG.pending;

  const showTracking = ["confirmed", "in_progress", "completed"].includes(localBooking.status);
  const isLive       = ["confirmed", "in_progress"].includes(localBooking.status);

  // Auto-open tracking tab when booking is live
  useEffect(() => {
    if (isLive && expanded) setActiveTab("tracking");
  }, [isLive, expanded]);

  const handlePaymentSuccess = useCallback((info) => {
    setLocalBooking(prev => ({ ...prev, payment_status: "paid", payment_id: info.payment_id, paid_at: info.paid_at }));
    setExpanded(true);
    onPaymentSuccess(info);
  }, [onPaymentSuccess]);

  const handleTrackingUpdate = useCallback((id, service, data) => {
    setLocalBooking(prev => ({
      ...prev,
      status:          data.status          || prev.status,
      tracking_status: data.tracking_status || prev.tracking_status,
      worker_name:     data.worker_name     || prev.worker_name,
      worker_phone:    data.worker_phone    || prev.worker_phone,
      worker_eta:      data.worker_eta      || prev.worker_eta,
      worker_location: data.worker_location || prev.worker_location,
      accepted_at:     data.accepted_at     || prev.accepted_at,
    }));
    onTrackingUpdate(id, service, data);
  }, [onTrackingUpdate]);

  return (
    <div className="booking-card" style={{ animationDelay: `${index * 70}ms` }}>

      {/* Collapsed header */}
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-left">
          <div className="service-row">
            <span className="svc-icon">{icon}</span>
            <div>
              <div className="service-name">{localBooking.service}</div>
              <div className="service-sub">{toTitleCase(localBooking.service_type)}</div>
            </div>
          </div>
          <div className="meta-row">
            <span className="booking-id-pill">{localBooking.ref}</span>
            <PaymentBadge status={localBooking.payment_status} />
            {isLive && (
              <span className="live-badge">
                <span className="live-dot" /> LIVE
              </span>
            )}
            <span className="booking-date">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {fmtDate(localBooking.created_at)}
            </span>
          </div>
        </div>

        <div className="header-right">
          <span className="status-badge" style={{ color: sc.color, backgroundColor: sc.bg }}>
            <span className="dot" style={{ backgroundColor: sc.dot }} />
            {sc.label}
          </span>
          {localBooking.payment_status === "pending" && localBooking.payment_amount && (
            <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#2979d4", background: "rgba(41,121,212,0.10)", padding: "3px 8px", borderRadius: 99, cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setExpanded(true); setActiveTab("details"); }}>
              💳 Pay Now
            </span>
          )}
          {isLive && (
            <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#8b5cf6", background: "rgba(139,92,246,0.10)", padding: "3px 8px", borderRadius: 99, cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setExpanded(true); setActiveTab("tracking"); }}>
              📡 Track
            </span>
          )}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transition: "transform .25s", transform: expanded ? "rotate(180deg)" : "none", opacity: .35, marginTop: 4 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Expanded area */}
      {expanded && (
        <div className="card-details">
          <div className="detail-divider" />

          {/* Tab bar — only show if tracking is available */}
          {showTracking && (
            <div className="tab-bar">
              <button
                className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
                onClick={() => setActiveTab("details")}>
                📋 Details
              </button>
              <button
                className={`tab-btn ${activeTab === "tracking" ? "active" : ""}`}
                onClick={() => setActiveTab("tracking")}>
                📡 Tracking {isLive && <span className="live-dot" style={{ marginLeft: 5 }} />}
              </button>
            </div>
          )}

          {/* ── TRACKING TAB ─────────────────────────────────────────── */}
          {activeTab === "tracking" && showTracking && (
            <LiveTrackingPanel
              booking={localBooking}
              onUpdate={handleTrackingUpdate}
            />
          )}

          {/* ── DETAILS TAB ──────────────────────────────────────────── */}
          {(!showTracking || activeTab === "details") && (
            <>
              {/* Payment block */}
              <div className="payment-block" style={{
                backgroundColor: pc.bg, border: `1px solid ${pc.color}33`, borderRadius: 14, padding: "14px 16px", marginBottom: 18,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1.3rem" }}>{pc.icon}</span>
                    <div>
                      <div style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#9ca3af" }}>Payment Status</div>
                      <div style={{ fontSize: ".95rem", fontWeight: 700, color: pc.color, marginTop: 1 }}>{pc.label}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {localBooking.payment_amount && (
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--nav-text, #0f172a)" }}>
                        ₹{Number(localBooking.payment_amount).toLocaleString("en-IN")}
                      </div>
                    )}
                    {localBooking.payment_method && localBooking.payment_method !== "—" && (
                      <div style={{ fontSize: ".7rem", color: "#9ca3af", fontWeight: 600, marginTop: 1 }}>
                        via {toTitleCase(localBooking.payment_method)}
                      </div>
                    )}
                  </div>
                </div>
                {(localBooking.payment_id || localBooking.paid_at) && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${pc.color}22`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                    {localBooking.payment_id && (
                      <div>
                        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".05em", color: "#9ca3af", fontWeight: 700 }}>Payment ID</div>
                        <div style={{ fontSize: ".72rem", fontFamily: "monospace", color: "var(--nav-text, #1e293b)", fontWeight: 600, marginTop: 2, wordBreak: "break-all" }}>{localBooking.payment_id}</div>
                      </div>
                    )}
                    {localBooking.paid_at && (
                      <div>
                        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".05em", color: "#9ca3af", fontWeight: 700 }}>Paid On</div>
                        <div style={{ fontSize: ".76rem", color: "var(--nav-text, #1e293b)", fontWeight: 600, marginTop: 2 }}>{fmtDate(localBooking.paid_at)}</div>
                      </div>
                    )}
                  </div>
                )}
                {localBooking.payment_status === "cod" && (
                  <div style={{ marginTop: 10, fontSize: ".75rem", color: "#ca8a04", fontWeight: 500 }}>
                    💡 Pay ₹{localBooking.payment_amount ? Number(localBooking.payment_amount).toLocaleString("en-IN") : "—"} in cash when our executive arrives.
                  </div>
                )}
                {localBooking.payment_status === "pending" && (
                  <>
                    <div style={{ marginTop: 10, fontSize: ".75rem", color: "#ef4444", fontWeight: 500 }}>
                      ⚠️ Payment not received yet. Pay online now to confirm your booking.
                    </div>
                    <PayNowButton booking={localBooking} onSuccess={handlePaymentSuccess} />
                  </>
                )}
              </div>

              {/* Route block */}
              <div className="location-block">
                <div className="loc-row">
                  <div className="loc-dot city-dot" />
                  <div>
                    <div className="route-label">From</div>
                    <div className="route-value">{localBooking.from}</div>
                  </div>
                </div>
                {localBooking.to !== "—" && (
                  <>
                    <div className="route-line" />
                    <div className="loc-row">
                      <div className="loc-dot addr-dot" />
                      <div>
                        <div className="route-label">To</div>
                        <div className="route-value">{localBooking.to}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Detail grid */}
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Booking Ref</span><span className="detail-val mono">{localBooking.ref}</span></div>
                <div className="detail-item"><span className="detail-label">City</span><span className="detail-val">{localBooking.city}</span></div>
                <div className="detail-item"><span className="detail-label">Service Type</span><span className="detail-val">{toTitleCase(localBooking.service_type)}</span></div>
                {localBooking.service === "Cleaning" && (<>
                  <div className="detail-item"><span className="detail-label">Property Type</span><span className="detail-val">{localBooking.property_type}</span></div>
                  <div className="detail-item"><span className="detail-label">Preferred Time</span><span className="detail-val">{localBooking.preferred_time}</span></div>
                  <div className="detail-item"><span className="detail-label">Frequency</span><span className="detail-val">{localBooking.frequency}</span></div>
                </>)}
                {localBooking.service === "Vehicle Transport" && (
                  <div className="detail-item"><span className="detail-label">Transport Mode</span><span className="detail-val">{localBooking.transport_mode}</span></div>
                )}
                {["Home Shifting", "Office Relocation", "Packing & Unpacking", "Storage"].includes(localBooking.service) && (<>
                  <div className="detail-item"><span className="detail-label">Pickup Floor</span><span className="detail-val">{localBooking.pickup_floor}</span></div>
                  <div className="detail-item"><span className="detail-label">Pickup Access</span><span className="detail-val">{toTitleCase(localBooking.pickup_access)}</span></div>
                  <div className="detail-item"><span className="detail-label">Drop Floor</span><span className="detail-val">{localBooking.drop_floor}</span></div>
                  <div className="detail-item"><span className="detail-label">Drop Access</span><span className="detail-val">{toTitleCase(localBooking.drop_access)}</span></div>
                </>)}
                <div className="detail-item"><span className="detail-label">Booking Status</span><span className="detail-val" style={{ color: sc.color, fontWeight: 700 }}>{sc.label}</span></div>
                <div className="detail-item"><span className="detail-label">Booked On</span><span className="detail-val">{fmtDate(localBooking.created_at)}</span></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [filter, setFilter]       = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [user, setUser]           = useState(null);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    let userData = null;
    const stored = localStorage.getItem("user");
    if (stored) {
      try { userData = JSON.parse(stored); setUser(userData); } catch {}
    }
    if (!userData?.email) {
      setError("Please log in to view your bookings.");
      setLoading(false);
      return;
    }
    fetchAllBookings(userData.email)
      .then(setBookings)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handlePaymentSuccess = useCallback((info) => {
    setBookings(prev => prev.map(b =>
      b.id === info.bookingId && b.service === info.service
        ? { ...b, payment_status: "paid", payment_id: info.payment_id, paid_at: info.paid_at }
        : b
    ));
    setToast({ message: `Payment successful! ID: ${info.payment_id.slice(-8)}` });
  }, []);

  const handleTrackingUpdate = useCallback((id, service, data) => {
    setBookings(prev => prev.map(b => {
      if (b.id !== id || b.service !== service) return b;
      const wasLive = ["confirmed", "in_progress"].includes(b.status);
      const isNowCompleted = data.status === "completed";
      if (!wasLive && isNowCompleted) {
        setToast({ message: `Service completed! Great experience? Rate your worker.` });
      }
      return {
        ...b,
        status:          data.status          || b.status,
        tracking_status: data.tracking_status || b.tracking_status,
        worker_name:     data.worker_name     || b.worker_name,
        worker_phone:    data.worker_phone    || b.worker_phone,
        worker_eta:      data.worker_eta      || b.worker_eta,
        worker_location: data.worker_location || b.worker_location,
        accepted_at:     data.accepted_at     || b.accepted_at,
      };
    }));
  }, []);

  const count    = (s) => bookings.filter(b => b.status === s).length;
  const payCount = (p) => bookings.filter(b => b.payment_status === p).length;

  const filtered = bookings
    .filter(b => filter === "all"    || b.status === filter)
    .filter(b => payFilter === "all" || b.payment_status === payFilter);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        .bookings-root { min-height:100vh; background:var(--page-bg,#f8fafc); font-family:'Sora',sans-serif; padding:100px 16px 60px; }
        .bookings-wrap { max-width:860px; margin:0 auto; }
        .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:12px; }
        .page-title { font-size:1.7rem; font-weight:700; color:var(--nav-text,#0f172a); letter-spacing:-.02em; }
        .page-title span { color:#2979d4; }
        .user-email { font-size:.8rem; color:#9ca3af; margin-top:3px; }
        .back-btn { display:inline-flex; align-items:center; gap:6px; font-size:.82rem; font-weight:600; color:#2979d4; padding:7px 14px; border:1.5px solid #2979d4; border-radius:10px; transition:all .2s; text-decoration:none; }
        .back-btn:hover { background:#2979d4; color:#fff; }
        .stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:20px; }
        @media(max-width:620px) { .stats-row { grid-template-columns:repeat(3,1fr); } }
        @media(max-width:380px) { .stats-row { grid-template-columns:repeat(2,1fr); } }
        .stat-card { background:var(--card-bg,#fff); border:1px solid var(--border-color,#e5e7eb); border-radius:14px; padding:14px 10px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .stat-num { font-size:1.5rem; font-weight:700; color:#2979d4; }
        .stat-lbl { font-size:.65rem; color:#6b7280; font-weight:600; margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
        .pay-summary { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .pay-summary-item { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:99px; font-size:.76rem; font-weight:600; cursor:pointer; border:1.5px solid transparent; transition:all .18s; }
        .pay-summary-item.active { border-color:currentColor; }
        .filter-label { font-size:.68rem; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
        .filter-row { display:flex; gap:8px; margin-bottom:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
        .filter-row::-webkit-scrollbar { display:none; }
        .filter-pill { flex-shrink:0; padding:7px 14px; border-radius:99px; font-size:.78rem; font-weight:600; cursor:pointer; border:1.5px solid var(--border-color,#e5e7eb); background:var(--card-bg,#fff); color:var(--nav-text-muted,#6b7280); transition:all .18s; }
        .filter-pill.active,.filter-pill:hover { background:#2979d4; color:#fff; border-color:#2979d4; }
        .filter-section { margin-bottom:20px; }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        .booking-card { background:var(--card-bg,#fff); border:1px solid var(--border-color,#e5e7eb); border-radius:18px; margin-bottom:14px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.04); animation:slideUp .38s ease both; transition:box-shadow .2s,border-color .2s; }
        .booking-card:hover { box-shadow:0 6px 24px rgba(41,121,212,.10); border-color:#bfdbfe; }
        .card-header { display:flex; justify-content:space-between; align-items:flex-start; padding:18px 20px; cursor:pointer; gap:14px; user-select:none; }
        .header-left { flex:1; min-width:0; }
        .header-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }
        .service-row { display:flex; align-items:flex-start; gap:10px; margin-bottom:8px; }
        .svc-icon { font-size:1.5rem; line-height:1; flex-shrink:0; }
        .service-name { font-size:.98rem; font-weight:700; color:var(--nav-text,#0f172a); line-height:1.3; }
        .service-sub { font-size:.74rem; color:#9ca3af; font-weight:500; margin-top:2px; }
        .meta-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
        .booking-id-pill { font-size:.68rem; font-weight:700; color:#2979d4; background:rgba(41,121,212,.09); padding:3px 9px; border-radius:99px; font-family:'JetBrains Mono',monospace; }
        .booking-date { display:flex; align-items:center; gap:4px; font-size:.72rem; color:#9ca3af; font-weight:500; }
        .status-badge { display:inline-flex; align-items:center; gap:5px; font-size:.7rem; font-weight:700; padding:5px 11px; border-radius:99px; white-space:nowrap; }
        .dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .live-dot { width:7px; height:7px; border-radius:50%; background:#10b981; display:inline-block; flex-shrink:0; animation:pulse 1.5s ease-in-out infinite; }
        .live-badge { display:inline-flex; align-items:center; gap:5px; font-size:.65rem; font-weight:700; color:#10b981; background:rgba(16,185,129,0.10); padding:3px 8px; border-radius:99px; }
        .detail-divider { height:1px; background:var(--border-color,#f0f0f0); margin:0 20px; }
        .card-details { padding:18px 20px 20px; }

        /* ── Tab bar ── */
        .tab-bar { display:flex; gap:6px; margin-bottom:16px; background:var(--page-bg,#f8fafc); border-radius:12px; padding:4px; }
        .tab-btn { flex:1; padding:8px 12px; border-radius:9px; border:none; font-size:.78rem; font-weight:600; cursor:pointer; transition:all .18s; background:transparent; color:#9ca3af; font-family:'Sora',sans-serif; display:flex; align-items:center; justify-content:center; gap:6px; }
        .tab-btn.active { background:var(--card-bg,#fff); color:var(--nav-text,#0f172a); box-shadow:0 1px 4px rgba(0,0,0,.06); }

        /* ── Tracking panel ── */
        .tracking-panel { padding:4px 0 8px; }
        .tracking-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
        .worker-pill { display:flex; align-items:center; gap:8px; background:rgba(41,121,212,0.07); border:1px solid rgba(41,121,212,0.15); border-radius:10px; padding:8px 12px; }
        .eta-banner { display:flex; align-items:center; gap:8px; background:rgba(41,121,212,0.06); border:1px solid rgba(41,121,212,0.12); border-radius:10px; padding:10px 14px; margin-bottom:18px; }
        .tracking-steps { display:flex; flex-direction:column; position:relative; }
        .tracking-step { display:flex; align-items:flex-start; gap:12px; position:relative; padding-bottom:20px; }
        .tracking-step:last-child { padding-bottom:0; }
        .step-line { position:absolute; left:15px; top:30px; width:2px; height:calc(100% - 10px); background:var(--border-color,#e5e7eb); border-radius:2px; transition:background .3s; }
        .step-line.done { background:linear-gradient(to bottom,#10b981,#10b981); }
        .step-icon { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; z-index:1; transition:all .25s; }
        .step-icon.done    { background:#10b981; color:#fff; }
        .step-icon.current { background:#2979d4; box-shadow:0 0 0 4px rgba(41,121,212,0.18); }
        .step-icon.future  { background:var(--page-bg,#f1f5f9); border:2px solid var(--border-color,#e5e7eb); }
        .step-text { flex:1; padding-top:6px; }
        .pulse-chip { display:inline-block; margin-left:8px; font-size:.58rem; font-weight:700; color:#fff; background:#2979d4; padding:2px 7px; border-radius:99px; vertical-align:middle; animation:pulse 1.5s ease-in-out infinite; }

        .location-block { display:flex; flex-direction:column; gap:0; margin-bottom:18px; }
        .loc-row { display:flex; align-items:flex-start; gap:12px; }
        .loc-dot { width:11px; height:11px; border-radius:50%; flex-shrink:0; margin-top:4px; }
        .city-dot { background:#2979d4; box-shadow:0 0 0 3px rgba(41,121,212,.2); }
        .addr-dot { background:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.2); }
        .route-line { width:2px; height:28px; background:linear-gradient(to bottom,#2979d4,#10b981); margin-left:4.5px; opacity:.3; border-radius:2px; }
        .route-label { font-size:.66rem; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; }
        .route-value { font-size:.84rem; font-weight:600; color:var(--nav-text,#1e293b); margin-top:2px; line-height:1.4; }
        .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px 24px; }
        @media(max-width:480px) { .detail-grid { grid-template-columns:1fr; } }
        .detail-item { display:flex; flex-direction:column; gap:2px; }
        .detail-label { font-size:.65rem; text-transform:uppercase; letter-spacing:.06em; color:#9ca3af; font-weight:700; }
        .detail-val { font-size:.84rem; font-weight:600; color:var(--nav-text,#1e293b); }
        .detail-val.mono { font-family:'JetBrains Mono',monospace; font-size:.76rem; }
        .error-box { text-align:center; padding:56px 20px; background:var(--card-bg,#fff); border:1px solid #fecaca; border-radius:20px; }
        .error-icon { font-size:2.4rem; margin-bottom:10px; }
        .error-title { font-size:1rem; font-weight:700; color:#ef4444; margin-bottom:6px; }
        .error-msg { font-size:.82rem; color:#9ca3af; margin-bottom:16px; white-space:pre-wrap; }
        .retry-btn { padding:8px 20px; background:#2979d4; color:#fff; border-radius:10px; font-size:.82rem; font-weight:600; cursor:pointer; border:none; }
        .empty-state { text-align:center; padding:64px 20px; background:var(--card-bg,#fff); border:1px solid var(--border-color,#e5e7eb); border-radius:20px; }
        .empty-icon { font-size:2.8rem; margin-bottom:12px; }
        .empty-title { font-size:1.05rem; font-weight:700; color:var(--nav-text,#1e293b); margin-bottom:5px; }
        .empty-sub { font-size:.82rem; color:#9ca3af; }
        @keyframes shimmer { from{background-position:-600px 0} to{background-position:600px 0} }
        .skeleton { border-radius:18px; height:96px; margin-bottom:14px; background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size:600px 100%; animation:shimmer 1.4s infinite; }
      `}</style>

      <div className="bookings-root">
        <div className="bookings-wrap">

          <div className="page-header">
            <div>
              <div className="page-title">My <span>Bookings</span></div>
              {user && <div className="user-email">{user.name} · {user.email}</div>}
            </div>
            <Link href="/" className="back-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Home
            </Link>
          </div>

          {!loading && !error && (
            <div className="stats-row">
              {[
                { num: bookings.length,                    lbl: "Total",     color: "#2979d4" },
                { num: count("pending"),                   lbl: "Pending",   color: "#f59e0b" },
                { num: count("confirmed"),                 lbl: "Confirmed", color: "#2979d4" },
                { num: count("completed"),                 lbl: "Completed", color: "#10b981" },
                { num: payCount("paid") + payCount("cod"), lbl: "💳 Paid",   color: "#10b981" },
              ].map(s => (
                <div key={s.lbl} className="stat-card">
                  <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && bookings.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="filter-label">Filter by Payment</div>
              <div className="pay-summary">
                {[
                  { key: "all",     label: "All Payments",               icon: "📋", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
                  { key: "paid",    label: `Paid (${payCount("paid")})`,  icon: "✅", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
                  { key: "cod",     label: `COD (${payCount("cod")})`,    icon: "💵", color: "#ca8a04", bg: "rgba(202,138,4,0.08)" },
                  { key: "pending", label: `Unpaid (${payCount("pending")})`, icon: "❌", color: "#ef4444", bg: "rgba(239,68,68,0.07)" },
                ].map(p => (
                  <div key={p.key}
                    className={`pay-summary-item ${payFilter === p.key ? "active" : ""}`}
                    onClick={() => setPayFilter(p.key)}
                    style={{ color: p.color, backgroundColor: payFilter === p.key ? p.bg : "var(--card-bg,#fff)", borderColor: payFilter === p.key ? p.color : "var(--border-color,#e5e7eb)" }}>
                    {p.icon} {p.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="filter-section">
              <div className="filter-label">Filter by Status</div>
              <div className="filter-row">
                {FILTERS.map(f => (
                  <button key={f.key} className={`filter-pill ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>
                    {f.label}
                    {f.key !== "all" && <span style={{ opacity: .7, marginLeft: 4 }}>({count(f.key)})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && [1,2,3].map(i => <div key={i} className="skeleton" />)}

          {!loading && error && (
            <div className="error-box">
              <div className="error-icon">⚠️</div>
              <div className="error-title">{error === "Please log in to view your bookings." ? "Not Logged In" : "Could not load bookings"}</div>
              <div className="error-msg">{error}</div>
              {error !== "Please log in to view your bookings." ? (
                <button className="retry-btn" onClick={() => window.location.reload()}>Try Again</button>
              ) : (
                <Link href="/login" className="retry-btn" style={{ display: "inline-block", textDecoration: "none" }}>Go to Login</Link>
              )}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🗓️</div>
              <div className="empty-title">No bookings found</div>
              <div className="empty-sub">
                {filter === "all" && payFilter === "all" ? "You haven't placed any bookings yet." : "No bookings match the selected filters."}
              </div>
            </div>
          )}

          {!loading && !error && filtered.map((b, i) => (
            <BookingCard
              key={`${b.service}-${b.id}`}
              booking={b}
              index={i}
              onPaymentSuccess={handlePaymentSuccess}
              onTrackingUpdate={handleTrackingUpdate}
            />
          ))}

        </div>
      </div>

      {toast && <SuccessToast message={toast.message} onClose={() => setToast(null)} />}
    </>
  );
}