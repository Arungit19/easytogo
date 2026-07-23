"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const INTERVAL_MS = 10000;

export default function WorkerLocationSender({ sessionId, autoStart = false }) {
  const [active, setActive]     = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const [error, setError]       = useState("");
  const intervalRef             = useRef(null);
  const watchIdRef              = useRef(null);
  const latestPos               = useRef(null);
  const didAutoStart            = useRef(false);

  useEffect(() => {
    if (!autoStart || !sessionId || didAutoStart.current) return;
    didAutoStart.current = true;
    setActive(true);
  }, [autoStart, sessionId]);

  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported on this device.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPos.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setError("");
      },
      (err) => setError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !sessionId) return;
    const sendLocation = async () => {
      if (!latestPos.current) return;
      try {
        const token = localStorage.getItem("workerToken");
        const res = await fetch(`${API}/api/tracking/${sessionId}/location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: latestPos.current.lat,
            lng: latestPos.current.lng,
          }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        setLastSent(new Date());
      } catch (err) {
        console.error("[LocationSender]", err.message);
      }
    };
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [active, sessionId]);

  const toggle = () => {
    if (active) {
      setActive(false);
      setLastSent(null);
      clearInterval(intervalRef.current);
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    } else {
      setActive(true);
    }
  };

  if (!sessionId) return null;

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        backgroundColor: active ? "rgba(34,197,94,0.08)" : "transparent",
        border: `1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", margin: 0 }}>
            {active ? "📡 Sharing Live Location" : "📍 Location Sharing"}
          </p>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
            {active
              ? lastSent
                ? `Last sent: ${lastSent.toLocaleTimeString()}`
                : "Starting..."
              : "Enable to let user/admin track you"}
          </p>
          {error && (
            <p style={{ fontSize: "0.72rem", color: "#ef4444", margin: "4px 0 0" }}>{error}</p>
          )}
        </div>

        <button
          onClick={toggle}
          style={{
            position: "relative",
            width: 48,
            height: 24,
            borderRadius: 99,
            border: "none",
            backgroundColor: active ? "#22c55e" : "rgba(255,255,255,0.15)",
            cursor: "pointer",
            transition: "background-color 0.3s",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: active ? 26 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              transition: "left 0.3s",
            }}
          />
        </button>
      </div>

      {active && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#4ade80",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#22c55e" }}>
            Live — updating every 10 seconds
          </span>
        </div>
      )}
    </div>
  );
}
