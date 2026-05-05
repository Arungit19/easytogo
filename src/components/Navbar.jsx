"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API = `${BASE_URL}/api`;

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bookingCount, setBookingCount] = useState(0);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Helper: check if current user is admin
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setMounted(true);

    const stored = localStorage.getItem("user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }

    const handleAuthChange = () => {
      const s = localStorage.getItem("user");
      if (s) { try { setUser(JSON.parse(s)); } catch {} }
      else setUser(null);
    };

    const handleScroll = () => setScrolled(window.scrollY > 50);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("authChange", handleAuthChange);
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch booking count for badge — only for non-admin users
  useEffect(() => {
    if (!user || isAdmin) return;
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const bookings = data.bookings || data;
          const active = bookings.filter(
            (b) => b.status === "Pending" || b.status === "Confirmed"
          ).length;
          setBookingCount(active);
        }
      } catch {
        // silently ignore
      }
    };
    fetchCount();
  }, [user, isAdmin]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setProfileOpen(false);
    setMenuOpen(false);
    window.dispatchEvent(new Event("authChange"));
    router.push("/");
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const updated = { ...user, avatar: ev.target.result };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new Event("authChange"));
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${API}/users/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...user, avatar: data.avatar || data.url || user.avatar };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("authChange"));
      }
    } catch (err) {
      console.warn("Avatar upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const Avatar = ({ size = 40, showUpload = false }) => (
    <div
      className={`relative flex-shrink-0 ${showUpload ? "cursor-pointer group" : ""}`}
      style={{ width: size, height: size }}
      onClick={showUpload ? () => fileInputRef.current?.click() : undefined}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "#f3f4f6",
          boxShadow: "0 0 0 2px #e5e7eb, 0 2px 8px rgba(0,0,0,0.07)",
        }}
      />
      <div className="absolute inset-[2px] rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
        {user?.avatar || user?.picture ? (
          <img
            src={user.avatar || user.picture}
            alt={user.name || "User"}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ width: size * 0.52, height: size * 0.52 }}>
            <circle cx="12" cy="8.5" r="3.5" fill="#9ca3af" />
            <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          </svg>
        )}
      </div>
      {showUpload && (
        <div className="absolute inset-[2px] rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="mb-0.5">
                <path d="M19 13v6H5v-6H3v6a2 2 0 002 2h14a2 2 0 002-2v-6h-2zM13 4.83l2.59 2.58L17 6l-5-5-5 5 1.41 1.41L11 4.83V15h2V4.83z"/>
              </svg>
              <span className="text-white text-[9px] font-semibold">Upload</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "backdrop-blur-md py-3" : "backdrop-blur-sm py-5"
        }`}
        style={{ backgroundColor: "var(--nav-bg)" }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between md:grid md:grid-cols-3">

          {/* Logo */}
          <div className="flex items-center gap-3 justify-start">
            <Link href="/" className="block">
              <div className="w-12 h-12 relative">
                <Image src="/logo.png" alt="logo" fill className="object-contain" />
              </div>
            </Link>
            <span className="text-xl font-bold tracking-tight">
              <span style={{ color: "var(--nav-text)" }}>Easy</span>
              <span className="text-[#2979d4]"> To Go</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center justify-center gap-8 text-sm font-medium">
            {["Home", "About Us", "Services", "Contact"].map((item) => (
              <li key={item}>
                <a
                  href={`/#${item.toLowerCase().replace(" ", "-")}`}
                  className="transition-colors duration-200 relative group"
                  style={{ color: "var(--nav-text-muted)" }}
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2979d4] transition-all duration-300 group-hover:w-full rounded-full" />
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3 justify-end">
            {user ? (
              <div className="relative" ref={dropdownRef}>

                {/* Navbar profile pill */}
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full border transition-all duration-200 hover:shadow-md hover:border-blue-200"
                  style={{
                    backgroundColor: "var(--card-bg, #fff)",
                    borderColor: "var(--border-color, #e5e7eb)",
                  }}
                >
                  <Avatar size={34} />
                  <span className="text-sm font-semibold px-1" style={{ color: "var(--nav-text)" }}>
                    {(user.name || "User").split(" ")[0]}
                  </span>
                  {/* Show Admin badge if admin */}
                  {isAdmin && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                      Admin
                    </span>
                  )}
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className={`mr-1 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                    style={{ color: "var(--nav-text-muted)" }}
                  >
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* ── Desktop Dropdown ── */}
                {profileOpen && (
                  <div
                    className="absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{
                      backgroundColor: "var(--card-bg, #fff)",
                      borderColor: "var(--border-color, #e5e7eb)",
                    }}
                  >
                    {/* Avatar + name header */}
                    <div className="flex flex-col items-center pt-6 pb-4 px-4 border-b" style={{ borderColor: "var(--border-color, #e5e7eb)" }}>
                      <Avatar size={80} showUpload={true} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
                      >
                        {uploading ? "Uploading..." : "📷 Change photo"}
                      </button>
                      <p className="mt-2 text-sm font-bold text-center" style={{ color: "var(--nav-text)" }}>
                        {user.name || "My Profile"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 text-center">{user.email}</p>
                      {/* Admin role label */}
                      {isAdmin && (
                        <span className="mt-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Administrator
                        </span>
                      )}
                    </div>

                    {/* ── Menu Items ── */}
                    <div className="py-2">

                      {/* 1. My Profile */}
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-blue-50/60"
                        style={{ color: "var(--nav-text)" }}
                        onClick={() => setProfileOpen(false)}
                      >
                        <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2979d4" strokeWidth="2">
                            <circle cx="12" cy="8" r="4"/>
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <span className="font-medium">My Profile</span>
                      </Link>

                      {/* 2. My Bookings — only visible to non-admin users */}
                      {!isAdmin && (
                        <Link
                          href="/bookings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-blue-50/60"
                          style={{ color: "var(--nav-text)" }}
                          onClick={() => setProfileOpen(false)}
                        >
                          <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2979d4" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                              <path d="M8 14h.01M12 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" strokeWidth="2.5"/>
                            </svg>
                          </span>
                          <div className="flex items-center justify-between flex-1">
                            <span className="font-medium">My Bookings</span>
                            {bookingCount > 0 ? (
                              <span className="text-[10px] font-bold bg-[#2979d4] text-white px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                                {bookingCount}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-[#2979d4] text-white px-1.5 py-0.5 rounded-full leading-none">
                                New
                              </span>
                            )}
                          </div>
                        </Link>
                      )}
                    </div>

                    {/* 3. Logout — separated at bottom */}
                    <div className="border-t py-2" style={{ borderColor: "var(--border-color, #e5e7eb)" }}>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        onClick={handleLogout}
                      >
                        <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round"/>
                            <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium px-4 py-2 border rounded-xl transition-colors" style={{ color: "var(--nav-text-muted)", borderColor: "var(--border-color)" }}>
                  Login
                </Link>
                <Link href="/login" className="text-sm font-semibold bg-[#2979d4] text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                  Sign Up
                </Link>
              </>
            )}

            {mounted && (
              <button
                onClick={toggleTheme}
                className="text-sm px-3 py-2 rounded-xl border transition-all duration-200"
                style={{ borderColor: theme === "dark" ? "#fff" : "#000", color: theme === "dark" ? "#fff" : "#000" }}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <span className={`w-6 h-0.5 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} style={{ backgroundColor: "var(--nav-text)" }} />
            <span className={`w-6 h-0.5 transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} style={{ backgroundColor: "var(--nav-text)" }} />
            <span className={`w-6 h-0.5 transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} style={{ backgroundColor: "var(--nav-text)" }} />
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {menuOpen && (
          <div className="md:hidden backdrop-blur-xl border-t px-6 py-6 flex flex-col gap-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border-color)" }}>
            {["Home", "About Us", "Services", "Contact"].map((item) => (
              <a
                key={item}
                href={`/#${item.toLowerCase().replace(" ", "-")}`}
                className="text-base font-medium py-2 border-b transition-colors"
                style={{ color: "var(--nav-text-muted)", borderColor: "var(--border-color)" }}
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </a>
            ))}

            {mounted && (
              <button onClick={toggleTheme} className="text-sm font-medium py-2 text-left" style={{ color: "var(--nav-text-muted)" }}>
                {theme === "dark" ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode"}
              </button>
            )}

            {user ? (
              <div className="flex flex-col gap-2 pt-2">
                {/* Mobile profile card */}
                <div className="flex items-center gap-3 px-3 py-3 border rounded-2xl" style={{ borderColor: "var(--border-color)" }}>
                  <Avatar size={52} showUpload={true} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{user.name || "My Profile"}</p>
                      {/* Admin badge in mobile profile card */}
                      {isAdmin && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-500 font-medium mt-0.5 hover:underline"
                    >
                      {uploading ? "Uploading..." : "📷 Change photo"}
                    </button>
                  </div>
                </div>

                {/* 1. My Profile */}
                <Link
                  href="/profile"
                  className="flex items-center gap-3 text-sm font-medium border px-4 py-2.5 rounded-xl hover:bg-blue-50/60 transition-colors"
                  style={{ borderColor: "var(--border-color)", color: "var(--nav-text)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2979d4" strokeWidth="2">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
                    </svg>
                  </span>
                  My Profile
                </Link>

                {/* 2. My Bookings — only for non-admin users */}
                {!isAdmin && (
                  <Link
                    href="/bookings"
                    className="flex items-center gap-3 text-sm font-medium border px-4 py-2.5 rounded-xl hover:bg-blue-50/60 transition-colors"
                    style={{ borderColor: "var(--border-color)", color: "var(--nav-text)" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2979d4" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                        <path d="M8 14h.01M12 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" strokeWidth="2.5"/>
                      </svg>
                    </span>
                    <span className="flex-1">My Bookings</span>
                    {bookingCount > 0 ? (
                      <span className="text-[10px] font-bold bg-[#2979d4] text-white px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                        {bookingCount}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-[#2979d4] text-white px-1.5 py-0.5 rounded-full leading-none">New</span>
                    )}
                  </Link>
                )}

                {/* 3. Logout */}
                <button
                  className="flex items-center gap-3 text-sm font-medium border px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                  style={{ borderColor: "var(--border-color)" }}
                  onClick={handleLogout}
                >
                  <span className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round"/>
                      <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
                    </svg>
                  </span>
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link href="/login" className="flex-1 text-center text-sm font-medium border px-4 py-2.5 rounded-xl">Login</Link>
                <Link href="/login" className="flex-1 text-center text-sm font-semibold bg-[#2979d4] text-white px-4 py-2.5 rounded-xl">Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}