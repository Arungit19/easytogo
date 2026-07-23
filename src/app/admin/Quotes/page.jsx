"use client";

import { useEffect, useState } from "react";

const STATUS_STYLE = {
  pending:     { backgroundColor: "rgba(251,191,36,0.15)",  color: "#f59e0b" },
  in_progress: { backgroundColor: "rgba(41,121,212,0.15)",  color: "#2979d4" },
  completed:   { backgroundColor: "rgba(34,197,94,0.15)",   color: "#22c55e" },
  cancelled:   { backgroundColor: "rgba(156,163,175,0.15)", color: "#9ca3af" },
};

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

async function fetchWithNoCache(url, options = {}) {
  return fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...(options.headers ?? {}),
    },
  });
}

export default function QuotesPage() {
  const [quotes, setQuotes]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [filterService, setFilterService] = useState("All");
  const [error, setError]                 = useState("");
  const [updating, setUpdating]           = useState(null);

  useEffect(() => { fetchQuotes(); }, []);

  async function fetchQuotes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithNoCache("/api/quotes");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Unexpected response format");
      setQuotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ✅ service bhi PATCH mein bhejo
  async function updateStatus(id, status, service) {
    setUpdating(id);
    try {
      const res = await fetchWithNoCache(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, service }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update: ${err.error ?? res.status}`);
        return;
      }
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === id && q.service === service ? { ...q, status } : q
        )
      );
      window.dispatchEvent(
        new CustomEvent("quote-status-updated", { detail: { id, status } })
      );
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = quotes.filter((q) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      q.city?.toLowerCase().includes(s)     ||
      q.from_loc?.toLowerCase().includes(s) ||
      q.to_loc?.toLowerCase().includes(s)   ||
      q.service?.toLowerCase().includes(s)  ||
      q.mode?.toLowerCase().includes(s);
    const matchService =
      filterService === "All" || q.service === filterService;
    return matchSearch && matchService;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
          Quotes
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
          {loading
            ? "Loading..."
            : `${quotes.length} quote requests across all services`}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          ⚠️ {error} —{" "}
          <button onClick={fetchQuotes} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by city, location, service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            color: "var(--foreground)",
          }}
        />
        <button
          onClick={fetchQuotes}
          className="px-4 py-2.5 rounded-xl text-xs font-bold"
          style={{
            backgroundColor: "rgba(41,121,212,0.1)",
            color: "#2979d4",
            border: "1px solid rgba(41,121,212,0.2)",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Service Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {ALL_SERVICES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterService(s)}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              backgroundColor: filterService === s ? "#2979d4" : "var(--card-bg)",
              color:           filterService === s ? "#fff"     : "var(--nav-text-muted)",
              border:          filterService === s ? "none"     : "1px solid var(--border-color)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["ID", "Service", "Mode", "City", "From", "To", "Status", "Date", "Action"].map((h) => (
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
                  <td colSpan={9} className="text-center py-10"
                    style={{ color: "var(--nav-text-muted)" }}>
                    Loading quotes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10"
                    style={{ color: "var(--nav-text-muted)" }}>
                    No quotes found.
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const statusKey   = (q.status ?? "pending").toLowerCase();
                  const statusStyle = STATUS_STYLE[statusKey] ?? STATUS_STYLE["pending"];
                  const updatingKey = `${q.service}-${q.id}`;
                  return (
                    <tr
                      key={updatingKey}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-xs" style={{ color: "#2979d4" }}>
                        #{q.id}
                      </td>

                      {/* Service Badge */}
                      <td className="px-5 py-4">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                          style={SERVICE_COLORS[q.service] ?? {}}
                        >
                          {q.service ?? "—"}
                        </span>
                      </td>

                      {/* Mode */}
                      <td className="px-5 py-4 text-xs capitalize"
                        style={{ color: "var(--nav-text-muted)" }}>
                        {q.mode ?? "—"}
                      </td>

                      {/* City */}
                      <td className="px-5 py-4 text-xs"
                        style={{ color: "var(--foreground)" }}>
                        {q.city ?? "—"}
                      </td>

                      {/* From */}
                      <td className="px-5 py-4 text-xs"
                        style={{ color: "var(--nav-text-muted)" }}>
                        {q.from_loc ?? "—"}
                      </td>

                      {/* To */}
                      <td className="px-5 py-4 text-xs"
                        style={{ color: "var(--nav-text-muted)" }}>
                        {q.to_loc ?? "—"}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full capitalize"
                          style={statusStyle}
                        >
                          {statusKey.replace("_", " ")}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-xs"
                        style={{ color: "var(--nav-text-muted)" }}>
                        {q.created_at
                          ? new Date(q.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Action — service pass karo */}
                      <td className="px-5 py-4">
                        <select
                          value={statusKey}
                          disabled={updating === updatingKey}
                          onChange={(e) =>
                            updateStatus(q.id, e.target.value, q.service)
                          }
                          className="text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                          style={{
                            backgroundColor: "rgba(41,121,212,0.1)",
                            color: "#2979d4",
                            border: "1px solid rgba(41,121,212,0.2)",
                            opacity: updating === updatingKey ? 0.5 : 1,
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}