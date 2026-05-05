"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  confirmed:   { label: "Confirmed",   color: "#2979d4", bg: "rgba(41,121,212,0.12)",  dot: "#2979d4" },
  in_progress: { label: "In Progress", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  dot: "#8b5cf6" },
  completed:   { label: "Completed",   color: "#10b981", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  cancelled:   { label: "Cancelled",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
};

const SERVICE_ICONS = {
  "Home Shifting":       "🏠",
  "Cleaning":            "🧹",
  "Office Relocation":   "🏢",
  "Packing & Unpacking": "📦",
  "Storage":             "🏪",
  "Vehicle Transport":   "🚗",
};

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

// ── Fetch all bookings for the logged-in user ────────────────────────────
// FIXED: Strict email filter — only show bookings where customer_email matches.
// Also passes email as a query param so the backend can filter at DB level.
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

  // Pass email as query param → backend filters at DB level (if supported)
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
    const rows = result.value;

    rows.forEach(b => {
      // ── STRICT FRONTEND FILTER ──────────────────────────────────────────
      // Only include rows whose customer_email matches the logged-in user.
      // If customer_email is missing entirely, skip the row (don't show it).
      if (!b.customer_email) return;
      if (b.customer_email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) return;
      // ────────────────────────────────────────────────────────────────────

      all.push({
        id:           b.id,
        service,
        status:       b.status || "pending",
        created_at:   b.created_at,
        city:         b.city || b.from_city || "—",
        from:         b.from_place || b.from_location || b.from_city || "—",
        to:           b.to_place   || b.to_location   || b.to_city   || "—",
        service_type: b.service_type || b.cleaning_type || b.vehicle_type || "—",
        vehicle_type: b.vehicle_type || "—",
        ref:          b.ref_id || b.booking_ref || `#${b.id}`,
        pickup_floor:   b.pickup_floor  || "—",
        pickup_access:  b.pickup_access || "—",
        drop_floor:     b.drop_floor    || "—",
        drop_access:    b.drop_access   || "—",
        property_type:  b.property_type || "—",
        frequency:      b.frequency     || "—",
        preferred_time: b.preferred_time || "—",
        transport_mode: b.transport_mode || "—",
      });
    });
  });

  // Sort newest first
  return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ── Single Booking Card ───────────────────────────────────────────────────
