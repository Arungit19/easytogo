"use client";

import { useEffect, useState, useCallback } from "react";

const STATUS_STYLE = {
  paid:    { backgroundColor: "rgba(34,197,94,0.15)",   color: "#22c55e" },
  created: { backgroundColor: "rgba(251,191,36,0.15)",  color: "#f59e0b" },
  failed:  { backgroundColor: "rgba(239,68,68,0.15)",   color: "#ef4444" },
  cod:     { backgroundColor: "rgba(202,138,4,0.15)",   color: "#ca8a04" },
};

const SERVICE_COLORS = {
  "Home Shifting":       { backgroundColor: "rgba(41,121,212,0.15)",  color: "#2979d4" },
  "Cleaning":            { backgroundColor: "rgba(6,182,212,0.15)",   color: "#06b6d4" },
  "Office Relocation":   { backgroundColor: "rgba(236,72,153,0.15)",  color: "#ec4899" },
  "Packing & Unpacking": { backgroundColor: "rgba(249,115,22,0.15)",  color: "#f97316" },
  "Storage":             { backgroundColor: "rgba(20,184,166,0.15)",  color: "#14b8a6" },
  "Vehicle Transport":   { backgroundColor: "rgba(168,85,247,0.15)",  color: "#a855f7" },
};

const METHOD_STYLE = {
  razorpay: { backgroundColor: "rgba(41,121,212,0.12)", color: "#2979d4",  label: "💳 Razorpay" },
  cod:      { backgroundColor: "rgba(202,138,4,0.12)",  color: "#ca8a04",  label: "💵 Cash on Delivery" },
  online:   { backgroundColor: "rgba(41,121,212,0.12)", color: "#2979d4",  label: "💳 Online" },
  free:     { backgroundColor: "rgba(107,114,128,0.12)",color: "#6b7280",  label: "🎁 Free" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtAmount(val) {
  if (!val && val !== 0) return "—";
  // Handle paise (Razorpay) vs rupees
  const rupees = val > 10000 ? val / 100 : val;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

// Resolve payment method from raw row
function resolveMethod(p) {
  if (p.payment_method) return p.payment_method.toLowerCase();
  if (p.razorpay_payment_id || p.razorpay_order_id) return "razorpay";
  if (p.status === "cod") return "cod";
  return "—";
}

// Resolve display status
function resolveStatus(p) {
  if (p.status === "cod") return "cod";
  if (p.status === "paid") return "paid";
  if (p.status === "failed") return "failed";
  return "created";
}

export default function PaymentsPage() {
  const [payments, setPayments]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterService, setFilterService] = useState("All");
  const [filterMethod, setFilterMethod]   = useState("all");
  const [expandedId, setExpandedId]       = useState(null);

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

  // Enrich rows with resolved fields
  const enriched = payments.map(p => ({
    ...p,
    _method: resolveMethod(p),
    _status: resolveStatus(p),
  }));

  const filtered = enriched.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.customer_name?.toLowerCase().includes(q)  ||
      p.customer_email?.toLowerCase().includes(q) ||
      p.customer_phone?.toLowerCase().includes(q) ||
      p.razorpay_order_id?.toLowerCase().includes(q) ||
      p.razorpay_payment_id?.toLowerCase().includes(q) ||
      p.service?.toLowerCase().includes(q);
    const matchStatus  = filterStatus  === "all" || p._status  === filterStatus;
    const matchService = filterService === "All" || p.service === filterService;
    const matchMethod  = filterMethod  === "all" || p._method  === filterMethod;
    return matchSearch && matchStatus && matchService && matchMethod;
  });

  // Revenue: online paid only
  const onlineRevenue = enriched
    .filter(p => p._status === "paid")
    .reduce((sum, p) => {
      const val = p.amount ?? 0;
      return sum + (val > 10000 ? val / 100 : val);
    }, 0);

  // COD expected revenue
  const codRevenue = enriched
    .filter(p => p._status === "cod")
    .reduce((sum, p) => {
      const val = p.payment_amount ?? p.amount ?? 0;
      return sum + (val > 10000 ? val / 100 : val);
    }, 0);

  const countStatus = (s) => enriched.filter(p => p._status === s).length;
  const countMethod = (m) => enriched.filter(p => p._method === m).length;

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

      {/* Stats Row 1 — Revenue & counts */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Online Revenue",
                value: `₹${onlineRevenue.toLocaleString("en-IN")}`,
                color: "#22c55e",
                bg:    "rgba(34,197,94,0.1)",
                icon:  "💰",
              },
              {
                label: "COD Expected",
                value: `₹${codRevenue.toLocaleString("en-IN")}`,
                color: "#ca8a04",
                bg:    "rgba(202,138,4,0.1)",
                icon:  "💵",
              },
              {
                label: "Paid Online",
                value: countStatus("paid"),
                color: "#22c55e",
                bg:    "rgba(34,197,94,0.1)",
                icon:  "✅",
              },
              {
                label: "Cash on Delivery",
                value: countStatus("cod"),
                color: "#ca8a04",
                bg:    "rgba(202,138,4,0.1)",
                icon:  "🏠",
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

          {/* Stats Row 2 — Pending & Failed */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Pending Orders",
                value: countStatus("created"),
                color: "#f59e0b",
                bg:    "rgba(251,191,36,0.1)",
                icon:  "⏳",
              },
              {
                label: "Failed",
                value: countStatus("failed"),
                color: "#ef4444",
                bg:    "rgba(239,68,68,0.1)",
                icon:  "❌",
              },
              {
                label: "Total Transactions",
                value: payments.length,
                color: "#2979d4",
                bg:    "rgba(41,121,212,0.1)",
                icon:  "📊",
              },
              {
                label: "Total Revenue",
                value: `₹${(onlineRevenue + codRevenue).toLocaleString("en-IN")}`,
                color: "#8b5cf6",
                bg:    "rgba(139,92,246,0.1)",
                icon:  "🏦",
                sub:   "Online + COD",
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
                {s.sub && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--nav-text-muted)", opacity: 0.6 }}>
                    {s.sub}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
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
          placeholder="Search by name, email, phone, order ID, payment ID..."
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
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>Status:</span>
          {[
            { key: "all",     label: "All" },
            { key: "paid",    label: "✅ Paid" },
            { key: "cod",     label: "💵 COD" },
            { key: "created", label: "⏳ Pending" },
            { key: "failed",  label: "❌ Failed" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: filterStatus === s.key ? "#2979d4" : "var(--card-bg)",
                color:           filterStatus === s.key ? "#fff"     : "var(--nav-text-muted)",
                border:          filterStatus === s.key ? "none"     : "1px solid var(--border-color)",
              }}
            >
              {s.label}
              {s.key !== "all" && (
                <span style={{ opacity: 0.7, marginLeft: 4 }}>({countStatus(s.key)})</span>
              )}
            </button>
          ))}
        </div>

        {/* Payment Method Filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>Method:</span>
          {[
            { key: "all",      label: "All Methods" },
            { key: "razorpay", label: "💳 Razorpay" },
            { key: "cod",      label: "💵 COD" },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setFilterMethod(m.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: filterMethod === m.key ? "#2979d4" : "var(--card-bg)",
                color:           filterMethod === m.key ? "#fff"     : "var(--nav-text-muted)",
                border:          filterMethod === m.key ? "none"     : "1px solid var(--border-color)",
              }}
            >
              {m.label}
              {m.key !== "all" && (
                <span style={{ opacity: 0.7, marginLeft: 4 }}>({countMethod(m.key)})</span>
              )}
            </button>
          ))}
        </div>

        {/* Service Filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>Service:</span>
          {["All", "Home Shifting", "Cleaning", "Office Relocation", "Packing & Unpacking", "Storage", "Vehicle Transport"].map(s => (
            <button
              key={s}
              onClick={() => setFilterService(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
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
                {["Order / Payment ID", "Customer", "Service", "Method", "Amount", "Status", "Date"].map(h => (
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
                    {Array(7).fill(null).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 rounded animate-pulse"
                          style={{ backgroundColor: "var(--border-color)", width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14"
                    style={{ color: "var(--nav-text-muted)" }}>
                    <div className="text-4xl mb-2">💳</div>
                    <div className="text-sm font-medium">Koi payment nahi mili</div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const statusStyle = STATUS_STYLE[p._status] ?? STATUS_STYLE["created"];
                  const methodStyle = METHOD_STYLE[p._method] ?? {};
                  const isExpanded  = expandedId === p.id;

                  const statusLabel =
                    p._status === "cod"     ? "💵 COD"     :
                    p._status === "paid"    ? "✅ Paid"    :
                    p._status === "failed"  ? "❌ Failed"  :
                    "⏳ Pending";

                  return (
                    <>
                      <tr
                        key={p.id}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        style={{
                          borderBottom: isExpanded ? "none" : "1px solid var(--border-color)",
                          cursor: "pointer",
                          transition: "background .15s",
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.04)")
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.backgroundColor = "transparent")
                        }
                      >
                        {/* Order / Payment ID */}
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs" style={{ color: "#2979d4" }}>
                            {p.razorpay_order_id ?? (p._status === "cod" ? "COD-" + p.id : "—")}
                          </div>
                          {p.razorpay_payment_id && (
                            <div className="font-mono text-[10px] mt-0.5" style={{ color: "var(--nav-text-muted)" }}>
                              {p.razorpay_payment_id}
                            </div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                            {p.customer_name ?? "—"}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--nav-text-muted)" }}>
                            {p.customer_email ?? ""}
                          </div>
                          {p.customer_phone && (
                            <div className="text-[10px] mt-0.5" style={{ color: "var(--nav-text-muted)" }}>
                              📞 {p.customer_phone}
                            </div>
                          )}
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

                        {/* Method */}
                        <td className="px-5 py-4">
                          {p._method !== "—" ? (
                            <span
                              className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                              style={methodStyle}
                            >
                              {METHOD_STYLE[p._method]?.label ?? p._method}
                            </span>
                          ) : (
                            <span style={{ color: "var(--nav-text-muted)", fontSize: "0.7rem" }}>—</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 font-black text-sm" style={{ color: "var(--foreground)" }}>
                          {fmtAmount(p.payment_amount ?? p.amount)}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full capitalize whitespace-nowrap"
                            style={statusStyle}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-xs" style={{ color: "var(--nav-text-muted)" }}>
                          {fmtDate(p.created_at)}
                          <div style={{ fontSize: "0.6rem", opacity: 0.6, marginTop: 2 }}>
                            {isExpanded ? "▲ collapse" : "▼ details"}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr key={`${p.id}-expanded`} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td colSpan={7} className="px-5 pb-5 pt-2">
                            <div
                              className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs"
                              style={{
                                backgroundColor:
                                  p._status === "cod"
                                    ? "rgba(202,138,4,0.06)"
                                    : "rgba(41,121,212,0.04)",
                                border: `1px solid ${
                                  p._status === "cod"
                                    ? "rgba(202,138,4,0.2)"
                                    : "rgba(41,121,212,0.12)"
                                }`,
                              }}
                            >
                              {[
                                { label: "Booking ID",    value: p.booking_id ?? p.id ?? "—" },
                                { label: "Razorpay Order",value: p.razorpay_order_id ?? "—" },
                                { label: "Payment ID",    value: p.razorpay_payment_id ?? (p._status === "cod" ? "Cash — not yet received" : "—") },
                                { label: "Payment Method",value: METHOD_STYLE[p._method]?.label ?? p._method ?? "—" },
                                { label: "Amount",        value: fmtAmount(p.payment_amount ?? p.amount) },
                                { label: "Status",        value: statusLabel },
                                { label: "Service",       value: p.service ?? "—" },
                                { label: "Booked On",     value: fmtDate(p.created_at) },
                              ].map(({ label, value }) => (
                                <div key={label}>
                                  <div className="font-bold uppercase tracking-wider mb-1"
                                    style={{ color: "var(--nav-text-muted)", fontSize: "0.6rem", letterSpacing: ".06em" }}>
                                    {label}
                                  </div>
                                  <div className="font-semibold break-all"
                                    style={{ color: "var(--foreground)", fontFamily: label.includes("ID") || label.includes("Order") ? "monospace" : "inherit" }}>
                                    {value}
                                  </div>
                                </div>
                              ))}

                              {/* COD note */}
                              {p._status === "cod" && (
                                <div className="col-span-2 sm:col-span-4 mt-1">
                                  <div
                                    className="rounded-xl px-4 py-2 text-xs font-medium"
                                    style={{
                                      backgroundColor: "rgba(202,138,4,0.10)",
                                      color: "#ca8a04",
                                      border: "1px solid rgba(202,138,4,0.25)",
                                    }}
                                  >
                                    💡 <strong>COD Booking:</strong> Customer will pay{" "}
                                    {fmtAmount(p.payment_amount ?? p.amount)} in cash when your executive arrives.
                                    Ensure payment is collected before service is delivered.
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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