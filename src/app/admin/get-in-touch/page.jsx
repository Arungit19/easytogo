"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminGetInTouchPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/get-in-touch", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError(err.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) =>
      [m.name, m.email, m.phone, m.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [messages, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            Get In Touch
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
            {loading ? "Loading..." : `${filtered.length} of ${messages.length} contact messages`}
          </p>
        </div>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="text-xs font-bold px-4 py-2 rounded-xl"
          style={{
            backgroundColor: "rgba(41,121,212,0.1)",
            color: "#2979d4",
            border: "1px solid rgba(41,121,212,0.2)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          {error}{" "}
          <button onClick={loadMessages} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total Messages", value: messages.length, color: "#2979d4" },
          {
            label: "Today",
            value: messages.filter((m) => {
              const d = new Date(m.created_at);
              const now = new Date();
              return d.toDateString() === now.toDateString();
            }).length,
            color: "#22c55e",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-4"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            <p className="text-2xl font-black" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nav-text-muted)" }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <input
        type="text"
        placeholder="Search by name, email, phone, message..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          color: "var(--foreground)",
        }}
      />

      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Name", "Contact", "Message", "Received"].map((h) => (
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
                    {Array(4).fill(null).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div
                          className="h-3 rounded animate-pulse"
                          style={{ backgroundColor: "var(--border-color)", width: "75%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-14" style={{ color: "var(--nav-text-muted)" }}>
                    No contact messages found.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                        {m.name}
                      </p>
                      <span
                        className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 capitalize"
                        style={{ backgroundColor: "rgba(41,121,212,0.1)", color: "#2979d4" }}
                      >
                        {m.status || "new"}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-xs" style={{ color: "var(--nav-text-muted)" }}>
                      <a href={`mailto:${m.email}`} className="block font-semibold text-[#2979d4]">
                        {m.email}
                      </a>
                      {m.phone ? (
                        <a href={`tel:${m.phone}`} className="block mt-1">
                          {m.phone}
                        </a>
                      ) : (
                        <span className="block mt-1">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top" style={{ color: "var(--foreground)" }}>
                      <p className="max-w-xl whitespace-pre-wrap leading-relaxed">{m.message}</p>
                    </td>
                    <td className="px-5 py-4 align-top text-xs whitespace-nowrap" style={{ color: "var(--nav-text-muted)" }}>
                      {fmtDate(m.created_at)}
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
