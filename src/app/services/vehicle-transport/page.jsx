"use client";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { useState } from "react";

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Moradabad", "Agra",
  "Kanpur", "Varanasi", "Noida",
];

const VEHICLE_TYPES = [
  "Hatchback / Sedan", "SUV / MUV", "Luxury Car",
  "Bike / Scooter", "Commercial Vehicle",
];

const TRANSPORT_MODES = [
  "Open Truck", "Covered Container", "Shared Carrier", "Dedicated Carrier",
];

const STATS = [
  { value: "25K+", label: "Vehicles Moved" },
  { value: "200+", label: "Cities Covered" },
  { value: "15+",  label: "Years Experience" },
  { value: "98%",  label: "On-time Delivery" },
];

// Dynamically load Razorpay checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    document.body.appendChild(script);
  });
}

export default function VehicleTransportPage() {
  const [mode, setMode]                 = useState("within");
  const [city, setCity]                 = useState("");
  const [fromCity, setFromCity]         = useState("");
  const [toCity, setToCity]             = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation]     = useState("");
  const [vehicleType, setVehicleType]   = useState("");
  const [transportMode, setTransportMode] = useState("");
  const [submitted, setSubmitted]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [bookingData, setBookingData]   = useState(null);
  const [paymentDone, setPaymentDone]   = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!vehicleType) return setError("Please select a vehicle type.");
    if (mode === "within" && !city) return setError("Please select your city.");
    if (mode === "between" && (!fromCity || !toCity))
      return setError("Please select both From and To cities.");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const user  = JSON.parse(localStorage.getItem("user") || "{}");

      // Fixed API URL — direct Next.js route
      const res = await fetch("/api/vehicle-transport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode, city, fromCity, toCity,
          fromLocation, toLocation,
          vehicleType,  transportMode,
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

      // Save booking data for payment
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

      // Create Razorpay order on server
      const res = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:         1999,   // Set your amount here (₹1999)
          service:        "Vehicle Transport",
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
        description: `Vehicle Transport — ${vehicleType}`,
        order_id:    order.orderId,
        prefill: {
          name:    bookingData?.customerName  || "",
          email:   bookingData?.customerEmail || "",
          contact: bookingData?.customerPhone || "",
        },
        handler: async (response) => {
          // Verify payment signature on server
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

  // Summary rows for success card
  const summaryRows = mode === "within"
    ? [
        { label: "Move Type",      value: "Within City" },
        { label: "City",           value: city },
        { label: "From",           value: fromLocation },
        { label: "To",             value: toLocation },
        { label: "Vehicle",        value: vehicleType },
        { label: "Transport Mode", value: transportMode },
      ]
    : [
        { label: "Move Type",      value: "Between Cities" },
        { label: "From City",      value: fromCity },
        { label: "To City",        value: toCity },
        { label: "Pickup",         value: fromLocation },
        { label: "Drop",           value: toLocation },
        { label: "Vehicle",        value: vehicleType },
        { label: "Transport Mode", value: transportMode },
      ];

  return (
    <>
      <Navbar />

      <div className="min-h-screen font-['DM_Sans',sans-serif] pt-20"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
          .check-btn:hover { background: #1d5ed8 !important; transform: translateY(-1px); }
          .check-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
          .pay-btn:hover { background: #16a34a !important; transform: translateY(-1px); }
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
            0%   { transform: scale(0);   opacity: 0; }
            65%  { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1);   opacity: 1; }
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
            .between-cols, .detail-cols, .feature-grid { grid-template-columns: 1fr !important; }
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
              <span className="text-[13px] text-[#2979d4] font-bold tracking-[0.2px]">Vehicle Transport</span>
            </div>

            <h1 className="font-['Sora',sans-serif] text-[clamp(2.2rem,4.8vw,4rem)] font-extrabold leading-[1.08] mb-[18px]"
              style={{ color: "var(--foreground)" }}>
              Door‑to‑Door
              <br />
              <span className="text-[#4f8fff]">Vehicle Transport</span>
            </h1>

            <p className="text-base leading-[1.75] max-w-[540px] mb-[30px]"
              style={{ color: "var(--nav-text-muted)" }}>
              Safe car and bike relocation with custom ramps, wheel locks and
              covered carriers. Door‑pickup and door‑delivery support so your
              vehicle reaches the new city safely and on time.
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

          {/* Right: Success Card OR Booking Form */}
          {submitted ? (
            /* SUCCESS STATE */
            <div
              className="form-wrap w-[410px] shrink-0 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
              style={{
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                animation: "fadeInUp 0.45s cubic-bezier(.22,1,.36,1) both",
              }}
            >
              {/* Animated checkmark */}
              <div className="flex flex-col items-center text-center mb-5">
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(135deg,#2f6eff22,#22c97e22)",
                  border: "2.5px solid #22c97e",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "popIn 0.5s cubic-bezier(.22,1,.36,1) 0.1s both",
                  marginBottom: 18,
                }}>
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <polyline points="6,17 14,25 28,10" stroke="#22c97e" strokeWidth="3.2"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="60" strokeDashoffset="60"
                      style={{ animation: "checkDraw 0.45s ease 0.35s forwards" }} />
                  </svg>
                </div>

                <h3 className="font-['Sora',sans-serif] text-xl font-extrabold mb-2"
                  style={{ color: "var(--foreground)" }}>
                  Request Submitted!
                </h3>
                <p className="text-[13.5px] leading-[1.7]"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Your vehicle transport request has been received. Our team will call you within{" "}
                  <span style={{ color: "#2f6eff", fontWeight: 700 }}>30 minutes</span> to confirm the quote.
                </p>
              </div>

              {/* Payment Success Message OR Pay Now Button */}
              {paymentDone ? (
                <div className="w-full rounded-2xl px-4 py-3 text-center text-sm font-bold mb-4"
                  style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                  ✅ Payment Successful! Booking confirmed.
                </div>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="pay-btn w-full py-[14px] rounded-[14px] border-none text-white font-bold text-[15px] cursor-pointer transition-all duration-200 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#22c55e" }}>
                  {paymentLoading ? "Opening Payment..." : "💳 Pay Now — ₹1999"}
                </button>
              )}

              {/* Booking Summary */}
              <div className="rounded-2xl p-4 mb-5"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                <div className="text-[11px] font-bold tracking-[2px] uppercase mb-3"
                  style={{ color: "#4f8fff" }}>Booking Summary</div>
                <div className="flex flex-col gap-[10px]">
                  {summaryRows.map(({ label, value }) =>
                    value ? (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-[12px]" style={{ color: "var(--nav-text-muted)" }}>{label}</span>
                        <span className="text-[12px] font-semibold px-3 py-[4px] rounded-full"
                          style={{
                            backgroundColor: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            color: "var(--foreground)",
                            maxWidth: "58%",
                            textAlign: "right",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                          {value}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>

              {/* Trust row */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--nav-text-muted)" }}>✅</span>
                <span className="text-[12px]" style={{ color: "var(--nav-text-muted)" }}>
                  No hidden charges &nbsp;·&nbsp; Door-to-door &nbsp;·&nbsp; Insured transit
                </span>
              </div>
            </div>
          ) : (
            /* BOOKING FORM */
            <div
              className="form-wrap w-[410px] shrink-0 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
              style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
            >
              <h3 className="font-['Sora',sans-serif] text-lg font-bold mb-[18px]"
                style={{ color: "var(--foreground)" }}>
                Get vehicle transport quote
              </h3>

              {/* Mode Toggle */}
              <div className="flex rounded-full p-1 mb-[22px]"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                {["within", "between"].map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className="flex-1 py-[10px] rounded-full border-none cursor-pointer font-bold text-sm transition-all duration-200"
                    style={{
                      backgroundColor: mode === m ? "#2f6eff" : "transparent",
                      color: mode === m ? "#ffffff" : "var(--nav-text-muted)",
                    }}>
                    {m === "within" ? "Within City" : "Between Cities"}
                  </button>
                ))}
              </div>

              {/* Within City Fields */}
              {mode === "within" ? (
                <>
                  <label className="text-[13px] font-semibold block mb-2"
                    style={{ color: "var(--nav-text-muted)" }}>Select City</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)}
                    className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-[18px] outline-none"
                    style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)", color: city ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                    <option value="">Select your city</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label className="text-[13px] font-semibold block mb-2"
                    style={{ color: "var(--nav-text-muted)" }}>Select pickup and drop location</label>
                  <div className="mb-[18px]">
                    <input type="text" placeholder="Shifting From"
                      value={fromLocation} onChange={(e) => setFromLocation(e.target.value)}
                      className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-3 outline-none"
                      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)", color: "var(--foreground)" }} />
                    <input type="text" placeholder="Shifting To"
                      value={toLocation} onChange={(e) => setToLocation(e.target.value)}
                      className="w-full px-[14px] py-[13px] rounded-[14px] text-sm outline-none"
                      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)", color: "var(--foreground)" }} />
                  </div>
                </>
              ) : (
                /* Between Cities Fields */
                <>
                  <div className="between-cols grid grid-cols-2 gap-3 mb-[18px]">
                    <div>
                      <label className="text-[13px] font-semibold block mb-2"
                        style={{ color: "var(--nav-text-muted)" }}>From City</label>
                      <select value={fromCity} onChange={(e) => setFromCity(e.target.value)}
                        className="w-full px-3 py-[13px] rounded-[14px] text-sm outline-none"
                        style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)", color: fromCity ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                        <option value="">Select</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[13px] font-semibold block mb-2"
                        style={{ color: "var(--nav-text-muted)" }}>To City</label>
                      <select value={toCity} onChange={(e) => setToCity(e.target.value)}
                        className="w-full px-3 py-[13px] rounded-[14px] text-sm outline-none"
                        style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)", color: toCity ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                        <option value="">Select</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <label className="text-[13px] font-semibold block mb-2"
                    style={{ color: "var(--nav-text-muted)" }}>Pickup &amp; drop location</label>
                  <div className="mb-[18px]">
                    <input type="text" placeholder="Shifting From"
                      value={fromLocation} onChange={(e) => setFromLocation(e.target.value)}
                      className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-3 outline-none"
                      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)", color: "var(--foreground)" }} />
                    <input type="text" placeholder="Shifting To"
                      value={toLocation} onChange={(e) => setToLocation(e.target.value)}
                      className="w-full px-[14px] py-[13px] rounded-[14px] text-sm outline-none"
                      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)", color: "var(--foreground)" }} />
                  </div>
                </>
              )}

              {/* Vehicle Details */}
              <label className="text-[13px] font-semibold block mb-[10px]"
                style={{ color: "var(--nav-text-muted)" }}>Vehicle details</label>
              <div className="detail-cols grid grid-cols-2 gap-3 mb-[10px]">
                <div className="rounded-2xl p-[14px]"
                  style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                  <div className="text-[12px] font-bold tracking-[0.4px] uppercase text-[#ffdc8b] mb-[10px]">
                    Vehicle Type
                  </div>
                  <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                    style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", color: vehicleType ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                    <option value="">Select vehicle</option>
                    {VEHICLE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>

                <div className="rounded-2xl p-[14px]"
                  style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                  <div className="text-[12px] font-bold tracking-[0.4px] uppercase text-[#6de2a6] mb-[10px]">
                    Transport Mode
                  </div>
                  <select value={transportMode} onChange={(e) => setTransportMode(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                    style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", color: transportMode ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                    <option value="">Select mode</option>
                    {TRANSPORT_MODES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-red-400 mb-2 text-center">{error}</p>
              )}

              <button
                className="check-btn w-full mt-2 py-[14px] rounded-[14px] border-none bg-[#2f6eff] text-white font-bold text-[15px] cursor-pointer transition-all duration-200"
                type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Get Vehicle Quote"}
              </button>

              <p className="text-center text-[12px] mt-[10px]"
                style={{ color: "var(--nav-text-muted)" }}>
                Door pickup • Door delivery • No hidden charges
              </p>
            </div>
          )}
        </section>

        {/* WHY US SECTION */}
        <section className="px-[5%] pt-7 pb-20"
          style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="why-inner max-w-[1280px] mx-auto flex gap-[60px] items-center">
            <div className="flex-1">
              <span className="text-[12px] text-[#4f8fff] font-bold tracking-[3px] uppercase">Why Us</span>
              <h2 className="font-['Sora',sans-serif] text-[clamp(1.8rem,3.2vw,2.8rem)] font-extrabold mt-3 mb-4 leading-[1.2]"
                style={{ color: "var(--foreground)" }}>
                Your Vehicle Is Tracked,<br />Insured And Handled With Care.
              </h2>
              <p className="text-[15px] leading-[1.8] max-w-[560px]"
                style={{ color: "var(--nav-text-muted)" }}>
                From pickup to delivery, our team uses hydraulic ramps, wheel
                locks and GPS‑enabled carriers so your car or bike stays safe and
                you always know where it is during transit.
              </p>
            </div>
            <div className="feature-grid flex-1 grid grid-cols-2 gap-4">
              {[
                { icon: "🚚", title: "Specialised Carriers", desc: "Dedicated and shared car carriers with ramps and wheel locks." },
                { icon: "🛡️", title: "Transit Insurance",    desc: "Insurance support for extra safety during long‑distance moves." },
                { icon: "📍", title: "Live Tracking",         desc: "Regular updates and tracking support during vehicle transit." },
                { icon: "🧰", title: "Expert Handling",       desc: "Trained crew for loading, unloading and inspection at both ends." },
              ].map((f, i) => (
                <div key={i} className="info-card rounded-[18px] p-5 transition-all duration-[250ms]"
                  style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
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