"use client";

import { useState } from "react";

const initialServices = [
  { id: 1, icon: "🏘️", title: "Home Shifting", desc: "Complete house relocation — local or intercity.", bookings: 412, revenue: "₹1,24,80,000", active: true },
  { id: 2, icon: "🏢", title: "Office Relocation", desc: "Seamless office shifting with minimal downtime.", bookings: 87, revenue: "₹65,25,000", active: true },
  { id: 3, icon: "📦", title: "Packing & Unpacking", desc: "Expert packing for fragile and valuable items.", bookings: 318, revenue: "₹28,62,000", active: true },
  { id: 4, icon: "🚗", title: "Vehicle Transport", desc: "Safe and insured car transport across all major routes.", bookings: 145, revenue: "₹21,75,000", active: true },
  { id: 5, icon: "🏬", title: "Storage Solutions", desc: "Secure climate-controlled storage facilities.", bookings: 203, revenue: "₹10,15,000", active: false },
  { id: 6, icon: "🧹", title: "Post-Move Cleaning", desc: "Deep cleaning for old or new home after the move.", bookings: 119, revenue: "₹4,16,500", active: true },
];

const EMOJI_OPTIONS = ["🏘️","🏢","📦","🚗","🏬","🧹","🛋️","🔧","📐","🪜","🚛","🏗️","📫","🗄️","🧰"];

export default function ServicesPage() {
  const [services, setServices] = useState(initialServices);

  // ── Modal state: null = closed, "add" = add mode, "edit" = edit mode
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ icon: "🏘️", title: "", desc: "" });
  const [error, setError] = useState("");

  // ── Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // ── Toggle active/inactive
  const toggleActive = (id) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  // ── Open Add modal
  const openAddModal = () => {
    setForm({ icon: "🏘️", title: "", desc: "" });
    setError("");
    setModalMode("add");
  };

  // ── Open Edit modal
  const openEditModal = (service) => {
    setForm({ icon: service.icon, title: service.title, desc: service.desc });
    setEditingId(service.id);
    setError("");
    setModalMode("edit");
  };

  // ── Close modal
  const handleClose = () => {
    setModalMode(null);
    setEditingId(null);
    setForm({ icon: "🏘️", title: "", desc: "" });
    setError("");
  };

  // ── Add service
  const handleAddService = () => {
    if (!form.title.trim()) { setError("Service title is required."); return; }
    if (!form.desc.trim()) { setError("Description is required."); return; }
    const newService = {
      id: Date.now(),
      icon: form.icon,
      title: form.title.trim(),
      desc: form.desc.trim(),
      bookings: 0,
      revenue: "₹0",
      active: true,
    };
    setServices((prev) => [...prev, newService]);
    handleClose();
  };

  // ── Save edited service
  const handleEditService = () => {
    if (!form.title.trim()) { setError("Service title is required."); return; }
    if (!form.desc.trim()) { setError("Description is required."); return; }
    setServices((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? { ...s, icon: form.icon, title: form.title.trim(), desc: form.desc.trim() }
          : s
      )
    );
    handleClose();
  };

  // ── Delete with confirm
  const handleDeleteRequest = (id) => setDeleteConfirmId(id);
  const handleDeleteConfirm = () => {
    setServices((prev) => prev.filter((s) => s.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };
  const handleDeleteCancel = () => setDeleteConfirmId(null);

  const isModalOpen = modalMode === "add" || modalMode === "edit";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>Services</h2>
          <p className="text-sm mt-1" style={{ color: "var(--nav-text-muted)" }}>
            Manage the services offered on your platform
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#2979d4" }}
        >
          + Add Service
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Services", value: services.length, icon: "🛠️" },
          { label: "Active", value: services.filter((s) => s.active).length, icon: "✅" },
          { label: "Total Bookings", value: services.reduce((a, s) => a + s.bookings, 0), icon: "📋" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            <span className="text-2xl">{s.icon}</span>
            <p className="text-xl font-black mt-2" style={{ color: "var(--foreground)" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--nav-text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Service Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl p-5 transition-all"
            style={{
              backgroundColor: "var(--card-bg)",
              border: `1px solid ${s.active ? "var(--border-color)" : "rgba(239,68,68,0.3)"}`,
              opacity: s.active ? 1 : 0.7,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{s.icon}</span>
                <div>
                  <h3 className="font-bold" style={{ color: "var(--foreground)" }}>{s.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--nav-text-muted)" }}>{s.desc}</p>
                </div>
              </div>
              {/* Toggle */}
              <button
                onClick={() => toggleActive(s.id)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0"
                style={{ backgroundColor: s.active ? "#2979d4" : "rgba(150,150,150,0.3)" }}
                title={s.active ? "Click to deactivate" : "Click to activate"}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-300"
                  style={{ transform: s.active ? "translateX(24px)" : "translateX(4px)" }}
                />
              </button>
            </div>

            <div
              className="flex items-center gap-6 pt-3"
              style={{ borderTop: "1px solid var(--border-color)" }}
            >
              <div>
                <p className="text-xs" style={{ color: "var(--nav-text-muted)" }}>Total Bookings</p>
                <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{s.bookings}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--nav-text-muted)" }}>Revenue</p>
                <p className="font-bold text-sm text-[#2979d4]">{s.revenue}</p>
              </div>

              {/* Status badge */}
              <div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full"
                  style={
                    s.active
                      ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }
                      : { backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }
                  }
                >
                  {s.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => openEditModal(s)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "rgba(41,121,212,0.1)", color: "#2979d4" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteRequest(s.id)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                {modalMode === "edit" ? "Edit Service" : "Add New Service"}
              </h3>
              <button
                onClick={handleClose}
                className="text-xl leading-none hover:opacity-70 transition-opacity"
                style={{ color: "var(--nav-text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>
                Choose Icon
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                    className="text-xl w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: form.icon === emoji ? "rgba(41,121,212,0.2)" : "rgba(255,255,255,0.05)",
                      border: form.icon === emoji ? "2px solid #2979d4" : "2px solid transparent",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>
                Service Title
              </label>
              <input
                type="text"
                placeholder="e.g. Piano Moving"
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setError(""); }}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>
                Description
              </label>
              <textarea
                placeholder="Brief description of the service..."
                value={form.desc}
                onChange={(e) => { setForm((f) => ({ ...f, desc: e.target.value })); setError(""); }}
                rows={3}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-color)",
                  color: "var(--nav-text-muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={modalMode === "edit" ? handleEditService : handleAddService}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#2979d4" }}
              >
                {modalMode === "edit" ? "Save Changes" : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4 text-center"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid rgba(239,68,68,0.4)" }}
          >
            <div className="text-4xl">🗑️</div>
            <h3 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
              Delete Service?
            </h3>
            <p className="text-sm" style={{ color: "var(--nav-text-muted)" }}>
              Are you sure you want to delete{" "}
              <span className="font-bold" style={{ color: "var(--foreground)" }}>
                {services.find((s) => s.id === deleteConfirmId)?.title}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-color)",
                  color: "var(--nav-text-muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#ef4444" }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}