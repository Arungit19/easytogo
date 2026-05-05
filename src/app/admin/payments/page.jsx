"use client";

import { useEffect, useState, useCallback } from "react";

const STATUS_STYLE = {
  paid:    { backgroundColor: "rgba(34,197,94,0.15)",   color: "#22c55e" },
  created: { backgroundColor: "rgba(251,191,36,0.15)",  color: "#f59e0b" },
  failed:  { backgroundColor: "rgba(239,68,68,0.15)",   color: "#ef4444" },
};

const SERVICE_COLORS = {
  "Home Shifting":       { backgroundColor: "rgba(41,121,212,0.15)",  color: "#2979d4" },
  "Cleaning":            { backgroundColor: "rgba(6,182,212,0.15)",   color: "#06b6d4" },
  "Office Relocation":   { backgroundColor: "rgba(236,72,153,0.15)",  color: "#ec4899" },
  "Packing & Unpacking": { backgroundColor: "rgba(249,115,22,0.15)",  color: "#f97316" },
  "Storage":             { backgroundColor: "rgba(20,184,166,0.15)",  color: "#14b8a6" },
  "Vehicle Transport":   { backgroundColor: "rgba(168,85,247,0.15)",  color: "#a855f7" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtAmount(paise) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function PaymentsPage() {
  const [payments, setPayments]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterService, setFilterService] = useState("All");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments", { cache: "no-store" });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.customer_name?.toLowerCase().includes(q)  ||
      p.customer_email?.toLowerCase().includes(q) ||
      p.customer_phone?.toLowerCase().includes(q) ||
      p.razorpay_order_id?.toLowerCase().includes(q) ||
      p.service?.toLowerCase().includes(q);
    const matchStatus  = filterStatus  === "all" || p.status  === filterStatus;
    const matchService = filterService === "All" || p.service === filterService;
    return matchSearch && matchStatus && matchService;
  });

  const totalRevenue = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            Payments
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
            {loading ? "Loading..." : `${filtered.length} of ${payments.length} transactions`}
          </p>
        </div>
        <button
          onClick={loadPayments}
          disabled={loading}
          className="text-xs font-bold px-4 py-2 rounded-xl"
          style={{
            backgroundColor: "rgba(41,121,212,0.1)",
            color: "#2979d4",
            border: "1px solid rgba(41,121,212,0.2)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Revenue",
              value: fmtAmount(totalRevenue),
              color: "#22c55e",
              bg:    "rgba(34,197,94,0.1)",
              icon:  "💰",
            },
            {
              label: "Paid",
              value: payments.filter(p => p.status === "paid").length,
              color: "#22c55e",
              bg:    "rgba(34,197,94,0.1)",
              icon:  "✅",
            },
            {
              label: "Pending",
              value: payments.filter(p => p.status === "created").length,
              color: "#f59e0b",
              bg:    "rgba(251,191,36,0.1)",
              icon:  "⏳",
            },
            {
              label: "Failed",
              value: payments.filter(p => p.status === "failed").length,
              color: "#ef4444",
              bg:    "rgba(239,68,68,0.1)",
              icon:  "❌",
            },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3"
                style={{ backgroundColor: s.bg }}
              >
                {s.icon}
              </div>
              <p className="text-2xl font-black" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs mt-1 font-semibold"
                style={{ color: "var(--nav-text-muted)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

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
          <button onClick={loadPayments} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Search by name, email, phone, order ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            color: "var(--foreground)",
          }}
        />

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "paid", "created", "failed"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={{
                backgroundColor: filterStatus === s ? "#2979d4" : "var(--card-bg)",
                color:           filterStatus === s ? "#fff"     : "var(--nav-text-muted)",
                border:          filterStatus === s ? "none"     : "1px solid var(--border-color)",
              }}
            >
              {s === "created" ? "⏳ Pending" : s === "paid" ? "✅ Paid" : s === "failed" ? "❌ Failed" : "All"}
            </button>
          ))}
        </div>

        {/* Service Filter */}
        <div className="flex gap-2 flex-wrap">
          {["All", "Home Shifting", "Cleaning", "Office Relocation", "Packing & Unpacking", "Storage", "Vehicle Transport"].map(s => (
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
                {["Order ID", "Customer", "Service", "Amount", "Status", "Date"].map(h => (
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
                Array(5).fill(null).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {Array(6).fill(null).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 rounded animate-pulse"
                          style={{ backgroundColor: "var(--border-color)", width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14"
                    style={{ color: "var(--nav-text-muted)" }}>
                    <div className="text-4xl mb-2">💳</div>
                    <div className="text-sm font-medium">Koi payment nahi mili</div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const statusStyle = STATUS_STYLE[p.status] ?? STATUS_STYLE["created"];
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.04)")
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {/* Order ID */}
                      <td className="px-5 py-4 font-mono text-xs"
                        style={{ color: "#2979d4" }}>
                        {p.razorpay_order_id ?? "—"}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold"
                          style={{ color: "var(--foreground)" }}>
                          {p.customer_name ?? "—"}
                        </div>
                        <div className="text-xs mt-0.5"
                          style={{ color: "var(--nav-text-muted)" }}>
                          {p.customer_email ?? p.customer_phone ?? ""}
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-5 py-4">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                          style={SERVICE_COLORS[p.service] ?? {}}
                        >
                          {p.service ?? "—"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 text-sm font-black"
                        style={{ color: "var(--foreground)" }}>
                        {p.amount ? fmtAmount(p.amount) : "—"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full capitalize"
                          style={statusStyle}
                        >
                          {p.status === "created" ? "⏳ Pending"
                           : p.status === "paid"  ? "✅ Paid"
                           : "❌ Failed"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-xs"
                        style={{ color: "var(--nav-text-muted)" }}>
                        {fmtDate(p.created_at)}
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