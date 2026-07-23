"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SERVICE_LABELS = {
  home_shifting:     "Home Shifting",
  office_relocation: "Office Relocation",
  vehicle_transport: "Vehicle Transport",
  cleaning:          "Cleaning",
  storage:           "Storage",
  packing:           "Packing & Unpacking",
};

const STAGE_LABELS = {
  pending:           "Pending",
  confirmed:         "Confirmed",
  packing:           "Packing",
  loading:           "Loading",
  in_transit:        "In Transit",
  unloading:         "Unloading",
  unpacking:         "Unpacking",
  picked_up:         "Picked Up",
  out_for_delivery:  "Out for Delivery",
  delivered:         "Delivered",
  worker_assigned:   "Worker Assigned",
  worker_on_the_way: "On The Way",
  arrived:           "Arrived",
  in_progress:       "In Progress",
  completed:         "Completed",
};

// Stage options per service
const STAGE_OPTIONS = {
  home_shifting:     ["pending","confirmed","packing","loading","in_transit","unloading","unpacking","completed"],
  office_relocation: ["pending","confirmed","packing","loading","in_transit","unloading","unpacking","completed"],
  vehicle_transport: ["pending","confirmed","picked_up","in_transit","out_for_delivery","delivered"],
  cleaning:          ["pending","confirmed","worker_assigned","worker_on_the_way","arrived","in_progress","completed"],
  storage:           ["pending","confirmed","worker_assigned","worker_on_the_way","arrived","in_progress","completed"],
  packing:           ["pending","confirmed","worker_assigned","worker_on_the_way","arrived","in_progress","completed"],
};

