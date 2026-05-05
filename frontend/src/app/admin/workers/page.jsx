"use client";

import { useEffect, useState, useCallback } from "react";

const BASE_URL  = process.env.NEXT_PUBLIC_API_URL  || "http://localhost:5000";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "homeease_admin_2024";

const STATUS_STYLE = {
  pending:  { backgroundColor: "rgba(251,191,36,0.15)",  color: "#f59e0b",  label: "Pending"  },
  approved: { backgroundColor: "rgba(34,197,94,0.15)",   color: "#22c55e",  label: "Approved" },
  rejected: { backgroundColor: "rgba(239,68,68,0.15)",   color: "#ef4444",  label: "Rejected" },
};

const TABS = ["all", "pending", "approved", "rejected"];

export default function AdminWorkersPage() {
  const [workers,    setWorkers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState("all");
  const [search,     setSearch]     = useState("");
  const [actionLoading, setActionLoading] = useState({}); // { [id]: true }
  const [selected,   setSelected]   = useState(null); // worker detail modal

  // ── Fetch workers ──
  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/worker/admin/all`, {
        headers: { "x-admin-key": ADMIN_KEY },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWorkers(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  // ── Approve / Reject ──
  const updateStatus = async (id, newStatus) => {
    setActionLoading((prev) => ({ ...prev, [id]: newStatus }));
    try {
      const res = await fetch(`${BASE_URL}/api/worker/admin/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setWorkers((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w))
      );
      if (selected?.id === id) setSelected((s) => ({ ...s, status: newStatus }));
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  // ── Filter ──
  const filtered = workers.filter((w) => {
    const matchTab =
      activeTab === "all" || (w.status ?? "pending").toLowerCase() === activeTab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      w.name?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      w.phone?.toLowerCase().includes(q) ||
      w.service_type?.toLowerCase().includes(q) ||
      w.city?.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = {
    all:      workers.length,
    pending:  workers.filter((w) => (w.status ?? "pending").toLowerCase() === "pending").length,
    approved: workers.filter((w) => w.status?.toLowerCase() === "approved").length,
    rejected: workers.filter((w) => w.status?.toLowerCase() === "rejected").length,
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            Workers 👷
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--nav-text-muted)" }}>
            Manage worker registrations — approve or reject applications.
          </p>
        </div>
        <button
          onClick={loadWorkers}
          className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
          style={{
            backgroundColor: "rgba(41,121,212,0.1)",
            color: "#2979d4",
            border: "1px solid rgba(41,121,212,0.2)",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Error ── */}
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
          <button onClick={loadWorkers} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* ── Tabs + Search ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
                style={{
                  backgroundColor: active ? "#2979d4" : "var(--card-bg)",
                  color: active ? "#fff" : "var(--nav-text-muted)",
                  border: "1px solid " + (active ? "#2979d4" : "var(--border-color)"),
                }}
              >
                {tab}{" "}
                <span
                  style={{
                    opacity: 0.75,
                    marginLeft: 4,
                    background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)",
                    borderRadius: 99,
                    padding: "0 5px",
                  }}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search name, email, service…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-4 py-2 rounded-xl outline-none"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            color: "var(--foreground)",
            minWidth: 220,
          }}
        />
      </div>

      {/* ── Table ── */}
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
                {["Worker", "Service", "City", "Phone", "Joined", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--nav-text-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6)
                  .fill(null)
                  .map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      {Array(7)
                        .fill(null)
                        .map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div
                              className="h-3 rounded animate-pulse"
                              style={{
                                backgroundColor: "var(--border-color)",
                                width: "75%",
                              }}
                            />
                          </td>
                        ))}
                    </tr>
                  ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-14 text-sm"
                    style={{ color: "var(--nav-text-muted)" }}
                  >
                    {search
                      ? `No workers found for "${search}".`
                      : `No ${activeTab === "all" ? "" : activeTab} workers yet.`}
                  </td>
                </tr>
              ) : (
                filtered.map((w) => {
                  const statusKey = (w.status ?? "pending").toLowerCase();
                  const st = STATUS_STYLE[statusKey] ?? STATUS_STYLE["pending"];
                  const busy = actionLoading[w.id];
                  return (
                    <tr
                      key={w.id}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "rgba(41,121,212,0.04)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {/* Worker */}
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelected(w)}
                          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                        >
                          {w.avatar ? (
                            <img
                              src={w.avatar}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                              style={{ backgroundColor: "#2979d4" }}
                            >
                              {w.name?.[0]?.toUpperCase() ?? "W"}
                            </div>
                          )}
                          <div>
                            <p
                              className="font-semibold text-sm"
                              style={{ color: "var(--foreground)" }}
                            >
                              {w.name ?? "—"}
                            </p>
                            <p
                              className="text-xs truncate max-w-[140px]"
                              style={{ color: "var(--nav-text-muted)" }}
                            >
                              {w.email ?? "—"}
                            </p>
                          </div>
                        </button>
                      </td>

                      {/* Service */}
                      <td
                        className="px-5 py-3 text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {w.service_type ?? w.service ?? "—"}
                      </td>

                      {/* City */}
                      <td
                        className="px-5 py-3 text-xs"
                        style={{ color: "var(--nav-text-muted)" }}
                      >
                        {w.city ?? "—"}
                      </td>

                      {/* Phone */}
                      <td
                        className="px-5 py-3 text-xs font-mono"
                        style={{ color: "var(--nav-text-muted)" }}
                      >
                        {w.phone ?? "—"}
                      </td>

                      {/* Joined */}
                      <td
                        className="px-5 py-3 text-xs"
                        style={{ color: "var(--nav-text-muted)" }}
                      >
                        {w.created_at
                          ? new Date(w.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-3">
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-full capitalize"
                          style={st}
                        >
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {statusKey !== "approved" && (
                            <button
                              disabled={!!busy}
                              onClick={() => updateStatus(w.id, "approved")}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              style={{
                                backgroundColor: "rgba(34,197,94,0.12)",
                                color: "#22c55e",
                                border: "1px solid rgba(34,197,94,0.3)",
                              }}
                            >
                              {busy === "approved" ? "…" : "✔ Approve"}
                            </button>
                          )}
                          {statusKey !== "rejected" && (
                            <button
                              disabled={!!busy}
                              onClick={() => updateStatus(w.id, "rejected")}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              style={{
                                backgroundColor: "rgba(239,68,68,0.1)",
                                color: "#ef4444",
                                border: "1px solid rgba(239,68,68,0.25)",
                              }}
                            >
                              {busy === "rejected" ? "…" : "✖ Reject"}
                            </button>
                          )}
                          <button
                            onClick={() => setSelected(w)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                            style={{
                              backgroundColor: "rgba(41,121,212,0.1)",
                              color: "#2979d4",
                              border: "1px solid rgba(41,121,212,0.2)",
                            }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <h3
                className="font-black text-lg"
                style={{ color: "var(--foreground)" }}
              >
                Worker Details
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all"
                style={{
                  backgroundColor: "rgba(156,163,175,0.15)",
                  color: "var(--nav-text-muted)",
                }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                {selected.avatar ? (
                  <img
                    src={selected.avatar}
                    alt=""
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                    style={{ backgroundColor: "#2979d4" }}
                  >
                    {selected.name?.[0]?.toUpperCase() ?? "W"}
                  </div>
                )}
                <div>
                  <p
                    className="text-xl font-black"
                    style={{ color: "var(--foreground)" }}
                  >
                    {selected.name ?? "—"}
                  </p>
                  <p className="text-sm" style={{ color: "var(--nav-text-muted)" }}>
                    {selected.email ?? "—"}
                  </p>
                  {(() => {
                    const sk =
                      (selected.status ?? "pending").toLowerCase();
                    const st = STATUS_STYLE[sk] ?? STATUS_STYLE["pending"];
                    return (
                      <span
                        className="inline-block mt-1 text-xs font-bold px-3 py-0.5 rounded-full capitalize"
                        style={st}
                      >
                        {st.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Info grid */}
              <div
                className="grid grid-cols-2 gap-3 rounded-xl p-4"
                style={{ backgroundColor: "rgba(41,121,212,0.05)", border: "1px solid var(--border-color)" }}
              >
                {[
                  ["📞 Phone",    selected.phone           ?? "—"],
                  ["🛠 Service",  selected.service_type ?? selected.service ?? "—"],
                  ["🏙 City",     selected.city            ?? "—"],
                  ["🆔 ID",       selected.id              ?? "—"],
                  ["📅 Joined",   selected.created_at
                    ? new Date(selected.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })
                    : "—"],
                  ["⭐ Rating",   selected.rating ?? selected.avg_rating ?? "—"],
                  ["📋 Jobs Done", selected.jobs_done ?? selected.completed_jobs ?? "—"],
                  ["💼 Experience", selected.experience
                    ? `${selected.experience} yrs`
                    : "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p
                      className="text-xs font-semibold mb-0.5"
                      style={{ color: "var(--nav-text-muted)" }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Bio / description */}
              {selected.bio || selected.description ? (
                <div>
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: "var(--nav-text-muted)" }}
                  >
                    📝 About
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--foreground)" }}
                  >
                    {selected.bio ?? selected.description}
                  </p>
                </div>
              ) : null}

              {/* Documents */}
              {selected.document_url || selected.id_proof ? (
                <div>
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: "var(--nav-text-muted)" }}
                  >
                    📎 Document
                  </p>
                  <a
                    href={selected.document_url ?? selected.id_proof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#2979d4] underline"
                  >
                    View Uploaded Document ↗
                  </a>
                </div>
              ) : null}

              {/* Action buttons */}
              {(() => {
                const sk =
                  (selected.status ?? "pending").toLowerCase();
                const busy = actionLoading[selected.id];
                return (
                  <div className="flex gap-3 pt-1">
                    {sk !== "approved" && (
                      <button
                        disabled={!!busy}
                        onClick={() => updateStatus(selected.id, "approved")}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: "#22c55e",
                          color: "#fff",
                        }}
                      >
                        {busy === "approved" ? "Approving…" : "✔ Approve Worker"}
                      </button>
                    )}
                    {sk !== "rejected" && (
                      <button
                        disabled={!!busy}
                        onClick={() => updateStatus(selected.id, "rejected")}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: "rgba(239,68,68,0.12)",
                          color: "#ef4444",
                          border: "1px solid rgba(239,68,68,0.3)",
                        }}
                      >
                        {busy === "rejected" ? "Rejecting…" : "✖ Reject Worker"}
                      </button>
                    )}
                    {sk === "approved" && (
                      <button
                        disabled={!!busy}
                        onClick={() => updateStatus(selected.id, "rejected")}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                          border: "1px solid rgba(239,68,68,0.25)",
                        }}
                      >
                        {busy === "rejected" ? "Revoking…" : "✖ Revoke Approval"}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}