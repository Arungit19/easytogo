"use client";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { useState } from "react";

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Moradabad", "Agra",
  "Kanpur", "Varanasi", "Noida",
];

const PROPERTY_TYPES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK+", "Villa", "Office", "Warehouse"];

const SERVICE_TYPES = [
  { value: "packing",   label: "Packing Only" },
  { value: "unpacking", label: "Unpacking Only" },
  { value: "both",      label: "Packing + Unpacking" },
];

const TIME_SLOTS = [
  { value: "morning",   label: "Morning",   sub: "8 AM – 12 PM" },
  { value: "afternoon", label: "Afternoon", sub: "12 PM – 4 PM" },
  { value: "evening",   label: "Evening",   sub: "4 PM – 8 PM" },
  { value: "flexible",  label: "Flexible",  sub: "Any time" },
];

const STATS = [
  { value: "50K+", label: "Homes Packed" },
  { value: "200+", label: "Cities Covered" },
  { value: "15+",  label: "Years Experience" },
  { value: "98%",  label: "Damage-Free Moves" },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    document.body.appendChild(script);
  });
}

export default function PackingUnpackingPage() {
  const [city, setCity]                   = useState("");
  const [address, setAddress]             = useState("");
  const [serviceType, setServiceType]     = useState("");
  const [propertyType, setPropertyType]   = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [timeSlot, setTimeSlot]           = useState("");
  const [submitted, setSubmitted]         = useState(false);
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [bookingData, setBookingData]     = useState(null);
  const [paymentDone, setPaymentDone]     = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!city)          return setError("Please select your city.");
    if (!address)       return setError("Please enter your address.");
    if (!serviceType)   return setError("Please select a service type.");
    if (!propertyType)  return setError("Please select your property type.");
    if (!preferredDate) return setError("Please select a preferred date.");
    if (!timeSlot)      return setError("Please select a preferred time slot.");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const user  = JSON.parse(localStorage.getItem("user") || "{}");

      const res = await fetch("/api/packing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          city,
          address,
          service_type:   serviceType,   // ← snake_case for API
          property_type:  propertyType,
          preferred_date: preferredDate,
          time_slot:      timeSlot,
          customer_name:  user.name  || "",
          customer_phone: user.phone || "",
          customer_email: user.email || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed. Try again.");
        return;
      }

      setBookingData({
        bookingId:     data.id || data.bookingId,
        customerName:  user.name  || "",
        customerEmail: user.email || "",
        customerPhone: user.phone || "",
      });
      setSubmitted(true);
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      await loadRazorpayScript();

      const res = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:         799,
          service:        "Packing & Unpacking",
          booking_id:     bookingData?.bookingId,
          customer_name:  bookingData?.customerName,
          customer_email: bookingData?.customerEmail,
          customer_phone: bookingData?.customerPhone,
        }),
      });

      const order = await res.json();
      if (!res.ok) {
        alert(order.error || "Order creation failed. Please try again.");
        return;
      }

      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        "Easy To Go",
        description: "Packing & Unpacking Service",
        order_id:    order.orderId,
        prefill: {
          name:    bookingData?.customerName  || "",
          email:   bookingData?.customerEmail || "",
          contact: bookingData?.customerPhone || "",
        },
        handler: async (response) => {
          const vRes = await fetch("/api/payments/verify", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const vData = await vRes.json();
          if (vData.success) {
            setPaymentDone(true);
          } else {
            alert("❌ Payment verification failed. Please contact support.");
          }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: "#2f6eff" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert("Payment error: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const summaryRows = [
    { label: "City",      value: city },
    { label: "Address",   value: address },
    { label: "Service",   value: SERVICE_TYPES.find(s => s.value === serviceType)?.label },
    { label: "Property",  value: propertyType },
    { label: "Date",      value: preferredDate },
    { label: "Time Slot", value: TIME_SLOTS.find(t => t.value === timeSlot)?.label },
  ];

  const inputStyle = {
    backgroundColor: "var(--background)",
    border: "1px solid var(--border-color)",
    color: "var(--foreground)",
  };

  const selectStyle = (hasVal) => ({
    ...inputStyle,
    color: hasVal ? "var(--foreground)" : "var(--nav-text-muted)",
  });

  const chipStyle = (active) => ({
    border: active ? "1.5px solid #2f6eff" : "1px solid var(--border-color)",
    backgroundColor: active ? "rgba(47,110,255,0.10)" : "transparent",
    color: active ? "#2f6eff" : "var(--nav-text-muted)",
    borderRadius: 12,
    padding: "10px 6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    textAlign: "center",
    transition: "all 0.18s",
  });

  return (
    <>
      <Navbar />

      <div
        className="min-h-screen font-['DM_Sans',sans-serif] pt-20"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
          .check-btn:hover { background: #1d5ed8 !important; transform: translateY(-1px); }
          .pay-btn:hover   { background: #16a34a !important; transform: translateY(-1px); }
          .service-card:hover, .info-card:hover {
            transform: translateY(-4px);
            border-color: rgba(72,141,255,0.45) !important;
            box-shadow: 0 18px 40px rgba(0,0,0,0.18);
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(28px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes popIn {
            0%   { transform: scale(0); opacity: 0; }
            65%  { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes checkDraw {
            from { stroke-dashoffset: 60; }
            to   { stroke-dashoffset: 0; }
          }
          @media (max-width: 980px) {
            .hero { flex-direction: column !important; align-items: stretch !important; }
            .hero-text { text-align: center; }
            .hero-text p { max-width: 100% !important; margin-left: auto; margin-right: auto; }
            .stats-row { justify-content: center !important; }
            .form-wrap { width: 100% !important; max-width: 560px; margin: 0 auto; }
            .why-inner { flex-direction: column !important; gap: 32px !important; }
          }
          @media (max-width: 640px) {
            .hero { padding: 32px 18px 48px !important; }
            .form-wrap { padding: 22px !important; }
            .stats-row { gap: 18px !important; }
            .time-grid { grid-template-columns: 1fr 1fr !important; }
            .svc-grid  { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* ── HERO + FORM ── */}
        <section className="hero flex items-center gap-10 px-[5%] pt-[70px] pb-14 max-w-[1280px] mx-auto">

          {/* Left: Hero Text */}
          <div className="hero-text flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 bg-[rgba(47,110,255,0.12)] border border-[rgba(72,141,255,0.28)] rounded-full px-4 py-[7px] mb-[22px]">
              <span className="w-2 h-2 rounded-full bg-[#4f8fff] shrink-0 inline-block" />
              <span className="text-[13px] text-[#2979d4] font-bold tracking-[0.2px]">
                Packing &amp; Unpacking
              </span>
            </div>

            <h1
              className="font-['Sora',sans-serif] text-[clamp(2.2rem,4.8vw,4rem)] font-extrabold leading-[1.08] mb-[18px]"
              style={{ color: "var(--foreground)" }}
            >
              Packing &amp; Unpacking
              <br />
              <span className="text-[#4f8fff]">Our Services</span>
            </h1>

            <p
              className="text-base leading-[1.75] max-w-[540px] mb-[30px]"
              style={{ color: "var(--nav-text-muted)" }}
            >
              Expert packing using bubble wrap, foam sheets, strong cartons and
              protective layers for furniture, electronics and fragile household
              items. Safe unpacking support at destination makes your move easier
              and faster.
            </p>

            <div className="stats-row flex gap-7 flex-wrap">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div
                    className="font-['Sora',sans-serif] text-[22px] font-extrabold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[12px] mt-[3px]" style={{ color: "var(--nav-text-muted)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Success Card OR Booking Form */}
          {submitted ? (
            /* ── SUCCESS STATE ── */
            <div
              className="form-wrap w-[430px] shrink-0 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
              style={{
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                animation: "fadeInUp 0.45s cubic-bezier(.22,1,.36,1) both",
              }}
            >
              <div className="flex flex-col items-center text-center mb-5">
                <div
                  style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "linear-gradient(135deg,#2f6eff22,#22c97e22)",
                    border: "2.5px solid #22c97e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: "popIn 0.5s cubic-bezier(.22,1,.36,1) 0.1s both",
                    marginBottom: 18,
                  }}
                >
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <polyline
                      points="6,17 14,25 28,10"
                      stroke="#22c97e" strokeWidth="3.2"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="60" strokeDashoffset="60"
                      style={{ animation: "checkDraw 0.45s ease 0.35s forwards" }}
                    />
                  </svg>
                </div>

                <h3
                  className="font-['Sora',sans-serif] text-xl font-extrabold mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Request Submitted!
                </h3>
                <p className="text-[13.5px] leading-[1.7]" style={{ color: "var(--nav-text-muted)" }}>
                  Your packing &amp; unpacking request has been received. Our team will
                  call you within{" "}
                  <span style={{ color: "#2f6eff", fontWeight: 700 }}>30 minutes</span>{" "}
                  to confirm the quote.
                </p>
              </div>

              {paymentDone ? (
                <div
                  className="w-full rounded-2xl px-4 py-3 text-center text-sm font-bold mb-4"
                  style={{
                    backgroundColor: "rgba(34,197,94,0.12)",
                    color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.3)",
                  }}
                >
                  ✅ Payment Successful! Booking confirmed.
                </div>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="pay-btn w-full py-[14px] rounded-[14px] border-none text-white font-bold text-[15px] cursor-pointer transition-all duration-200 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#22c55e" }}
                >
                  {paymentLoading ? "Opening Payment..." : "💳 Pay Now — ₹799"}
                </button>
              )}

              {/* Booking Summary */}
              <div
                className="rounded-2xl p-4 mb-5"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-[11px] font-bold tracking-[2px] uppercase mb-3"
                  style={{ color: "#4f8fff" }}
                >
                  Booking Summary
                </div>
                <div className="flex flex-col gap-[10px]">
                  {summaryRows.map(({ label, value }) =>
                    value ? (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-[12px]" style={{ color: "var(--nav-text-muted)" }}>
                          {label}
                        </span>
                        <span
                          className="text-[12px] font-semibold px-3 py-[4px] rounded-full"
                          style={{
                            backgroundColor: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            color: "var(--foreground)",
                            maxWidth: "58%",
                            textAlign: "right",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--nav-text-muted)" }}>✅</span>
                <span className="text-[12px]" style={{ color: "var(--nav-text-muted)" }}>
                  Free survey &nbsp;·&nbsp; No hidden charges &nbsp;·&nbsp; Insured packing
                </span>
              </div>
            </div>
          ) : (
            /* ── BOOKING FORM ── */
            <div
              className="form-wrap w-[430px] shrink-0 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
              style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
            >
              <h3
                className="font-['Sora',sans-serif] text-lg font-bold mb-[18px]"
                style={{ color: "var(--foreground)" }}
              >
                Book your packing service
              </h3>

              {/* City + Property Type */}
              <div className="grid grid-cols-2 gap-3 mb-[14px]">
                <div>
                  <label className="text-[13px] font-semibold block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-[14px] py-[12px] rounded-[12px] text-sm outline-none"
                    style={selectStyle(city)}
                  >
                    <option value="">Select city</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-semibold block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>
                    Property type
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-[14px] py-[12px] rounded-[12px] text-sm outline-none"
                    style={selectStyle(propertyType)}
                  >
                    <option value="">Select type</option>
                    {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Address */}
              <label className="text-[13px] font-semibold block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>
                Full address
              </label>
              <input
                type="text"
                placeholder="House no., street, area, city"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-[14px] py-[12px] rounded-[12px] text-sm outline-none mb-[14px]"
                style={inputStyle}
              />

              {/* Service Type */}
              <label className="text-[13px] font-semibold block mb-[8px]" style={{ color: "var(--nav-text-muted)" }}>
                Service type
              </label>
              <div className="svc-grid grid grid-cols-3 gap-2 mb-[14px]">
                {SERVICE_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setServiceType(value)}
                    style={chipStyle(serviceType === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Preferred Date */}
              <label className="text-[13px] font-semibold block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>
                Preferred date
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-[14px] py-[12px] rounded-[12px] text-sm outline-none mb-[14px]"
                style={inputStyle}
              />

              {/* Time Slot */}
              <label className="text-[13px] font-semibold block mb-[8px]" style={{ color: "var(--nav-text-muted)" }}>
                Preferred time slot
              </label>
              <div className="time-grid grid grid-cols-2 gap-2 mb-[18px]">
                {TIME_SLOTS.map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTimeSlot(value)}
                    style={{
                      ...chipStyle(timeSlot === value),
                      padding: "10px 8px",
                    }}
                  >
                    <div style={{ fontSize: 11, marginBottom: 2, color: timeSlot === value ? "#2f6eff" : "var(--nav-text-muted)" }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: timeSlot === value ? "#2f6eff" : "var(--foreground)" }}>
                      {sub}
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-[12px] text-red-400 text-center mb-2">{error}</p>
              )}

              <button
                className="check-btn w-full py-[14px] rounded-[14px] border-none bg-[#2f6eff] text-white font-bold text-[15px] cursor-pointer transition-all duration-200"
                type="button"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Get Packing Quote"}
              </button>

              <p className="text-center text-[12px] mt-[10px]" style={{ color: "var(--nav-text-muted)" }}>
                Free survey • No hidden charges
              </p>
            </div>
          )}
        </section>

        {/* ── WHY US ── */}
        <section
          className="px-[5%] pt-7 pb-20"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <div className="why-inner max-w-[1280px] mx-auto flex gap-[60px] items-center">
            <div className="flex-1">
              <span className="text-[12px] text-[#4f8fff] font-bold tracking-[3px] uppercase">Why Us</span>
              <h2
                className="font-['Sora',sans-serif] text-[clamp(1.8rem,3.2vw,2.8rem)] font-extrabold mt-3 mb-4 leading-[1.2]"
                style={{ color: "var(--foreground)" }}
              >
                Every Carton Is Safe,<br />Every Item Is Insured.
              </h2>
              <p className="text-[15px] leading-[1.8] max-w-[560px]" style={{ color: "var(--nav-text-muted)" }}>
                Our professional packing team carefully packs your furniture,
                electronics and fragile items using bubble wrap, cartons, tape and
                corner guards, and also unpacks everything on the same day.
              </p>
            </div>
            <div className="feature-grid flex-1 grid grid-cols-2 gap-4">
              {[
                { icon: "📦", title: "Premium Packing",    desc: "Multi-layer protection for breakable and high-value items." },
                { icon: "🛡️", title: "Transit Insurance",  desc: "Coverage support for added peace of mind during relocation." },
                { icon: "👷", title: "Trained Crew",        desc: "Experienced staff for careful handling and organized packing." },
                { icon: "⚡", title: "Same-Day Unpacking", desc: "Quick unpacking support to settle faster in your new place." },
              ].map((f, i) => (
                <div
                  key={i}
                  className="info-card rounded-[18px] p-5 transition-all duration-[250ms]"
                  style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                >
                  <div className="text-[26px] mb-[10px]">{f.icon}</div>
                  <div className="font-bold text-[15px] mb-[6px]" style={{ color: "var(--foreground)" }}>{f.title}</div>
                  <div className="text-[13px] leading-[1.7]" style={{ color: "var(--nav-text-muted)" }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}