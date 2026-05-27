"use client";

import { useEffect, useState, useCallback } from "react";

const STATUS_STYLE = {
  pending:     { backgroundColor: "rgba(251,191,36,0.15)",  color: "#f59e0b" },
  confirmed:   { backgroundColor: "rgba(41,121,212,0.15)",  color: "#2979d4" },
  in_progress: { backgroundColor: "rgba(251,191,36,0.15)",  color: "#f59e0b" },
  completed:   { backgroundColor: "rgba(34,197,94,0.15)",   color: "#22c55e" },
  cancelled:   { backgroundColor: "rgba(156,163,175,0.15)", color: "#9ca3af" },
};

const SERVICE_ICONS = {
  "Home Shifting":       "🏠",
  "Cleaning":            "🧹",
  "Office Relocation":   "🏢",
  "Packing & Unpacking": "📦",
  "Storage":             "🗄️",
  "Vehicle Transport":   "🚗",
};

// ✅ FIX 1: cache: "no-store" prevents Next.js from returning stale cached responses
async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data
         : Array.isArray(data.messages) ? data.messages
         : [];
  } catch {
    return [];
  }
}

function extractCity(b) {
  return (
    b.city          ??
    b.from_city     ??
    b.pickup_city   ??
    b.origin_city   ??
    b.from_place    ??
    b.from_location ??
    b.location      ??
    b.area          ??
    "—"
  );
}

