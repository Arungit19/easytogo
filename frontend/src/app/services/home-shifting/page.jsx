"use client";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import About from "../../../components/About";
import { useState } from "react";

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Moradabad", "Agra",
  "Kanpur", "Varanasi", "Noida",
];

const SERVICE_TYPES = [
  "1 BHK", "2 BHK", "3 BHK", "4 BHK", "Apartment / Full Home",
];

const FLOOR_OPTIONS = [
  "Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor+",
];

const ACCESS_OPTIONS = [
  "With Lift", "Without Lift", "Narrow Stairs", "Easy Truck Access",
];

const STATS = [
  { value: "50K+", label: "Homes Shifted" },
  { value: "200+", label: "Cities Covered" },
  { value: "15+",  label: "Years Experience" },
  { value: "98%",  label: "Damage-Free Moves" },
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

export default function HomeShiftingPage() {
  const [mode, setMode]               = useState("within");
  const [serviceType, setServiceType] = useState("");
  const [city, setCity]               = useState("");
  const [fromCity, setFromCity]       = useState("");
  const [toCity, setToCity]           = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation]   = useState("");
  const [pickupFloor, setPickupFloor] = useState("");
  const [pickupAccess, setPickupAccess] = useState("");
  const [dropFloor, setDropFloor]     = useState("");
  const [dropAccess, setDropAccess]   = useState("");
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [summary, setSummary]         = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [refId] = useState("HS" + Math.floor(Math.random() * 9000000 + 1000000));

  async function handleSubmit() {
    setError("");

    if (!serviceType) return setError("Please select a service type.");

    if (mode === "within") {
      if (!city) return setError("Please select a city.");
      if (!fromLocation.trim()) return setError("Please enter the Shifting From location.");
      if (!toLocation.trim()) return setError("Please enter the Shifting To location.");
    } else {
      if (!fromCity || !toCity) return setError("Please select both From and To cities.");
      if (fromCity === toCity) return setError("From and To cities cannot be the same.");
    }

    if (!pickupFloor || !pickupAccess) return setError("Please fill in all Pickup details.");
    if (!dropFloor || !dropAccess) return setError("Please fill in all Drop details.");

    const fromPlace = mode === "within" ? `${fromLocation}, ${city}` : fromCity;
    const toPlace   = mode === "within" ? `${toLocation}, ${city}` : toCity;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const user  = JSON.parse(localStorage.getItem("user") || "{}");

      // Fixed API URL — direct Next.js route
      const res = await fetch("/api/home-shifting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          refId, mode, serviceType,
          city:       mode === "within" ? city : null,
          fromPlace,  toPlace,
          pickupFloor, pickupAccess,
          dropFloor,   dropAccess,
          customer_name:  user.name  || "",
          customer_phone: user.phone || "",
          customer_email: user.email || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Save booking details for payment and summary display
      setSummary({
        serviceType, mode,
        fromPlace, toPlace,
        pickupFloor, pickupAccess,
        dropFloor,   dropAccess,
        bookingId:     data.bookingId || data.id,
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
  }

  async function handlePayment() {
    setPaymentLoading(true);
    try {
      await loadRazorpayScript();

      // Create Razorpay order on server
      const res = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:         999,   // Set your amount here (₹999)
          service:        "Home Shifting",
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
        description: `Home Shifting — ${summary?.serviceType}`,
        order_id:    order.orderId,
        prefill: {
          name:    summary?.customerName  || "",
          email:   summary?.customerEmail || "",
          contact: summary?.customerPhone || "",
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
  }

  function handleReset() {
    setServiceType("");
    setCity(""); setFromCity(""); setToCity("");
    setFromLocation(""); setToLocation("");
    setPickupFloor(""); setPickupAccess("");
    setDropFloor(""); setDropAccess("");
    setError(""); setMode("within");
    setSubmitted(false);
    setSummary(null);
    setPaymentDone(false);
  }

  const fromPlace = mode === "within" ? `${fromLocation}, ${city}` : fromCity;
  const toPlace   = mode === "within" ? `${toLocation}, ${city}` : toCity;

  return (
    <>
      <Navbar />

      <div className="min-h-screen font-['DM_Sans',sans-serif] pt-20"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
          .check-btn:hover { background: #1d5ed8 !important; transform: translateY(-1px); }
          .pay-btn:hover   { background: #16a34a !important; transform: translateY(-1px); }
          .service-card:hover, .info-card:hover {
            transform: translateY(-4px);
            border-color: rgba(72,141,255,0.45) !important;
            box-shadow: 0 18px 40px rgba(0,0,0,0.18);
          }
          .success-anim { animation: fadeUp 0.5s ease; }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .reset-btn:hover { background: var(--border-color) !important; }
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
              <span className="text-[13px] text-[#2979d4] font-bold tracking-[0.2px]">Home Shifting</span>
            </div>

            <h1 className="font-['Sora',sans-serif] text-[clamp(2.2rem,4.8vw,4rem)] font-extrabold leading-[1.08] mb-[18px]"
              style={{ color: "var(--foreground)" }}>
              Home Shifting &amp;
              <br />
              <span className="text-[#4f8fff]">Complete Relocation</span>
            </h1>

            <p className="text-base leading-[1.75] max-w-[540px] mb-[30px]"
              style={{ color: "var(--nav-text-muted)" }}>
              Full-service home relocation from packing, loading, transportation to
              unloading and unpacking. Safe, fast and damage-free shifting of your
              household anywhere in India.
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

          {/* Right: Form OR Success */}
          <div
            className="form-wrap w-[410px] shrink-0 rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            {!submitted ? (
              <>
                <h3 className="font-['Sora',sans-serif] text-lg font-bold mb-[18px]"
                  style={{ color: "var(--foreground)" }}>
                  Book Home Shifting
                </h3>

                {/* Mode Toggle */}
                <div className="flex rounded-full p-1 mb-[22px]"
                  style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                  {["within", "between"].map((m) => (
                    <button key={m} type="button"
                      onClick={() => { setMode(m); setError(""); }}
                      className="flex-1 py-[10px] rounded-full border-none cursor-pointer font-bold text-sm transition-all duration-200"
                      style={{
                        backgroundColor: mode === m ? "#2f6eff" : "transparent",
                        color: mode === m ? "#ffffff" : "var(--nav-text-muted)",
                      }}>
                      {m === "within" ? "Within City" : "Between Cities"}
                    </button>
                  ))}
                </div>

                {/* Service Type */}
                <label className="text-[13px] font-semibold block mb-2"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Select Services
                </label>
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-[18px] outline-none"
                  style={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border-color)",
                    color: serviceType ? "var(--foreground)" : "var(--nav-text-muted)",
                  }}>
                  <option value="">Select services</option>
                  {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Within City Fields */}
                {mode === "within" ? (
                  <>
                    <label className="text-[13px] font-semibold block mb-2"
                      style={{ color: "var(--nav-text-muted)" }}>Select City</label>
                    <select value={city} onChange={(e) => setCity(e.target.value)}
                      className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-[18px] outline-none"
                      style={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border-color)",
                        color: city ? "var(--foreground)" : "var(--nav-text-muted)",
                      }}>
                      <option value="">Select your city</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <label className="text-[13px] font-semibold block mb-2"
                      style={{ color: "var(--nav-text-muted)" }}>Pickup & Drop Location</label>
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
                )}

                {/* Pickup & Drop Details */}
                <label className="text-[13px] font-semibold block mb-[10px]"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Select pickup and drop details
                </label>
                <div className="detail-cols grid grid-cols-2 gap-3 mb-[10px]">
                  {/* Pickup */}
                  <div className="rounded-2xl p-[14px]"
                    style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                    <div className="text-[12px] font-bold tracking-[0.4px] uppercase text-[#ff8b8b] mb-[10px]">Pickup</div>
                    <label className="text-[12px] block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>Floor</label>
                    <select value={pickupFloor} onChange={(e) => setPickupFloor(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none mb-[10px]"
                      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", color: pickupFloor ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select floor</option>
                      {FLOOR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <label className="text-[12px] block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>Access</label>
                    <select value={pickupAccess} onChange={(e) => setPickupAccess(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", color: pickupAccess ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select access</option>
                      {ACCESS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>

                  {/* Drop */}
                  <div className="rounded-2xl p-[14px]"
                    style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                    <div className="text-[12px] font-bold tracking-[0.4px] uppercase text-[#6de2a6] mb-[10px]">Drop</div>
                    <label className="text-[12px] block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>Floor</label>
                    <select value={dropFloor} onChange={(e) => setDropFloor(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none mb-[10px]"
                      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", color: dropFloor ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select floor</option>
                      {FLOOR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <label className="text-[12px] block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>Access</label>
                    <select value={dropAccess} onChange={(e) => setDropAccess(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", color: dropAccess ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select access</option>
                      {ACCESS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] font-semibold mt-2 mb-1" style={{ color: "#e24b4a" }}>
                    ⚠ {error}
                  </p>
                )}

                <button
                  className="check-btn w-full mt-2 py-[14px] rounded-[14px] border-none bg-[#2f6eff] text-white font-bold text-[15px] cursor-pointer transition-all duration-200 tracking-[0.2px]"
                  type="button" onClick={handleSubmit} disabled={loading}
                  style={{ opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Submitting..." : "Get Home Shifting Quote"}
                </button>

                <p className="text-center text-[12px] mt-[10px]" style={{ color: "var(--nav-text-muted)" }}>
                  No hidden charges
                </p>
              </>
            ) : (
              /* SUCCESS SCREEN */
              <div className="success-anim text-center">
                <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: "rgba(76,175,80,0.12)" }}>
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                    <circle cx="19" cy="19" r="19" fill="#4caf50" fillOpacity="0.15" />
                    <circle cx="19" cy="19" r="15" fill="#4caf50" fillOpacity="0.2" />
                    <polyline points="11,19 17,25 28,13" stroke="#2e7d32" strokeWidth="2.8"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <h3 className="font-['Sora',sans-serif] text-[18px] font-extrabold mb-2"
                  style={{ color: "var(--foreground)" }}>
                  Booking Request Submitted!
                </h3>
                <p className="text-[13px] leading-[1.75] mb-4" style={{ color: "var(--nav-text-muted)" }}>
                  Your home shifting details have been received.<br />
                  Our team will contact you within <strong>30 minutes</strong>.
                </p>

                {/* Reference ID */}
                <div className="inline-block text-[12px] font-bold px-4 py-[6px] rounded-full mb-4 tracking-[0.5px]"
                  style={{ backgroundColor: "rgba(47,110,255,0.1)", color: "#2f6eff" }}>
                  Ref: {refId}
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
                    {paymentLoading ? "Opening Payment..." : "💳 Pay Now — ₹999"}
                  </button>
                )}

                {/* Booking Summary */}
                <div className="text-left mb-4 space-y-2">
                  {[
                    { label: "Service Type", value: summary?.serviceType },
                    { label: "Move Type",    value: summary?.mode === "within" ? "Within City" : "Between Cities" },
                    { label: "From",         value: summary?.fromPlace },
                    { label: "To",           value: summary?.toPlace },
                    { label: "Pickup",       value: `${summary?.pickupFloor} • ${summary?.pickupAccess}` },
                    { label: "Drop",         value: `${summary?.dropFloor} • ${summary?.dropAccess}` },
                  ].map((row) => (
                    <div key={row.label}
                      className="flex justify-between items-center px-[14px] py-[10px] rounded-[12px] text-[13px]"
                      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                      <span style={{ color: "var(--nav-text-muted)" }}>{row.label}</span>
                      <span className="font-semibold" style={{ color: "var(--foreground)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Next Steps */}
                <div className="rounded-[14px] p-4 text-left mb-5"
                  style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                  <p className="text-[12px] font-bold mb-2" style={{ color: "var(--foreground)" }}>What happens next?</p>
                  {[
                    "✅  SMS confirmation sent to your number",
                    "📞  Our expert calls you within 30 mins",
                    "🏠  Free home survey scheduled",
                    "📦  Final quote — no hidden charges",
                  ].map((step) => (
                    <p key={step} className="text-[12px] leading-[1.9]"
                      style={{ color: "var(--nav-text-muted)" }}>{step}</p>
                  ))}
                </div>

                {/* Reset Button */}
                <button type="button" onClick={handleReset}
                  className="reset-btn w-full py-[12px] rounded-[14px] text-[13px] font-bold cursor-pointer transition-all duration-200"
                  style={{ backgroundColor: "transparent", border: "1px solid var(--border-color)", color: "var(--foreground)" }}>
                  Book Another Shifting
                </button>
              </div>
            )}
          </div>
        </section>

        {/* WHY US SECTION */}
        <section className="px-[5%] pt-7 pb-20" style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="why-inner max-w-[1280px] mx-auto flex gap-[60px] items-center">
            <div className="flex-1">
              <span className="text-[12px] text-[#4f8fff] font-bold tracking-[3px] uppercase">Why Choose Us</span>
              <h2 className="font-['Sora',sans-serif] text-[clamp(1.8rem,3.2vw,2.8rem)] font-extrabold mt-3 mb-4 leading-[1.2]"
                style={{ color: "var(--foreground)" }}>
                Door-To-Door Service,<br />Zero Damage Guaranteed.
              </h2>
              <p className="text-[15px] leading-[1.8] max-w-[560px]" style={{ color: "var(--nav-text-muted)" }}>
                From careful packing and loading to safe transportation and final
                unpacking — we handle your complete home relocation with trained
                professionals and premium vehicles.
              </p>
            </div>
            <div className="feature-grid flex-1 grid grid-cols-2 gap-4">
              {[
                { icon: "🚛", title: "Premium Vehicles",  desc: "Well-maintained trucks with GPS tracking and suspension for safe transit." },
                { icon: "🛡️", title: "Damage Insurance", desc: "Full coverage for your household goods during transportation." },
                { icon: "👥", title: "Expert Team",       desc: "Trained professionals for careful handling of all household items." },
                { icon: "⚡", title: "Express Service",   desc: "Fastest possible delivery without compromising on safety." },
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