const googleMapsEmbedUrl = (lat, lng) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=15&output=embed`;

const googleMapsSearchUrl = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

export default function AdminTrackingPage() {
  const mapRef     = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});

  const [sessions, setSessions]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [filterService, setFilterService] = useState("all");
  const [updatingStage, setUpdatingStage] = useState(false);
  const [stageNote, setStageNote]       = useState("");

  // ── Auth header ──────────────────────────────────────────────────────────
  const authHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("adminToken") ?? localStorage.getItem("token")}`,
    "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || "homeease_admin_2024",
  });

  // ── Fetch all active sessions ────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const url = filterService === "all"
        ? `${API}/api/tracking/admin/all`
        : `${API}/api/tracking/admin/all?service_type=${filterService}`;
      const res = await fetch(url, { headers: authHeader(), cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterService]);

  // ── Fetch single session detail ──────────────────────────────────────────
  const fetchSessionDetail = useCallback(async (session) => {
    try {
      const res = await fetch(
        `${API}/api/tracking/${session.booking_id}/${session.service_type}`,
        { headers: authHeader(), cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setSelected(data);
      updateMapForSession(data.session);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ── Update stage ─────────────────────────────────────────────────────────
  const handleUpdateStage = async (newStage) => {
    if (!selected) return;
    setUpdatingStage(true);
    try {
      const res = await fetch(`${API}/api/tracking/${selected.session.id}/stage`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ stage: newStage, note: stageNote, updated_by: "admin" }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      setStageNote("");
      await fetchSessionDetail(selected.session);
      await fetchSessions();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStage(false);
    }
  };

  // ── Init Leaflet ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id    = "leaflet-css";
      link.rel   = "stylesheet";
      link.href  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const loadLeaflet = () => {
      if (window.L) return Promise.resolve();
      return new Promise((resolve) => {
        const s    = document.createElement("script");
        s.src      = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload   = resolve;
        document.head.appendChild(s);
      });
    };
    loadLeaflet().then(() => {
      if (!mapRef.current || leafletMap.current) return;
      const L   = window.L;
      const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);
      leafletMap.current = map;
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  // ── Place/update markers for all sessions ────────────────────────────────
  const updateAllMarkers = useCallback(() => {
    if (!leafletMap.current || typeof window === "undefined" || !window.L) return;
    const L = window.L;

    sessions.forEach((s) => {
      if (!s.current_lat || !s.current_lng) return;
      const key = `${s.id}`;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:#2979d4;color:#fff;border-radius:50%;
          width:30px;height:30px;display:flex;align-items:center;
          justify-content:center;font-size:14px;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;
          cursor:pointer;">
          ${["home_shifting","office_relocation"].includes(s.service_type) ? "🚛"
            : s.service_type === "vehicle_transport" ? "🚗" : "👷"}
        </div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      });

      if (markersRef.current[key]) {
        markersRef.current[key].setLatLng([s.current_lat, s.current_lng]);
      } else {
        markersRef.current[key] = L.marker([s.current_lat, s.current_lng], { icon })
          .addTo(leafletMap.current)
          .bindPopup(`<b>${SERVICE_LABELS[s.service_type]}</b><br>
            Worker: ${s.worker_name ?? "—"}<br>
            Stage: ${STAGE_LABELS[s.stage] ?? s.stage}`)
          .on("click", () => fetchSessionDetail(s));
      }
    });
  }, [sessions, fetchSessionDetail]);

  const updateMapForSession = (s) => {
    if (!leafletMap.current || !s.current_lat) return;
    leafletMap.current.setView([s.current_lat, s.current_lng], 13);
  };

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { updateAllMarkers(); }, [sessions, updateAllMarkers]);
  useEffect(() => {
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const filtered = sessions.filter((s) =>
    filterService === "all" || s.service_type === filterService
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            Live Tracking
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
            {filtered.length} active sessions
          </p>
        </div>
        <button onClick={fetchSessions}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ backgroundColor: "rgba(41,121,212,0.1)", color: "#2979d4",
                   border: "1px solid rgba(41,121,212,0.2)" }}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444",
                   border: "1px solid rgba(239,68,68,0.3)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Service Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...Object.keys(SERVICE_LABELS)].map((s) => (
          <button key={s} onClick={() => setFilterService(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              backgroundColor: filterService === s ? "#2979d4" : "var(--card-bg)",
              color:           filterService === s ? "#fff"     : "var(--nav-text-muted)",
              border:          filterService === s ? "none"     : "1px solid var(--border-color)",
            }}>
            {s === "all" ? "All Services" : SERVICE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-4">

        {/* Sessions List */}
        <div className="xl:w-[340px] space-y-2 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {loading ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--nav-text-muted)" }}>
              Loading sessions...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--nav-text-muted)" }}>
              No active tracking sessions.
            </p>
          ) : (
            filtered.map((s) => (
              <div key={s.id}
                onClick={() => fetchSessionDetail(s)}
                className="rounded-2xl p-4 cursor-pointer transition-all"
                style={{
                  backgroundColor: selected?.session?.id === s.id
                    ? "rgba(41,121,212,0.1)" : "var(--card-bg)",
                  border: selected?.session?.id === s.id
                    ? "1px solid rgba(41,121,212,0.4)"
                    : "1px solid var(--border-color)",
                }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
                      {SERVICE_LABELS[s.service_type]}
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: "#2979d4" }}>
                      #{s.booking_id}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: s.stage === "completed"
                        ? "rgba(34,197,94,0.15)" : "rgba(251,191,36,0.15)",
                      color: s.stage === "completed" ? "#22c55e" : "#f59e0b",
                    }}>
                    {STAGE_LABELS[s.stage] ?? s.stage}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: "var(--nav-text-muted)" }}>
                    👷 {s.worker_name ?? "Unassigned"}
                  </p>
                  {s.current_lat && (
                    <p className="text-[10px]" style={{ color: "#22c55e" }}>● Live</p>
                  )}
                </div>
                {s.current_address && (
                  <p className="text-[10px] mt-1 truncate" style={{ color: "var(--nav-text-muted)" }}>
                    📍 {s.current_address}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Map + Detail Panel */}
        <div className="flex-1 space-y-4">

          {/* Map */}
          <div className="rounded-2xl overflow-hidden relative"
            style={{ height: "400px", border: "1px solid var(--border-color)" }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
            {!sessions.some((s) => s.current_lat) && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
                <div className="text-center">
                  <p className="text-3xl mb-2">🗺️</p>
                  <p className="text-white text-sm font-bold">No live locations yet</p>
                  <p className="text-white/60 text-xs mt-1">Workers will appear here once active</p>
                </div>
              </div>
            )}
          </div>

          {/* Selected Session Detail */}
          {selected && (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base" style={{ color: "var(--foreground)" }}>
                    {SERVICE_LABELS[selected.session.service_type]} · #{selected.session.booking_id}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--nav-text-muted)" }}>
                    Worker: {selected.session.worker_name ?? "Not assigned"} ·{" "}
                    {selected.session.worker_phone ?? ""}
                  </p>
                </div>
                <button onClick={() => setSelected(null)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "var(--border-color)", color: "var(--nav-text-muted)" }}>
                  ✕ Close
                </button>
              </div>

              {/* Stage Progress (mini) */}
              <div className="flex gap-1 flex-wrap">
                {selected.stages?.map((stage, idx) => {
                  const isDone    = idx < selected.currentStageIndex;
                  const isCurrent = idx === selected.currentStageIndex;
                  return (
                    <div key={stage.key} className="flex items-center gap-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: isDone    ? "rgba(34,197,94,0.15)"
                                         : isCurrent ? "rgba(41,121,212,0.15)"
                                         :             "rgba(107,114,128,0.1)",
                          color: isDone    ? "#22c55e"
                               : isCurrent ? "#2979d4"
                               :             "#6b7280",
                        }}>
                        {stage.icon} {stage.label}
                      </span>
                      {idx < selected.stages.length - 1 && (
                        <span style={{ color: "var(--border-color)" }}>›</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Admin: Update Stage */}
              {selected.session.current_lat && selected.session.current_lng && (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden" style={{ height: 260, border: "1px solid var(--border-color)" }}>
                    <iframe
                      title="Worker live location on Google Maps"
                      src={googleMapsEmbedUrl(selected.session.current_lat, selected.session.current_lng)}
                      style={{ width: "100%", height: "100%", border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                  <a
                    href={googleMapsSearchUrl(selected.session.current_lat, selected.session.current_lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: "rgba(41,121,212,0.1)", color: "#2979d4" }}
                  >
                    Open live location in Google Maps
                  </a>
                </div>
              )}

              {/* Admin: Update Stage */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Update Stage
                </p>
                <div className="flex gap-2 flex-wrap">
                  {(STAGE_OPTIONS[selected.session.service_type] ?? []).map((stageKey) => (
                    <button key={stageKey}
                      onClick={() => handleUpdateStage(stageKey)}
                      disabled={updatingStage || stageKey === selected.session.stage}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40"
                      style={{
                        backgroundColor: stageKey === selected.session.stage
                          ? "rgba(41,121,212,0.2)" : "var(--border-color)",
                        color: stageKey === selected.session.stage
                          ? "#2979d4" : "var(--nav-text-muted)",
                        border: stageKey === selected.session.stage
                          ? "1px solid rgba(41,121,212,0.4)" : "none",
                      }}>
                      {STAGE_LABELS[stageKey] ?? stageKey}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="Optional note (e.g. Delayed due to traffic)"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border-color)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