export default function AdminDashboard() {
  const [stats, setStats]                     = useState([]);
  const [recentBookings, setRecentBookings]   = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [recentQuotes, setRecentQuotes]       = useState([]);
  const [recentMessages, setRecentMessages]   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [fetchError, setFetchError]           = useState(false);

  // ✅ FIX 2: useCallback so the same function ref can be used in event listeners
  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [home, cleaning, office, packing, storage, vehicle, customers, quotes, messages] =
        await Promise.all([
          safeFetch("/api/home-shifting"),
          safeFetch("/api/cleaning-booking"),
          safeFetch("/api/office-relocation"),
          safeFetch("/api/packing"),
          safeFetch("/api/storage-booking"),
          safeFetch("/api/vehicle-transport"),
          safeFetch("/api/customers"),
          safeFetch("/api/quotes"),
          safeFetch("/api/get-in-touch"),
        ]);

      // Build a status lookup from the quotes table (source of truth for status changes)
      const quoteStatusByRef = {};
      const quoteStatusById  = {};
      quotes.forEach((q) => {
        const s = (q.status ?? "pending").toLowerCase();
        if (q.ref_id)      quoteStatusByRef[q.ref_id]            = s;
        if (q.booking_ref) quoteStatusByRef[q.booking_ref]       = s;
        if (q.booking_id)  quoteStatusById[String(q.booking_id)] = s;
      });

      function resolveStatus(b, ref) {
        return (
          quoteStatusByRef[ref]           ??
          quoteStatusById[String(b.id)]   ??
          (b.status ?? "pending").toLowerCase()
        );
      }

      const all = [
        ...home.map(b => {
          const ref = b.ref_id ?? `#${b.id}`;
          return { ...b, service: "Home Shifting",       ref, city: extractCity(b), status: resolveStatus(b, ref) };
        }),
        ...cleaning.map(b => {
          const ref = b.booking_ref ?? `#${b.id}`;
          return { ...b, service: "Cleaning",            ref, city: extractCity(b), status: resolveStatus(b, ref) };
        }),
        ...office.map(b => {
          const ref = b.ref_id ?? `#${b.id}`;
          return { ...b, service: "Office Relocation",   ref, city: extractCity(b), status: resolveStatus(b, ref) };
        }),
        ...packing.map(b => {
          const ref = b.ref_id ?? `#${b.id}`;
          return { ...b, service: "Packing & Unpacking", ref, city: extractCity(b), status: resolveStatus(b, ref) };
        }),
        ...storage.map(b => {
          const ref = b.ref_id ?? `#${b.id}`;
          return { ...b, service: "Storage",             ref, city: extractCity(b), status: resolveStatus(b, ref) };
        }),
        ...vehicle.map(b => {
          const ref = b.ref_id ?? `#${b.id}`;
          return { ...b, service: "Vehicle Transport",   ref, city: extractCity(b), status: resolveStatus(b, ref) };
        }),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const total     = all.length;
      const pending   = all.filter(b => b.status === "pending").length;
      const completed = all.filter(b => b.status === "completed").length;
      const now       = new Date();
      const today     = all.filter(b => {
        const d = new Date(b.created_at);
        return (
          d.getDate()     === now.getDate()     &&
          d.getMonth()    === now.getMonth()    &&
          d.getFullYear() === now.getFullYear()
        );
      }).length;
      const pendingQuotes = quotes.filter(q => (q.status ?? "pending").toLowerCase() === "pending").length;

      setStats([
        { label: "Total Bookings",   value: total,            icon: "📋", change: "all time",     up: true  },
        { label: "Customers",        value: customers.length, icon: "👥", change: "registered",   up: true  },
        { label: "Pending",          value: pending,          icon: "⏳", change: "needs action",  up: false },
        { label: "Completed",        value: completed,        icon: "✅", change: "done",           up: true  },
        { label: "Quotes",           value: quotes.length,    icon: "💬", change: "all time",      up: true  },
        { label: "Get In Touch",     value: messages.length,  icon: "Inbox", change: "messages",     up: true  },
        { label: "Pending Quotes",   value: pendingQuotes,    icon: "🕐", change: "needs action",  up: false },
        { label: "Today's Bookings", value: today,            icon: "📅", change: "today",          up: true  },
      ]);

      setRecentBookings(all.slice(0, 8));
      setRecentCustomers(
        [...customers]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      );
      setRecentQuotes(
        [...quotes]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      );
      setRecentMessages(
        [...messages]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      );
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // ✅ FIX 3: Re-fetch when user navigates back to this tab (e.g. after updating quotes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    };

    // ✅ FIX 4: Listen for a custom event dispatched by the Quotes page after a status update
    const handleQuoteUpdated = () => {
      loadData();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("quote-status-updated", handleQuoteUpdated);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("quote-status-updated", handleQuoteUpdated);
    };
  }, [loadData]);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            Welcome back, Admin 👋
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
            Here&apos;s what&apos;s happening with ShiftEase today.
          </p>
        </div>
        <button
          onClick={loadData}
          className="text-xs font-bold px-4 py-2 rounded-xl"
          style={{
            backgroundColor: "rgba(41,121,212,0.1)",
            color: "#2979d4",
            border: "1px solid rgba(41,121,212,0.2)",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {fetchError && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          ⚠️ Failed to load data —{" "}
          <button onClick={loadData} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array(7).fill(null).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 animate-pulse"
                style={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  height: 110,
                }}
              />
            ))
          : stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: s.up
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.15)",
                      color: s.up ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {s.change}
                  </span>
                </div>
                <p className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
                  {s.value}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--nav-text-muted)" }}>
                  {s.label}
                </p>
              </div>
            ))}
      </div>

      {/* Recent Bookings Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
            Recent Bookings
          </h3>
          <a
            href="/admin/bookings"
            className="text-xs font-semibold text-[#2979d4] hover:underline"
          >
            View All →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Booking Ref", "Service", "City", "Date", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs font-bold tracking-wider uppercase"
                    style={{ color: "var(--nav-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(null).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {Array(5).fill(null).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div
                          className="h-3 rounded animate-pulse"
                          style={{ backgroundColor: "var(--border-color)", width: "80%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recentBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10"
                    style={{ color: "var(--nav-text-muted)" }}
                  >
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                recentBookings.map((b, i) => {
                  const statusKey = b.status ?? "pending";
                  const style     = STATUS_STYLE[statusKey] ?? STATUS_STYLE["pending"];
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td className="px-6 py-4 font-mono text-xs text-[#2979d4]">{b.ref}</td>
                      <td className="px-6 py-4 font-medium" style={{ color: "var(--foreground)" }}>
                        {SERVICE_ICONS[b.service]} {b.service}
                      </td>
                      <td className="px-6 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>
                        {b.city}
                      </td>
                      <td className="px-6 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>
                        {b.created_at
                          ? new Date(b.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-full capitalize"
                          style={style}
                        >
                          {statusKey.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Customers + Recent Quotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Customers */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
              Recent Customers
            </h3>
            <a
              href="/admin/customers"
              className="text-xs font-semibold text-[#2979d4] hover:underline"
            >
              View All →
            </a>
          </div>
          {loading ? (
            <div
              className="px-6 py-10 text-center text-xs"
              style={{ color: "var(--nav-text-muted)" }}
            >
              Loading...
            </div>
          ) : recentCustomers.length === 0 ? (
            <div
              className="px-6 py-10 text-center text-xs"
              style={{ color: "var(--nav-text-muted)" }}
            >
              No customers yet.
            </div>
          ) : (
            recentCustomers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-6 py-3"
                style={{ borderBottom: "1px solid var(--border-color)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {u.avatar ? (
                  <img
                    src={u.avatar}
                    className="w-8 h-8 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: "#2979d4" }}
                  >
                    {u.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {u.name ?? "—"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--nav-text-muted)" }}>
                    {u.email ?? u.phone ?? "—"}
                  </p>
                </div>
                <span
                  className="text-xs flex-shrink-0"
                  style={{ color: "var(--nav-text-muted)" }}
                >
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "—"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Quotes */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
              Recent Quotes
            </h3>
            <a
              href="/admin/Quotes"
              className="text-xs font-semibold text-[#2979d4] hover:underline"
            >
              View All →
            </a>
          </div>
          {loading ? (
            <div
              className="px-6 py-10 text-center text-xs"
              style={{ color: "var(--nav-text-muted)" }}
            >
              Loading...
            </div>
          ) : recentQuotes.length === 0 ? (
            <div
              className="px-6 py-10 text-center text-xs"
              style={{ color: "var(--nav-text-muted)" }}
            >
              No quotes yet.
            </div>
          ) : (
            recentQuotes.map((q) => {
              const statusKey = (q.status ?? "pending").toLowerCase();
              const style     = STATUS_STYLE[statusKey] ?? STATUS_STYLE["pending"];
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-3 px-6 py-3"
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      #{q.id} — {q.mode ?? q.service_type ?? "—"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--nav-text-muted)" }}>
                      {q.from_location ?? q.from_city ?? "—"} →{" "}
                      {q.to_location ?? q.to_city ?? "—"}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full capitalize flex-shrink-0"
                    style={style}
                  >
                    {statusKey.replace("_", " ")}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Get In Touch */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
              Recent Get In Touch
            </h3>
            <a
              href="/admin/get-in-touch"
              className="text-xs font-semibold text-[#2979d4] hover:underline"
            >
              View All →
            </a>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-xs" style={{ color: "var(--nav-text-muted)" }}>
              Loading...
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs" style={{ color: "var(--nav-text-muted)" }}>
              No contact messages yet.
            </div>
          ) : (
            recentMessages.map((m) => (
              <div
                key={m.id}
                className="px-6 py-3"
                style={{ borderBottom: "1px solid var(--border-color)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {m.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--nav-text-muted)" }}>
                      {m.email} {m.phone ? `· ${m.phone}` : ""}
                    </p>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--nav-text-muted)" }}>
                      {m.message}
                    </p>
                  </div>
                  <span className="text-[10px] whitespace-nowrap" style={{ color: "var(--nav-text-muted)" }}>
                    {m.created_at
                      ? new Date(m.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "-"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
