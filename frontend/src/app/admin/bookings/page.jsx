"use client";

import { useEffect, useState } from "react";

const SERVICE_COLORS = {
  "Home Shifting":       { backgroundColor: "rgba(41,121,212,0.15)",  color: "#2979d4" },
  "Cleaning":            { backgroundColor: "rgba(6,182,212,0.15)",   color: "#06b6d4" },
  "Office Relocation":   { backgroundColor: "rgba(236,72,153,0.15)",  color: "#ec4899" },
  "Packing & Unpacking": { backgroundColor: "rgba(249,115,22,0.15)",  color: "#f97316" },
  "Storage":             { backgroundColor: "rgba(20,184,166,0.15)",  color: "#14b8a6" },
  "Vehicle Transport":   { backgroundColor: "rgba(168,85,247,0.15)",  color: "#a855f7" },
};

const ALL_SERVICES = [
  "All", "Home Shifting", "Cleaning", "Office Relocation",
  "Packing & Unpacking", "Storage", "Vehicle Transport",
];

async function safeFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function BookingsPage() {
  const [bookings, setBookings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [filterService, setFilterService] = useState("All");

  useEffect(() => {
    Promise.all([
      safeFetch("/api/home-shifting"),
      safeFetch("/api/cleaning-booking"),
      safeFetch("/api/office-relocation"),
      safeFetch("/api/packing"),
      safeFetch("/api/storage-booking"),
      safeFetch("/api/vehicle-transport"),
    ]).then(([home, cleaning, office, packing, storage, vehicle]) => {

      const all = [
        ...home.map(b => ({
          ...b,
          service : "Home Shifting",
          ref     : b.ref_id   ?? `#${b.id}`,
          city    : b.city     ?? "—",
          from    : b.from_place     ?? b.from_location ?? "—",
          to      : b.to_place       ?? b.to_location   ?? "—",
        })),
        ...cleaning.map(b => ({
          ...b,
          service : "Cleaning",
          ref     : b.booking_ref ?? `#${b.id}`,
          city    : b.city ?? "—",
          from    : b.from_location ?? b.city ?? "—",
          to      : b.to_location   ?? "—",
        })),
        ...office.map(b => ({
          ...b,
          service : "Office Relocation",
          ref     : b.ref_id ?? `#${b.id}`,
          city    : b.city ?? b.from_city ?? "—",
          from    : b.from_location ?? b.from_city ?? "—",
          to      : b.to_location   ?? b.to_city   ?? "—",
        })),
        ...packing.map(b => ({
          ...b,
          service : "Packing & Unpacking",
          ref     : b.ref_id ?? `#${b.id}`,
          city    : b.city ?? b.from_city ?? "—",
          from    : b.from_location ?? b.from_city ?? "—",
          to      : b.to_location   ?? b.to_city   ?? "—",
        })),
        ...storage.map(b => ({
          ...b,
          service : "Storage",
          ref     : b.ref_id ?? `#${b.id}`,
          city    : b.city ?? "—",
          from    : b.from_location ?? b.city ?? "—",
          to      : b.to_location   ?? "—",
        })),
        ...vehicle.map(b => ({
          ...b,
          service : "Vehicle Transport",
          ref     : b.ref_id ?? `#${b.id}`,
          city    : b.city ?? b.from_city ?? "—",
          from    : b.from_location ?? b.from_city ?? "—",
          to      : b.to_location   ?? b.to_city   ?? "—",
        })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setBookings(all);
      setLoading(false);
    });
  }, []);

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.city?.toLowerCase().includes(q) ||
      b.ref?.toLowerCase().includes(q)  ||
      b.from?.toLowerCase().includes(q) ||
      b.to?.toLowerCase().includes(q)   ||
      b.service?.toLowerCase().includes(q) ||
      b.mode?.toLowerCase().includes(q);
    const matchService = filterService === "All" || b.service === filterService;
    return matchSearch && matchService;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>Bookings</h2>
        <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
          {loading ? "Loading..." : `${bookings.length} total bookings across all services`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by city, ref, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            color: "var(--foreground)",
          }}
        />
        <div className="flex gap-2 flex-wrap">
          {ALL_SERVICES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterService(s)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor : filterService === s ? "#2979d4" : "var(--card-bg)",
                color           : filterService === s ? "#fff" : "var(--nav-text-muted)",
                border          : filterService === s ? "none" : "1px solid var(--border-color)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Ref", "Service", "Mode", "City", "From", "To", "Sub-type", "Date"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-bold tracking-wider uppercase"
                    style={{ color: "var(--nav-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10" style={{ color: "var(--nav-text-muted)" }}>
                    Loading bookings...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10" style={{ color: "var(--nav-text-muted)" }}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map((b, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td className="px-5 py-4 font-mono text-xs" style={{ color: "#2979d4" }}>{b.ref}</td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full"
                        style={SERVICE_COLORS[b.service]}
                      >
                        {b.service}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>{b.mode ?? "—"}</td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--foreground)" }}>{b.city}</td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>{b.from}</td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>{b.to}</td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>
                      {b.service_type ?? b.cleaning_type ?? b.vehicle_type ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>
                      {b.created_at
                        ? new Date(b.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}