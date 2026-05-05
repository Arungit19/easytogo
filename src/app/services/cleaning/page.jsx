"use client";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { useState } from "react";

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Moradabad", "Agra",
  "Kanpur", "Varanasi", "Noida",
];

const CLEANING_TYPES = [
  "Full Home Deep Cleaning", "Kitchen Deep Cleaning", "Bathroom Deep Cleaning",
  "Sofa & Upholstery Cleaning", "Mattress Cleaning", "Office Cleaning",
];

const PROPERTY_TYPES = [
  "1 BHK", "2 BHK", "3 BHK", "4 BHK+", "Villa", "Office / Shop",
];

const STATS = [
  { value: "25K+",   label: "Homes Cleaned" },
  { value: "120+",   label: "Localities Covered" },
  { value: "4.8★",   label: "Average Rating" },
  { value: "7 Days", label: "Service Support" },
];

const TIME_SLOTS = [
  "Morning (8 AM – 11 AM)",
  "Afternoon (12 PM – 3 PM)",
  "Evening (4 PM – 7 PM)",
];

const FREQUENCIES = [
  "One Time Deep Cleaning",
  "Monthly Cleaning",
  "Fortnightly Cleaning",
  "Weekly Cleaning",
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

export default function CleaningServicesPage() {
  const [city, setCity]                   = useState("");
  const [address, setAddress]             = useState("");
  const [cleaningType, setCleaningType]   = useState("");
  const [propertyType, setPropertyType]   = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [frequency, setFrequency]         = useState("");
  const [submitted, setSubmitted]         = useState(false);
  const [error, setError]                 = useState("");
  const [summary, setSummary]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [paymentDone, setPaymentDone]     = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate all required fields
    if (!city || !address.trim() || !cleaningType || !propertyType || !preferredTime || !frequency) {
      setError("Please fill all required fields before submitting.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const user  = JSON.parse(localStorage.getItem("user") || "{}");

      const res = await fetch("/api/cleaning-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode:         "within",
          city,
          fromLocation: address,
          toLocation:   address,
          cleaningType,
          propertyType,
          preferredTime,
          frequency,
          customer_name:  user.name  || "",
          customer_phone: user.phone || "",
          customer_email: user.email || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Submission failed. Please try again.");
        return;
      }

      setSummary({
        location:      `${city} — ${address}`,
        cleaningType,
        propertyType,
        preferredTime,
        frequency,
        bookingRef:    data.bookingRef || data.booking_id,
        bookingId:     data.id || data.bookingId,
        customerName:  user.name  || "",
        customerEmail: user.email || "",
        customerPhone: user.phone || "",
      });
      setSubmitted(true);

    } catch (err) {
      setError("Network error. Please check your connection and try again.");
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
          amount:         499,
          service:        "Cleaning",
          booking_id:     summary?.bookingId,
          customer_name:  summary?.customerName,
          customer_email: summary?.customerEmail,
          customer_phone: summary?.customerPhone,
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
        description: `Cleaning — ${summary?.cleaningType}`,
        order_id:    order.orderId,
        prefill: {
          name:    summary?.customerName  || "",
          email:   summary?.customerEmail || "",
          contact: summary?.customerPhone || "",
        },
        handler: async (response) => {
          // Verify payment signature on the server
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
        modal: {
          ondismiss: () => setPaymentLoading(false),
        },
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
          .pay-btn:hover { background: #16a34a !important; transform: translateY(-1px); }
          .service-card:hover, .info-card:hover {
            transform: translateY(-4px);
            border-color: rgba(72,141,255,0.45) !important;
            box-shadow: 0 18px 40px rgba(0,0,0,0.18);
          }
          @keyframes successPop {
            from { transform: scale(0.85); opacity: 0; }
            to   { transform: scale(1);    opacity: 1; }
          }
          .success-pop { animation: successPop 0.35s cubic-bezier(.36,1.6,.52,.98) both; }
          @keyframes checkPop {
            from { transform: scale(0.4); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          .check-pop { animation: checkPop 0.4s cubic-bezier(.36,1.6,.52,.98) both; }
          @media (max-width: 980px) {
            .hero { flex-direction: column !important; align-items: stretch !important; }
            .hero-text { text-align: center; }
            .hero-text p { max-width: 100% !important; margin-left: auto; margin-right: auto; }
            .stats-row { justify-content: center !important; }
            .form-wrap { width: 100% !important; max-width: 560px; margin: 0 auto; }
            .why-inner { flex-direction: column !important; gap: 32px !important; }
          }
          @media (max-width: 640px) {
            .detail-cols, .feature-grid { grid-template-columns: 1fr !important; }
            .hero { padding: 32px 18px 48px !important; }
            .form-wrap { padding: 22px !important; }
            .stats-row { gap: 18px !important; }
          }
        `}</style>

        {/* HERO + FORM */}
        <section className="hero flex items-center gap-10 px-[5%] pt-[70px] pb-14 max-w-[1280px] mx-auto">

          {/* Left: Hero Text */}
          <div className="hero-text flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 bg-[rgba(47,110,255,0.12)] border border-[rgba(72,141,255,0.28)] rounded-full px-4 py-[7px] mb-[22px]">
              <span className="w-2 h-2 rounded-full bg-[#4f8fff] shrink-0 inline-block" />
              <span className="text-[13px] text-[#2979d4] font-bold tracking-[0.2px]">Post-Move Cleaning</span>
            </div>

            <h1
              className="font-['Sora',sans-serif] text-[clamp(2.2rem,4.8vw,4rem)] font-extrabold leading-[1.08] mb-[18px]"
              style={{ color: "var(--foreground)" }}
            >
              Home &amp; Office
              <br />
              <span className="text-[#4f8fff]">Cleaning Services</span>
            </h1>

            <p className="text-base leading-[1.75] max-w-[540px] mb-[30px]"
              style={{ color: "var(--nav-text-muted)" }}>
              Professional deep cleaning for homes, kitchens, bathrooms, sofas and
              offices using safe chemicals and mechanised tools. Get a hygienic,
              fresh and spotless space in a single visit.
            </p>

            <div className="stats-row flex gap-7 flex-wrap">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-['Sora',sans-serif] text-[22px] font-extrabold"
                    style={{ color: "var(--foreground)" }}>{s.value}</div>
                  <div className="text-[12px] mt-[3px]"
                    style={{ color: "var(--nav-text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Booking Form OR Success State */}
          <div
            className="form-wrap w-[410px] shrink-0 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            {!submitted ? (
              <>
                <h3 className="font-['Sora',sans-serif] text-lg font-bold mb-[18px]"
                  style={{ color: "var(--foreground)" }}>
                  Book your cleaning service
                </h3>

                {/* City Selector */}
                <label className="text-[13px] font-semibold block mb-2"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Select City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-[18px] outline-none"
                  style={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border-color)",
                    color: city ? "var(--foreground)" : "var(--nav-text-muted)",
                  }}
                >
                  <option value="">Select your city</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Address */}
                <label className="text-[13px] font-semibold block mb-2"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Full Address
                </label>
                <input
                  type="text"
                  placeholder="Enter your full address / area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-[18px] outline-none"
                  style={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border-color)",
                    color: "var(--foreground)",
                  }}
                />

                {/* Cleaning Details */}
                <label className="text-[13px] font-semibold block mb-[10px]"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Cleaning Details
                </label>
                <div className="detail-cols grid grid-cols-2 gap-3 mb-[10px]">

                  {/* Service & Property */}
                  <div className="rounded-2xl p-[14px]"
                    style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                    <div className="text-[12px] font-bold tracking-[0.4px] uppercase text-[#6de2a6] mb-[10px]">
                      Service Type
                    </div>
                    <label className="text-[12px] block mb-[6px]"
                      style={{ color: "var(--nav-text-muted)" }}>Cleaning</label>
                    <select
                      value={cleaningType}
                      onChange={(e) => setCleaningType(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none mb-[10px]"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        color: cleaningType ? "var(--foreground)" : "var(--nav-text-muted)",
                      }}
                    >
                      <option value="">Select service</option>
                      {CLEANING_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <label className="text-[12px] block mb-[6px]"
                      style={{ color: "var(--nav-text-muted)" }}>Property Type</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        color: propertyType ? "var(--foreground)" : "var(--nav-text-muted)",
                      }}
                    >
                      <option value="">Select property</option>
                      {PROPERTY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>

                  {/* Schedule */}
                  <div className="rounded-2xl p-[14px]"
                    style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                    <div className="text-[12px] font-bold tracking-[0.4px] uppercase text-[#4f8fff] mb-[10px]">
                      Schedule
                    </div>
                    <label className="text-[12px] block mb-[6px]"
                      style={{ color: "var(--nav-text-muted)" }}>Preferred Time</label>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none mb-[10px]"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        color: preferredTime ? "var(--foreground)" : "var(--nav-text-muted)",
                      }}
                    >
                      <option value="">Select time slot</option>
                      {TIME_SLOTS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <label className="text-[12px] block mb-[6px]"
                      style={{ color: "var(--nav-text-muted)" }}>Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        color: frequency ? "var(--foreground)" : "var(--nav-text-muted)",
                      }}
                    >
                      <option value="">One-time or regular?</option>
                      {FREQUENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] mb-2" style={{ color: "#e24b4a" }}>{error}</p>
                )}

                <button
                  className="check-btn w-full mt-2 py-[14px] rounded-[14px] border-none bg-[#2f6eff] text-white font-bold text-[15px] cursor-pointer transition-all duration-200 tracking-[0.2px] disabled:opacity-60 disabled:cursor-not-allowed"
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Get Cleaning Quote"}
                </button>
                <p className="text-center text-[12px] mt-[10px]"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Chemical-safe • Trained staff • No hidden charges
                </p>
              </>
            ) : (
              /* SUCCESS STATE */
              <div className="success-pop flex flex-col items-center text-center py-4">
                <div
                  className="check-pop w-[76px] h-[76px] rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: "rgba(52,168,83,0.12)" }}
                >
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                    <circle cx="19" cy="19" r="19" fill="#34a853" fillOpacity="0.15" />
                    <path d="M11 19.5l5.5 5.5 10.5-11" stroke="#34a853" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <h3 className="font-['Sora',sans-serif] text-[20px] font-extrabold mb-[10px]"
                  style={{ color: "var(--foreground)" }}>
                  Booking Received!
                </h3>
                <p className="text-[14px] leading-[1.7] max-w-[280px] mb-5"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Your cleaning request has been submitted. Our team will call you within 30 minutes.
                </p>

                {/* Booking ID Badge */}
                <div
                  className="rounded-full px-5 py-2 text-[12px] font-bold mb-4"
                  style={{
                    backgroundColor: "rgba(47,110,255,0.1)",
                    border: "1px solid rgba(72,141,255,0.3)",
                    color: "#2979d4",
                  }}
                >
                  Booking ID: #{summary?.bookingRef}
                </div>

                {/* Payment Success Message OR Pay Now Button */}
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
                    {paymentLoading ? "Opening Payment..." : "💳 Pay Now — ₹499"}
                  </button>
                )}

                {/* Booking Summary */}
                {summary && (
                  <div
                    className="w-full rounded-2xl p-4 text-left"
                    style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}
                  >
                    {[
                      ["Service",   summary.cleaningType],
                      ["Property",  summary.propertyType],
                      ["Location",  summary.location],
                      ["Time Slot", summary.preferredTime],
                      ["Frequency", summary.frequency],
                    ].map(([label, value], i, arr) => (
                      <div
                        key={label}
                        className="flex justify-between items-center py-[9px] text-[12px]"
                        style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border-color)" : "none" }}
                      >
                        <span style={{ color: "var(--nav-text-muted)" }}>{label}</span>
                        <span className="font-semibold text-right max-w-[55%]"
                          style={{ color: "var(--foreground)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] mt-4" style={{ color: "var(--nav-text-muted)" }}>
                  ✓ Chemical-safe &nbsp;•&nbsp; ✓ Trained staff &nbsp;•&nbsp; ✓ No hidden charges
                </p>
              </div>
            )}
          </div>
        </section>

        {/* WHY US SECTION */}
        <section className="px-[5%] pt-7 pb-20"
          style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="why-inner max-w-[1280px] mx-auto flex gap-[60px] items-center">
            <div className="flex-1">
              <span className="text-[12px] text-[#4f8fff] font-bold tracking-[3px] uppercase">Why Us</span>
              <h2
                className="font-['Sora',sans-serif] text-[clamp(1.8rem,3.2vw,2.8rem)] font-extrabold mt-3 mb-4 leading-[1.2]"
                style={{ color: "var(--foreground)" }}
              >
                Every Corner Is Scrubbed,<br />Every Surface Is Sanitised.
              </h2>
              <p className="text-[15px] leading-[1.8] max-w-[560px]"
                style={{ color: "var(--nav-text-muted)" }}>
                Our trained cleaners use industry-grade machines, microfiber cloths and safe
                disinfectants to remove grease, stains, dust and germs from your entire home or office.
              </p>
            </div>
            <div className="feature-grid flex-1 grid grid-cols-2 gap-4">
              {[
                { icon: "🧽", title: "Deep Cleaning",    desc: "Intensive cleaning for floors, tiles, bathrooms, kitchen and balconies." },
                { icon: "🧴", title: "Safe Chemicals",   desc: "Professional-grade, skin-friendly and pet-safe cleaning solutions." },
                { icon: "🧹", title: "Mechanised Tools", desc: "Vacuum, single-disc machines and steam cleaners for better results." },
                { icon: "⏱️", title: "On-Time Service",  desc: "Pre-scheduled slots, punctual staff and quick completion." },
              ].map((f, i) => (
                <div
                  key={i}
                  className="info-card rounded-[18px] p-5 transition-all duration-[250ms]"
                  style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                >
                  <div className="text-[26px] mb-[10px]">{f.icon}</div>
                  <div className="font-bold text-[15px] mb-[6px]"
                    style={{ color: "var(--foreground)" }}>{f.title}</div>
                  <div className="text-[13px] leading-[1.7]"
                    style={{ color: "var(--nav-text-muted)" }}>{f.desc}</div>
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