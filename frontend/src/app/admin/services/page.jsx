"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SERVICES } from "../../../lib/serviceDefaults";

const EMOJI_OPTIONS = [
  "\u{1F3D8}\uFE0F",
  "\u{1F3E2}",
  "\u{1F4E6}",
  "\u{1F697}",
  "\u{1F3EC}",
  "\u{1F9F9}",
  "\u{1F6CB}\uFE0F",
  "\u{1F527}",
  "\u{1F4D0}",
  "\u{1FA9C}",
  "\u{1F69B}",
  "\u{1F3D7}\uFE0F",
  "\u{1F4EB}",
  "\u{1F5C4}\uFE0F",
  "\u{1F9F0}",
];

const emptyForm = {
  icon: "\u{1F3D8}\uFE0F",
  title: "",
  desc: "",
  tag: "",
  link: "#services",
};

export default function ServicesPage() {
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/services", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load services.");
      setServices(data.services || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openAddModal = () => {
    setForm(emptyForm);
    setError("");
    setModalMode("add");
  };

  const openEditModal = (service) => {
    setForm({
      icon: service.icon,
      title: service.title,
      desc: service.desc,
      tag: service.tag || "",
      link: service.link || "#services",
    });
    setEditingId(service.id);
    setError("");
    setModalMode("edit");
  };

  const handleClose = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Service title is required.";
    if (!form.desc.trim()) return "Description is required.";
    return "";
  };

  const saveService = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = modalMode === "edit" ? `/api/services/${editingId}` : "/api/services";
      const res = await fetch(url, {
        method: modalMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save service.");

      setServices((prev) => {
        if (modalMode === "edit") {
          return prev.map((service) => (service.id === editingId ? data.service : service));
        }
        return [...prev, data.service];
      });
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service) => {
    const nextActive = !service.active;
    setServices((prev) =>
      prev.map((item) => (item.id === service.id ? { ...item, active: nextActive } : item))
    );

    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update service.");
    } catch (err) {
      setServices((prev) =>
        prev.map((item) => (item.id === service.id ? { ...item, active: service.active } : item))
      );
      setError(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/services/${deleteConfirmId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete service.");
      setServices((prev) => prev.filter((service) => service.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message);
    }
  };

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

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Services", value: services.length, icon: "\u{1F6E0}\uFE0F" },
          { label: "Active", value: services.filter((s) => s.active).length, icon: "\u2705" },
          { label: "Inactive", value: services.filter((s) => !s.active).length, icon: "\u23F8\uFE0F" },
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

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-sm" style={{ color: "var(--nav-text-muted)" }}>Loading services...</p>
        ) : services.map((s) => (
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
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl flex-shrink-0">{s.icon}</span>
                <div className="min-w-0">
                  <h3 className="font-bold" style={{ color: "var(--foreground)" }}>{s.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--nav-text-muted)" }}>{s.desc}</p>
                  <p className="text-xs mt-1 text-[#2979d4] truncate">{s.link}</p>
                </div>
              </div>
              <button
                onClick={() => toggleActive(s)}
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

            <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
              {s.tag && (
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(41,121,212,0.12)", color: "#2979d4" }}>
                  {s.tag}
                </span>
              )}
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

              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => openEditModal(s)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "rgba(41,121,212,0.1)", color: "#2979d4" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(s.id)}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                {modalMode === "edit" ? "Edit Service" : "Add New Service"}
              </h3>
              <button onClick={handleClose} className="text-xl leading-none hover:opacity-70 transition-opacity" style={{ color: "var(--nav-text-muted)" }}>
                x
              </button>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>Choose Icon</label>
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

            {[
              { label: "Service Title", key: "title", placeholder: "e.g. Piano Moving" },
              { label: "Badge", key: "tag", placeholder: "Optional, e.g. New" },
              { label: "Frontend Link", key: "link", placeholder: "/services/home-shifting or #services" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>{field.label}</label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(e) => { setForm((f) => ({ ...f, [field.key]: e.target.value })); setError(""); }}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "var(--foreground)" }}
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nav-text-muted)" }}>Description</label>
              <textarea
                placeholder="Brief description of the service..."
                value={form.desc}
                onChange={(e) => { setForm((f) => ({ ...f, desc: e.target.value })); setError(""); }}
                rows={3}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "var(--foreground)" }}
              />
            </div>

            {error && <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "var(--nav-text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={saveService}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#2979d4" }}
              >
                {saving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 text-center" style={{ backgroundColor: "var(--card-bg)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <div className="text-4xl">{"\u{1F5D1}\uFE0F"}</div>
            <h3 className="text-lg font-black" style={{ color: "var(--foreground)" }}>Delete Service?</h3>
            <p className="text-sm" style={{ color: "var(--nav-text-muted)" }}>
              Are you sure you want to delete <span className="font-bold" style={{ color: "var(--foreground)" }}>{services.find((s) => s.id === deleteConfirmId)?.title}</span>?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "var(--nav-text-muted)" }}
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
