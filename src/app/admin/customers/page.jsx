"use client";

import { useEffect, useState, useCallback } from "react";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [search, setSearch]       = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();

      const list = Array.isArray(data)           ? data
                 : Array.isArray(data.customers) ? data.customers
                 : Array.isArray(data.users)     ? data.users
                 : Array.isArray(data.data)      ? data.data
                 : [];

      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setCustomers(sorted);
    } catch (err) {
      console.error("[customers] load error:", err.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const filtered = customers.filter(u => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.name?.toLowerCase().includes(q)  ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            Customers
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
            {loading ? "Loading..." : `${filtered.length} of ${customers.length} customers`}
          </p>
        </div>
        <button
          onClick={loadCustomers}
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

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Total Customers",
              value: customers.length,
              color: "#2979d4",
              bg: "rgba(41,121,212,0.1)",
              icon: "👥",
            },
            {
              label: "Google Login",
              value: customers.filter(u => u.provider === "google").length,
              color: "#ea4335",
              bg: "rgba(234,67,53,0.1)",
              icon: "🌐",
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
          ⚠️ Data load nahi hua —{" "}
          <button onClick={loadCustomers} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name, email, phone, city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            color: "var(--foreground)",
          }}
        />
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
                {["Customer", "Email", "Phone", "City", "Provider", "Joined"].map(h => (
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
                Array(6).fill(null).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {Array(6).fill(null).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div
                          className="h-3 rounded animate-pulse"
                          style={{ backgroundColor: "var(--border-color)", width: "70%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14"
                    style={{ color: "var(--nav-text-muted)" }}>
                    <div className="text-4xl mb-2">👥</div>
                    <div className="text-sm font-medium">Koi customer nahi mila</div>
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => (
                  <tr
                    key={u.id ?? i}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.04)")
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    {/* Avatar + Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            alt=""
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                            style={{ backgroundColor: "#2979d4" }}
                          >
                            {(u.name?.[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-semibold"
                          style={{ color: "var(--foreground)" }}>
                          {u.name ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3 text-xs"
                      style={{ color: "var(--nav-text-muted)" }}>
                      {u.email ?? "—"}
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-3 text-xs"
                      style={{ color: "var(--nav-text-muted)" }}>
                      {u.phone ?? "—"}
                    </td>

                    {/* City */}
                    <td className="px-5 py-3 text-xs"
                      style={{ color: "var(--nav-text-muted)" }}>
                      {u.city ?? "—"}
                    </td>

                    {/* Provider */}
                    <td className="px-5 py-3">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full capitalize"
                        style={{
                          backgroundColor: u.provider === "google"
                            ? "rgba(234,67,53,0.1)"
                            : "rgba(41,121,212,0.1)",
                          color: u.provider === "google" ? "#ea4335" : "#2979d4",
                        }}
                      >
                        {u.provider === "google" ? "🌐 Google" : "🔑 Local"}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3 text-xs"
                      style={{ color: "var(--nav-text-muted)" }}>
                      {fmtDate(u.created_at)}
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