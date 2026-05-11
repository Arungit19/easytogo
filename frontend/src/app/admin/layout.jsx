"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/admin",            label: "Dashboard", icon: "📊" },
  { href: "/admin/bookings",   label: "Bookings",  icon: "📋" },
  { href: "/admin/customers",  label: "Customers", icon: "👥" },
  { href: "/admin/workers",    label: "Workers",   icon: "👷" },
  { href: "/admin/Quotes",     label: "Quotes",    icon: "💬" },
  { href: "/admin/payments",   label: "Payments",  icon: "💳" },
  { href: "/admin/services",   label: "Services",  icon: "🛠️" },
  { href: "/admin/tracking",   label: "Tracking",  icon: "🗺️" }, // ← NEW
  { href: "/admin/settings",   label: "Settings",  icon: "⚙️" },
];

const NAVBAR_HEIGHT = 64;

export default function AdminLayout({ children }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [admin, setAdmin]         = useState(null);
  const [checking, setChecking]   = useState(true);
  const [pendingWorkers, setPendingWorkers] = useState(0);

  // ── Auth guard ──
  useEffect(() => {
    const token  = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) { router.replace("/auth"); return; }
    try {
      const user = JSON.parse(stored);
      if (user.role !== "admin") { router.replace("/"); return; }
      setAdmin(user);
    } catch {
      router.replace("/auth");
    } finally {
      setChecking(false);
    }
  }, []);

  // ── Fetch pending worker count for badge ──
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const BASE_URL  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "homeease_admin_2024";
        const res  = await fetch(`${BASE_URL}/api/workers/admin/all?status=pending`, {
          headers: { "x-admin-key": ADMIN_KEY },
          cache: "no-store",
        });
        const data = await res.json();
        if (data?.data) setPendingWorkers(data.data.length);
      } catch { /* silent */ }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (checking) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--background)" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, border:"4px solid #2979d4", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
        <p style={{ color:"var(--nav-text-muted)", fontSize:13 }}>Verifying access…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div
      className="flex"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        marginTop: `${NAVBAR_HEIGHT}px`,
      }}
    >
      {/* ── SIDEBAR ── */}
      <aside
        className="flex flex-col transition-all duration-300"
        style={{
          width:           collapsed ? "64px" : "240px",
          height:          `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          backgroundColor: "var(--card-bg)",
          borderRight:     "1px solid var(--border-color)",
          position:        "sticky",
          top:             `${NAVBAR_HEIGHT}px`,
          flexShrink:      0,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-5"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <span className="text-2xl">🚚</span>
          {!collapsed && (
            <span className="font-black text-lg text-[#2979d4] tracking-tight">
              Easy To Go
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-xs opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "var(--foreground)" }}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const isWorkers = item.href === "/admin/workers";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm"
                style={{
                  backgroundColor: active ? "#2979d4" : "transparent",
                  color:           active ? "#fff" : "var(--nav-text-muted)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "rgba(41,121,212,0.1)";
                    e.currentTarget.style.color = "#2979d4";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--nav-text-muted)";
                  }
                }}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {/* Pending badge on Workers */}
                {isWorkers && pendingWorkers > 0 && (
                  <span style={{
                    backgroundColor: "#f59e0b",
                    color: "white",
                    borderRadius: 99,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    padding: "1px 6px",
                    minWidth: 18,
                    textAlign: "center",
                    flexShrink: 0,
                  }}>
                    {pendingWorkers}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: "1px solid var(--border-color)" }}>
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "#2979d4" }}
              >
                {admin?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                  {admin?.name || "Admin"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--nav-text-muted)" }}>
                  {admin?.email || "admin@easytogo.com"}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ color: "#ef4444", backgroundColor: "transparent" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <span>🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header
          className="flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}
        >
          <h1 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
            {navItems.find(
              (n) => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href))
            )?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ backgroundColor: "rgba(41,121,212,0.15)", color: "#2979d4" }}
            >
              Admin Panel
            </span>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1 rounded-full font-semibold transition-all"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
            >
              Logout
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}