function BookingCard({ booking, index }) {
  const [expanded, setExpanded] = useState(false);
  const sc   = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const icon = SERVICE_ICONS[booking.service] || "📋";

  return (
    <div className="booking-card" style={{ animationDelay: `${index * 70}ms` }}>

      {/* Collapsed header */}
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-left">
          <div className="service-row">
            <span className="svc-icon">{icon}</span>
            <div>
              <div className="service-name">{booking.service}</div>
              <div className="service-sub">{toTitleCase(booking.service_type)}</div>
            </div>
          </div>
          <div className="meta-row">
            <span className="booking-id-pill">{booking.ref}</span>
            <span className="booking-date">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {fmtDate(booking.created_at)}
            </span>
          </div>
        </div>

        <div className="header-right">
          <span className="status-badge" style={{ color: sc.color, backgroundColor: sc.bg }}>
            <span className="dot" style={{ backgroundColor: sc.dot }} />
            {sc.label}
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transition: "transform .25s", transform: expanded ? "rotate(180deg)" : "none", opacity: .35, marginTop: 4 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="card-details">
          <div className="detail-divider" />

          {/* Route block */}
          <div className="location-block">
            <div className="loc-row">
              <div className="loc-dot city-dot" />
              <div>
                <div className="route-label">From</div>
                <div className="route-value">{booking.from}</div>
              </div>
            </div>
            {booking.to !== "—" && (
              <>
                <div className="route-line" />
                <div className="loc-row">
                  <div className="loc-dot addr-dot" />
                  <div>
                    <div className="route-label">To</div>
                    <div className="route-value">{booking.to}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Detail grid */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Booking Ref</span>
              <span className="detail-val mono">{booking.ref}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">City</span>
              <span className="detail-val">{booking.city}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Service Type</span>
              <span className="detail-val">{toTitleCase(booking.service_type)}</span>
            </div>

            {/* Cleaning specific */}
            {booking.service === "Cleaning" && (
              <>
                <div className="detail-item">
                  <span className="detail-label">Property Type</span>
                  <span className="detail-val">{booking.property_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Preferred Time</span>
                  <span className="detail-val">{booking.preferred_time}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Frequency</span>
                  <span className="detail-val">{booking.frequency}</span>
                </div>
              </>
            )}

            {/* Vehicle specific */}
            {booking.service === "Vehicle Transport" && (
              <div className="detail-item">
                <span className="detail-label">Transport Mode</span>
                <span className="detail-val">{booking.transport_mode}</span>
              </div>
            )}

            {/* Floor & access for shifting services */}
            {["Home Shifting", "Office Relocation", "Packing & Unpacking", "Storage"].includes(booking.service) && (
              <>
                <div className="detail-item">
                  <span className="detail-label">Pickup Floor</span>
                  <span className="detail-val">{booking.pickup_floor}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pickup Access</span>
                  <span className="detail-val">{toTitleCase(booking.pickup_access)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Drop Floor</span>
                  <span className="detail-val">{booking.drop_floor}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Drop Access</span>
                  <span className="detail-val">{toTitleCase(booking.drop_access)}</span>
                </div>
              </>
            )}

            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-val" style={{ color: sc.color, fontWeight: 700 }}>{sc.label}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Booked On</span>
              <span className="detail-val">{fmtDate(booking.created_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState("all");
  const [user, setUser]         = useState(null);

  useEffect(() => {
    let userData = null;
    const stored = localStorage.getItem("user");
    if (stored) {
      try { userData = JSON.parse(stored); setUser(userData); } catch {}
    }

    // If no user found, stop loading — show "not logged in" state
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

  const count    = (s) => bookings.filter((b) => b.status === s).length;
  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        .bookings-root {
          min-height: 100vh; background: var(--page-bg, #f8fafc);
          font-family: 'Sora', sans-serif; padding: 100px 16px 60px;
        }
        .bookings-wrap { max-width: 860px; margin: 0 auto; }
        .page-header {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
        }
        .page-title { font-size: 1.7rem; font-weight: 700; color: var(--nav-text, #0f172a); letter-spacing: -.02em; }
        .page-title span { color: #2979d4; }
        .user-email { font-size: .8rem; color: #9ca3af; margin-top: 3px; }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: .82rem; font-weight: 600; color: #2979d4;
          padding: 7px 14px; border: 1.5px solid #2979d4;
          border-radius: 10px; transition: all .2s; text-decoration: none;
        }
        .back-btn:hover { background: #2979d4; color: #fff; }
        .stats-row {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 12px; margin-bottom: 24px;
        }
        @media(max-width: 560px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        .stat-card {
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 14px; padding: 16px 14px; text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
        }
        .stat-num { font-size: 1.6rem; font-weight: 700; color: #2979d4; }
        .stat-lbl { font-size: .7rem; color: #6b7280; font-weight: 600; margin-top: 2px; text-transform: uppercase; letter-spacing: .04em; }
        .filter-row {
          display: flex; gap: 8px; margin-bottom: 20px;
          overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;
        }
        .filter-row::-webkit-scrollbar { display: none; }
        .filter-pill {
          flex-shrink: 0; padding: 7px 14px; border-radius: 99px;
          font-size: .78rem; font-weight: 600; cursor: pointer;
          border: 1.5px solid var(--border-color, #e5e7eb);
          background: var(--card-bg, #fff); color: var(--nav-text-muted, #6b7280);
          transition: all .18s;
        }
        .filter-pill.active, .filter-pill:hover { background: #2979d4; color: #fff; border-color: #2979d4; }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .booking-card {
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 18px; margin-bottom: 14px; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,.04);
          animation: slideUp .38s ease both;
          transition: box-shadow .2s, border-color .2s;
        }
        .booking-card:hover { box-shadow: 0 6px 24px rgba(41,121,212,.10); border-color: #bfdbfe; }
        .card-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 18px 20px; cursor: pointer; gap: 14px; user-select: none;
        }
        .header-left { flex: 1; min-width: 0; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .service-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .svc-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
        .service-name { font-size: .98rem; font-weight: 700; color: var(--nav-text, #0f172a); line-height: 1.3; }
        .service-sub  { font-size: .74rem; color: #9ca3af; font-weight: 500; margin-top: 2px; }
        .meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .booking-id-pill {
          font-size: .68rem; font-weight: 700; color: #2979d4;
          background: rgba(41,121,212,.09); padding: 3px 9px; border-radius: 99px;
          font-family: 'JetBrains Mono', monospace;
        }
        .booking-date {
          display: flex; align-items: center; gap: 4px;
          font-size: .72rem; color: #9ca3af; font-weight: 500;
        }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: .7rem; font-weight: 700; padding: 5px 11px;
          border-radius: 99px; white-space: nowrap;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .detail-divider { height: 1px; background: var(--border-color, #f0f0f0); margin: 0 20px; }
        .card-details   { padding: 18px 20px 20px; }
        .location-block { display: flex; flex-direction: column; gap: 0; margin-bottom: 18px; }
        .loc-row  { display: flex; align-items: flex-start; gap: 12px; }
        .loc-dot  { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .city-dot { background: #2979d4; box-shadow: 0 0 0 3px rgba(41,121,212,.2); }
        .addr-dot { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.2); }
        .route-line {
          width: 2px; height: 28px;
          background: linear-gradient(to bottom, #2979d4, #10b981);
          margin-left: 4.5px; opacity: .3; border-radius: 2px;
        }
        .route-label { font-size: .66rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .06em; }
        .route-value { font-size: .84rem; font-weight: 600; color: var(--nav-text, #1e293b); margin-top: 2px; line-height: 1.4; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
        @media(max-width: 480px) { .detail-grid { grid-template-columns: 1fr; } }
        .detail-item  { display: flex; flex-direction: column; gap: 2px; }
        .detail-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; font-weight: 700; }
        .detail-val   { font-size: .84rem; font-weight: 600; color: var(--nav-text, #1e293b); }
        .detail-val.mono { font-family: 'JetBrains Mono', monospace; font-size: .76rem; }
        .error-box {
          text-align: center; padding: 56px 20px;
          background: var(--card-bg, #fff);
          border: 1px solid #fecaca; border-radius: 20px;
        }
        .error-icon  { font-size: 2.4rem; margin-bottom: 10px; }
        .error-title { font-size: 1rem; font-weight: 700; color: #ef4444; margin-bottom: 6px; }
        .error-msg   { font-size: .82rem; color: #9ca3af; margin-bottom: 16px; white-space: pre-wrap; }
        .retry-btn   {
          padding: 8px 20px; background: #2979d4;
          color: #fff; border-radius: 10px; font-size: .82rem;
          font-weight: 600; cursor: pointer; border: none;
        }
        .empty-state {
          text-align: center; padding: 64px 20px;
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e5e7eb); border-radius: 20px;
        }
        .empty-icon  { font-size: 2.8rem; margin-bottom: 12px; }
        .empty-title { font-size: 1.05rem; font-weight: 700; color: var(--nav-text, #1e293b); margin-bottom: 5px; }
        .empty-sub   { font-size: .82rem; color: #9ca3af; }
        @keyframes shimmer {
          from { background-position: -600px 0; }
          to   { background-position:  600px 0; }
        }
        .skeleton {
          border-radius: 18px; height: 96px; margin-bottom: 14px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 600px 100%; animation: shimmer 1.4s infinite;
        }
      `}</style>

      <div className="bookings-root">
        <div className="bookings-wrap">

          {/* Header */}
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

          {/* Stats */}
          {!loading && !error && (
            <div className="stats-row">
              {[
                { num: bookings.length,    lbl: "Total" },
                { num: count("pending"),   lbl: "Pending" },
                { num: count("confirmed"), lbl: "Confirmed" },
                { num: count("completed"), lbl: "Completed" },
              ].map((s) => (
                <div key={s.lbl} className="stat-card">
                  <div className="stat-num">{s.num}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filter pills */}
          {!loading && !error && (
            <div className="filter-row">
              {FILTERS.map((f) => (
                <button key={f.key}
                  className={`filter-pill ${filter === f.key ? "active" : ""}`}
                  onClick={() => setFilter(f.key)}>
                  {f.label}
                  {f.key !== "all" && (
                    <span style={{ opacity: .7, marginLeft: 4 }}>({count(f.key)})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && [1, 2, 3].map((i) => <div key={i} className="skeleton" />)}

          {/* Error / Not logged in */}
          {!loading && error && (
            <div className="error-box">
              <div className="error-icon">⚠️</div>
              <div className="error-title">
                {error === "Please log in to view your bookings."
                  ? "Not Logged In"
                  : "Could not load bookings"}
              </div>
              <div className="error-msg">{error}</div>
              {error !== "Please log in to view your bookings." && (
                <button className="retry-btn" onClick={() => window.location.reload()}>
                  Try Again
                </button>
              )}
              {error === "Please log in to view your bookings." && (
                <Link href="/login" className="retry-btn" style={{ display: "inline-block", textDecoration: "none" }}>
                  Go to Login
                </Link>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🗓️</div>
              <div className="empty-title">
                No {filter !== "all" ? FILTERS.find(f => f.key === filter)?.label : ""} bookings found
              </div>
              <div className="empty-sub">
                {filter === "all"
                  ? "You haven't placed any bookings yet."
                  : "No bookings with this status yet."}
              </div>
            </div>
          )}

          {/* Booking cards */}
          {!loading && !error && filtered.map((b, i) => (
            <BookingCard key={`${b.service}-${b.id}`} booking={b} index={i} />
          ))}

        </div>
      </div>
    </>
  );
}