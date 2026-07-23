"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";

// ─── Leaflet is loaded via CDN in useEffect (no SSR issues) ──────────────────
// Add to your layout.jsx or globals.css:
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
// <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STAGE_COLORS = {
  completed: "#22c55e",
  active:    "#2979d4",
  pending:   "#6b7280",
};

const SERVICE_LABELS = {
  home_shifting:      "Home Shifting",
  office_relocation:  "Office Relocation",
  vehicle_transport:  "Vehicle Transport",
  cleaning:           "Cleaning",
  storage:            "Storage",
  packing:            "Packing & Unpacking",
};

const googleMapsEmbedUrl = (lat, lng) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=15&output=embed`;

const googleMapsDirectionsUrl = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

export default function UserTrackingPage() {
  // URL: /tracking/[booking_id]/[service_type]
  const { booking_id, service_type } = useParams();

  const mapRef       = useRef(null);
  const leafletMap   = useRef(null);
  const workerMarker = useRef(null);
  const routeLine    = useRef(null);
  const destMarker   = useRef(null);

  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [lastUpdated, setLastUpdated]   = useState(null);

  // ── Fetch tracking data ──────────────────────────────────────────────────
  const fetchTracking = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/tracking/${booking_id}/${service_type}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setTrackingData(data);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [booking_id, service_type]);

  // ── Init Leaflet map ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id    = "leaflet-css";
      link.rel   = "stylesheet";
      link.href  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if (window.L) return Promise.resolve();
      return new Promise((resolve) => {
        const script  = document.createElement("script");
        script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    loadLeaflet().then(() => {
      if (!mapRef.current || leafletMap.current) return;
      const L   = window.L;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      leafletMap.current = map;
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // ── Update map markers when tracking data changes ─────────────────────────
  useEffect(() => {
    if (!trackingData || !leafletMap.current || typeof window === "undefined") return;
    const L = window.L;
    if (!L) return;

    const s = trackingData.session;

    // Worker/vehicle marker
    if (s.current_lat && s.current_lng) {
      const workerIcon = L.divIcon({
        className: "",
        html: `<div style="
          background:#2979d4;color:#fff;border-radius:50%;
          width:36px;height:36px;display:flex;align-items:center;
          justify-content:center;font-size:18px;
          box-shadow:0 2px 12px rgba(41,121,212,0.5);
          border:3px solid #fff;">
          ${["home_shifting","office_relocation"].includes(service_type) ? "🚛"
            : service_type === "vehicle_transport" ? "🚗" : "👷"}
        </div>`,
        iconSize:   [36, 36],
        iconAnchor: [18, 18],
      });

      if (workerMarker.current) {
        workerMarker.current.setLatLng([s.current_lat, s.current_lng]);
      } else {
        workerMarker.current = L.marker([s.current_lat, s.current_lng], { icon: workerIcon })
          .addTo(leafletMap.current)
          .bindPopup(`<b>${s.worker_name ?? "Worker"}</b><br>${s.current_address ?? ""}`);
      }
      leafletMap.current.setView([s.current_lat, s.current_lng], 13);
    }

    // Destination marker
    if (s.dest_lat && s.dest_lng && !destMarker.current) {
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="
          background:#22c55e;color:#fff;border-radius:50%;
          width:32px;height:32px;display:flex;align-items:center;
          justify-content:center;font-size:16px;
          box-shadow:0 2px 12px rgba(34,197,94,0.5);
          border:3px solid #fff;">🏠</div>`,
        iconSize:   [32, 32],
        iconAnchor: [16, 16],
      });
      destMarker.current = L.marker([s.dest_lat, s.dest_lng], { icon: destIcon })
        .addTo(leafletMap.current)
        .bindPopup(`<b>Destination</b><br>${s.dest_address ?? ""}`);
    }

    // Breadcrumb trail
    const history = trackingData.locationHistory ?? [];
    if (history.length > 1) {
      const latlngs = history.map((h) => [h.lat, h.lng]);
      if (routeLine.current) routeLine.current.setLatLngs(latlngs);
      else {
        routeLine.current = L.polyline(latlngs, {
          color: "#2979d4", weight: 3, opacity: 0.5, dashArray: "6 4",
        }).addTo(leafletMap.current);
      }
    }
  }, [trackingData, service_type]);

  // ── Poll every 10 seconds ─────────────────────────────────────────────────
  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--background)" }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto"
          style={{ borderColor: "#2979d4", borderTopColor: "transparent" }} />
        <p style={{ color: "var(--nav-text-muted)" }} className="text-sm">Loading tracking...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--background)" }}>
      <div className="text-center space-y-3">
        <p className="text-4xl">⚠️</p>
        <p className="text-sm font-medium" style={{ color: "#ef4444" }}>{error}</p>
        <button onClick={fetchTracking}
          className="px-4 py-2 rounded-lg text-xs font-bold"
          style={{ backgroundColor: "rgba(41,121,212,0.1)", color: "#2979d4" }}>
          Retry
        </button>
      </div>
    </div>
  );

  const { session: s, stages, currentStageIndex, stageHistory } = trackingData;
  const isWorkerService = ["cleaning", "storage", "packing"].includes(s.service_type);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>

      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 flex items-start justify-between"
        style={{ borderBottom: "1px solid var(--border-color)" }}>
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--foreground)" }}>
            Live Tracking
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--nav-text-muted)" }}>
            {SERVICE_LABELS[s.service_type]} · Booking #{s.booking_id}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs px-2.5 py-1 rounded-full font-bold"
            style={{
              backgroundColor: s.status === "completed" ? "rgba(34,197,94,0.15)" : "rgba(41,121,212,0.15)",
              color: s.status === "completed" ? "#22c55e" : "#2979d4",
            }}>
            {s.status === "completed" ? "✅ Completed" : "🔴 Live"}
          </span>
          {lastUpdated && (
            <span className="text-[10px]" style={{ color: "var(--nav-text-muted)" }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-0" style={{ minHeight: "calc(100vh - 80px)" }}>

        {/* ── Left Panel ── */}
        <div className="lg:w-[380px] p-4 space-y-4 overflow-y-auto"
          style={{ borderRight: "1px solid var(--border-color)" }}>

          {/* ETA Card */}
          {s.eta_minutes && s.status !== "completed" && (
            <div className="rounded-2xl p-4"
              style={{ backgroundColor: "rgba(41,121,212,0.08)", border: "1px solid rgba(41,121,212,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: "#2979d4" }}>Estimated Arrival</p>
              <p className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
                {s.eta_minutes} <span className="text-base font-normal">mins</span>
              </p>
              {s.current_address && (
                <p className="text-xs mt-1" style={{ color: "var(--nav-text-muted)" }}>
                  📍 Currently at: {s.current_address}
                </p>
              )}
            </div>
          )}

          {/* Worker Info */}
          {s.worker_name && (
            <div className="rounded-2xl p-4"
              style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: "var(--nav-text-muted)" }}>
                {isWorkerService ? "Your Worker" : "Driver / Team"}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black"
                  style={{ backgroundColor: "rgba(41,121,212,0.15)", color: "#2979d4" }}>
                  {s.worker_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                    {s.worker_name}
                  </p>
                  {s.worker_phone && (
                    <a href={`tel:${s.worker_phone}`}
                      className="text-xs font-medium"
                      style={{ color: "#2979d4" }}>
                      📞 {s.worker_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stage Progress */}
          <div className="rounded-2xl p-4"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: "var(--nav-text-muted)" }}>
              Order Progress
            </p>
            <div className="space-y-0">
              {stages.map((stage, idx) => {
                const isDone    = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const isPending = idx > currentStageIndex;
                const histEntry = stageHistory?.find((h) => h.stage === stage.key);

                return (
                  <div key={stage.key} className="flex gap-3">
                    {/* Spine */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all"
                        style={{
                          backgroundColor: isDone    ? "rgba(34,197,94,0.15)"
                                         : isCurrent ? "rgba(41,121,212,0.15)"
                                         :             "rgba(107,114,128,0.1)",
                          color: isDone    ? "#22c55e"
                               : isCurrent ? "#2979d4"
                               :             "#6b7280",
                          border: isCurrent ? "2px solid #2979d4" : "2px solid transparent",
                        }}>
                        {isDone ? "✓" : stage.icon}
                      </div>
                      {idx < stages.length - 1 && (
                        <div className="w-0.5 h-6 my-0.5 transition-all"
                          style={{ backgroundColor: isDone ? "#22c55e" : "var(--border-color)" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-3 flex-1">
                      <p className="text-sm font-bold leading-none"
                        style={{
                          color: isDone    ? "#22c55e"
                               : isCurrent ? "var(--foreground)"
                               :             "var(--nav-text-muted)",
                        }}>
                        {stage.label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: "rgba(41,121,212,0.15)", color: "#2979d4" }}>
                            NOW
                          </span>
                        )}
                      </p>
                      {histEntry && (
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--nav-text-muted)" }}>
                          {new Date(histEntry.changed_at).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                          {histEntry.note ? ` · ${histEntry.note}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Addresses */}
          {(s.origin_address || s.dest_address) && (
            <div className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
              {s.origin_address && (
                <div className="flex gap-2">
                  <span className="text-base">🟢</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: "var(--nav-text-muted)" }}>Pickup</p>
                    <p className="text-xs" style={{ color: "var(--foreground)" }}>{s.origin_address}</p>
                  </div>
                </div>
              )}
              {s.dest_address && (
                <div className="flex gap-2">
                  <span className="text-base">🔴</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: "var(--nav-text-muted)" }}>Destination</p>
                    <p className="text-xs" style={{ color: "var(--foreground)" }}>{s.dest_address}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative" style={{ minHeight: "400px" }}>
          {s.current_lat && s.current_lng ? (
            <iframe
              title="Worker live location on Google Maps"
              src={googleMapsEmbedUrl(s.current_lat, s.current_lng)}
              style={{ width: "100%", height: "100%", minHeight: "400px", border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />
          )}

          {/* No location fallback */}
          {!s.current_lat && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
              <div className="text-center space-y-2">
                <p className="text-3xl">📍</p>
                <p className="text-white font-bold text-sm">Location not available yet</p>
                <p className="text-white/60 text-xs">
                  {s.stage === "pending"
                    ? "Tracking will start once worker is assigned"
                    : "Waiting for worker to share location"}
                </p>
              </div>
            </div>
          )}

          {/* Refresh button on map */}
          <button onClick={fetchTracking}
            className="absolute top-3 right-3 z-[1000] px-3 py-2 rounded-xl text-xs font-bold"
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              color: "var(--foreground)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}>
            🔄 Refresh
          </button>
          {s.current_lat && s.current_lng && (
            <a
              href={googleMapsDirectionsUrl(s.current_lat, s.current_lng)}
              target="_blank"
              rel="noreferrer"
              className="absolute top-14 right-3 z-[1000] px-3 py-2 rounded-xl text-xs font-bold"
              style={{
                backgroundColor: "#fff",
                border: "1px solid rgba(0,0,0,0.12)",
                color: "#1f2937",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              Open in Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
