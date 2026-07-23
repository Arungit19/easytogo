"use client";
import { useState } from "react";

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Moradabad", "Agra",
  "Kanpur", "Varanasi", "Noida",
];

const FLOOR_OPTIONS = [
  "Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor+",
];

const ACCESS_OPTIONS = [
  "With Lift", "Without Lift", "Narrow Stairs", "Easy Truck Access",
];

const STATS = [
  { value: "5K+",  label: "Offices Relocated" },
  { value: "200+", label: "Cities Covered" },
  { value: "15+",  label: "Years Experience" },
  { value: "98%",  label: "Zero-Delay Moves" },
];

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-[12px] shrink-0" style={{ color: "var(--nav-text-muted)" }}>{label}</span>
      <span className="text-[12px] font-semibold text-right" style={{ color: "var(--foreground)" }}>{value}</span>
    </div>
  );
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    document.body.appendChild(script);
  });
}

export default function OfficeRelocationPage() {
  const [mode, setMode]               = useState("within");
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
  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);
  const [serverError, setServerError] = useState("");
  const [summary, setSummary]         = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  // "online" | "cod" | null
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [codLoading, setCodLoading]       = useState(false);

  const validate = () => {
    const newErrors = {};
    if (mode === "within") {
      if (!city) newErrors.city = "Please select a city.";
      if (!fromLocation.trim()) newErrors.fromLocation = "Please enter pickup location.";
      if (!toLocation.trim()) newErrors.toLocation = "Please enter drop location.";
    } else {
      if (!fromCity) newErrors.fromCity = "Please select origin city.";
      if (!toCity) newErrors.toCity = "Please select destination city.";
      if (fromCity && toCity && fromCity === toCity)
        newErrors.toCity = "Origin and destination cities must be different.";
    }
    if (!pickupFloor)  newErrors.pickupFloor  = "Select pickup floor.";
    if (!pickupAccess) newErrors.pickupAccess = "Select pickup access.";
    if (!dropFloor)    newErrors.dropFloor    = "Select drop floor.";
    if (!dropAccess)   newErrors.dropAccess   = "Select drop access.";
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setServerError("");

    try {
      const token = localStorage.getItem("token");
      const user  = JSON.parse(localStorage.getItem("user") || "{}");

      const res = await fetch("/api/office-relocation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode,  city: mode === "within" ? city : fromCity, fromCity, toCity,
          fromLocation, toLocation,
          pickupFloor, pickupAccess,
          dropFloor,   dropAccess,
          customer_name:  user.name  || "",
          customer_phone: user.phone || "",
          customer_email: user.email || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSummary({
        mode, city, fromCity, toCity,
        fromLocation, toLocation,
        pickupFloor, pickupAccess,
        dropFloor,   dropAccess,
        bookingId:     data.bookingId || data.id,
        customerName:  user.name  || "",
        customerEmail: user.email || "",
        customerPhone: user.phone || "",
      });
      setSubmitted(true);

    } catch (err) {
      setServerError("Network error. Please check your connection.");
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
          amount:         1499,
          service:        "Office Relocation",
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
        description: "Office Relocation Service",
        order_id:    order.orderId,
        prefill: {
          name:    summary?.customerName  || "",
          email:   summary?.customerEmail || "",
          contact: summary?.customerPhone || "",
        },
        handler: async (response) => {
          const vRes = await fetch("/api/payments/verify", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const vData = await vRes.json();
          if (vData.success) {
            setPaymentMethod("online");
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

  // ── Cash on Delivery handler ──────────────────────────────────────────────
  const handleCOD = async () => {
    setCodLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/payments/cod", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          booking_id:     summary?.bookingId,
          amount:         1499,
          service:        "Office Relocation",
          customer_name:  summary?.customerName,
          customer_email: summary?.customerEmail,
          customer_phone: summary?.customerPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not confirm COD. Please try again.");
        return;
      }

      setPaymentMethod("cod");
      setPaymentDone(true);

    } catch (err) {
      alert("Network error: " + err.message);
    } finally {
      setCodLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen font-['DM_Sans',sans-serif] pt-20"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
          .check-btn:hover { background: #1d5ed8 !important; transform: translateY(-1px); }
          .pay-btn:hover   { background: #16a34a !important; transform: translateY(-1px); }
          .cod-btn:hover   { background: #b45309 !important; transform: translateY(-1px); }
          .service-card:hover, .info-card:hover {
            transform: translateY(-4px);
            border-color: rgba(72,141,255,0.45) !important;
            box-shadow: 0 18px 40px rgba(0,0,0,0.18);
          }
          .error-text { color: #ff6b6b; font-size: 11px; margin-top: 4px; display: block; }
          .success-card { animation: successFadeIn 0.5s ease forwards; }
          @keyframes successFadeIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          .checkmark-circle {
            animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
          }
          @keyframes popIn {
            from { transform: scale(0); }
            to   { transform: scale(1); }
          }
          .payment-tab { transition: all 0.2s; }
          .payment-tab:hover:not(.active-online):not(.active-cod) {
            border-color: rgba(72,141,255,0.3) !important;
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
            .between-cols, .detail-cols, .feature-grid, .payment-methods { grid-template-columns: 1fr !important; }
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
              <span className="text-[13px] text-[#2979d4] font-bold tracking-[0.2px]">Office Relocation</span>
            </div>

            <h1 className="font-['Sora',sans-serif] text-[clamp(2.2rem,4.8vw,4rem)] font-extrabold leading-[1.08] mb-[18px]"
              style={{ color: "var(--foreground)" }}>
              Office Relocation
              <br />
              <span className="text-[#4f8fff]">Zero Downtime Shifting</span>
            </h1>

            <p className="text-base leading-[1.75] max-w-[540px] mb-[30px]"
              style={{ color: "var(--nav-text-muted)" }}>
              End-to-end office relocation including packing of systems, files and
              furniture, safe transportation, unloading and organized setup at the
              new workspace with minimum business interruption.
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
            {submitted ? (
              /* SUCCESS STATE */
              <div className="success-card flex flex-col items-center text-center py-6 px-2">
                <div className="checkmark-circle w-[72px] h-[72px] rounded-full bg-[rgba(72,220,143,0.15)] border-2 border-[#44db8e] flex items-center justify-center mb-5">
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <path d="M7 17.5L13.5 24L27 10" stroke="#44db8e" strokeWidth="2.8"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <h3 className="font-['Sora',sans-serif] text-[1.35rem] font-extrabold mb-3"
                  style={{ color: "var(--foreground)" }}>
                  Request Submitted Successfully!
                </h3>

                <p className="text-[14px] leading-[1.75] mb-5"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Your office relocation request has been received. Our team will
                  contact you shortly to confirm details and schedule a free site survey.
                </p>

                {/* ── Payment Section ─────────────────────────────── */}
                {paymentDone ? (
                  /* Confirmed state */
                  <div className="w-full rounded-2xl px-4 py-3 text-center text-sm font-bold mb-4"
                    style={{
                      backgroundColor: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }}>
                    {paymentMethod === "cod"
                      ? "✅ Cash on Delivery confirmed! Pay ₹1499 when our team arrives."
                      : "✅ Payment Successful! Booking confirmed."}
                  </div>
                ) : (
                  <>
                    {/* Payment method label */}
                    <p className="text-[12px] font-semibold mb-3 w-full text-left"
                      style={{ color: "var(--nav-text-muted)" }}>
                      Choose Payment Method
                    </p>

                    {/* Tab selector */}
                    <div className="payment-methods grid grid-cols-2 gap-3 w-full mb-4">
                      {/* Online Tab */}
                      <button
                        onClick={() => setPaymentMethod("online")}
                        className={`payment-tab rounded-2xl py-3 px-3 text-[12px] font-bold cursor-pointer border-2 flex flex-col items-center gap-1 ${paymentMethod === "online" ? "active-online" : ""}`}
                        style={{
                          backgroundColor: paymentMethod === "online" ? "rgba(47,110,255,0.08)" : "var(--background)",
                          borderColor: paymentMethod === "online" ? "rgba(72,141,255,0.6)" : "var(--border-color)",
                          color: paymentMethod === "online" ? "#2979d4" : "var(--nav-text-muted)",
                        }}
                      >
                        <span className="text-[20px]">💳</span>
                        <span>Pay Online</span>
                        <span className="font-normal text-[10px]">UPI / Card / Net Banking</span>
                      </button>

                      {/* COD Tab */}
                      <button
                        onClick={() => setPaymentMethod("cod")}
                        className={`payment-tab rounded-2xl py-3 px-3 text-[12px] font-bold cursor-pointer border-2 flex flex-col items-center gap-1 ${paymentMethod === "cod" ? "active-cod" : ""}`}
                        style={{
                          backgroundColor: paymentMethod === "cod" ? "rgba(245,158,11,0.08)" : "var(--background)",
                          borderColor: paymentMethod === "cod" ? "rgba(245,158,11,0.6)" : "var(--border-color)",
                          color: paymentMethod === "cod" ? "#b45309" : "var(--nav-text-muted)",
                        }}
                      >
                        <span className="text-[20px]">💵</span>
                        <span>Cash on Delivery</span>
                        <span className="font-normal text-[10px]">Pay when team arrives</span>
                      </button>
                    </div>

                    {/* Action button based on selection */}
                    {paymentMethod === "online" && (
                      <button
                        onClick={handlePayment}
                        disabled={paymentLoading}
                        className="pay-btn w-full py-[14px] rounded-[14px] border-none text-white font-bold text-[15px] cursor-pointer transition-all duration-200 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ backgroundColor: "#22c55e" }}>
                        {paymentLoading ? "Opening Payment..." : "💳 Pay Now — ₹1499"}
                      </button>
                    )}

                    {paymentMethod === "cod" && (
                      <>
                        {/* COD info note */}
                        <div
                          className="w-full rounded-2xl px-4 py-3 text-[12px] mb-3 text-left"
                          style={{
                            backgroundColor: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.25)",
                            color: "#92400e",
                          }}
                        >
                          <p className="font-bold mb-1">📌 Cash on Delivery — ₹1499</p>
                          <p className="leading-[1.6]">
                            Pay in cash to our relocation team on the day of service.
                            Please keep the exact amount ready.
                          </p>
                        </div>
                        <button
                          onClick={handleCOD}
                          disabled={codLoading}
                          className="cod-btn w-full py-[14px] rounded-[14px] border-none text-white font-bold text-[15px] cursor-pointer transition-all duration-200 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ backgroundColor: "#d97706" }}>
                          {codLoading ? "Confirming..." : "✅ Confirm Cash on Delivery"}
                        </button>
                      </>
                    )}

                    {!paymentMethod && (
                      <p className="text-[11px] mb-3 text-center" style={{ color: "var(--nav-text-muted)" }}>
                        ↑ Select a payment method above to proceed
                      </p>
                    )}
                  </>
                )}
                {/* ─────────────────────────────────────────────────── */}

                {/* Booking Summary */}
                <div className="w-full rounded-2xl p-4 text-left mb-4"
                  style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                  <div className="text-[11px] font-bold tracking-[2px] uppercase text-[#4f8fff] mb-3">
                    Booking Summary
                  </div>
                  <div className="space-y-[8px]">
                    <SummaryRow label="Move Type" value={summary?.mode === "within" ? "Within City" : "Between Cities"} />
                    {summary?.mode === "within" ? (
                      <>
                        <SummaryRow label="City" value={summary?.city} />
                        <SummaryRow label="From" value={summary?.fromLocation} />
                        <SummaryRow label="To"   value={summary?.toLocation} />
                      </>
                    ) : (
                      <>
                        <SummaryRow label="From City" value={summary?.fromCity} />
                        <SummaryRow label="To City"   value={summary?.toCity} />
                      </>
                    )}
                    <SummaryRow label="Pickup" value={`${summary?.pickupFloor} · ${summary?.pickupAccess}`} />
                    <SummaryRow label="Drop"   value={`${summary?.dropFloor} · ${summary?.dropAccess}`} />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[12px]"
                  style={{ color: "var(--nav-text-muted)" }}>
                  <span className="w-2 h-2 rounded-full bg-[#44db8e] inline-block shrink-0" />
                  Free site survey will be arranged within 24 hours
                </div>
              </div>
            ) : (
              /* FORM STATE */
              <>
                <h3 className="font-['Sora',sans-serif] text-lg font-bold mb-[18px]"
                  style={{ color: "var(--foreground)" }}>
                  Book Office Relocation
                </h3>

                {/* Mode Toggle */}
                <div className="flex rounded-full p-1 mb-[22px]"
                  style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                  {["within", "between"].map((m) => (
                    <button key={m} type="button"
                      onClick={() => { setMode(m); setErrors({}); }}
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
                    <select value={city}
                      onChange={(e) => { setCity(e.target.value); setErrors((p) => ({ ...p, city: undefined })); }}
                      className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-1 outline-none"
                      style={{
                        backgroundColor: "var(--background)",
                        border: `1px solid ${errors.city ? "#ff6b6b" : "var(--border-color)"}`,
                        color: city ? "var(--foreground)" : "var(--nav-text-muted)",
                      }}>
                      <option value="">Select your city</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.city && <span className="error-text">{errors.city}</span>}

                    <label className="text-[13px] font-semibold block mt-[14px] mb-2"
                      style={{ color: "var(--nav-text-muted)" }}>
                      Select pickup and drop location
                    </label>
                    <div className="mb-[18px]">
                      <input type="text" placeholder="Shifting From"
                        value={fromLocation}
                        onChange={(e) => { setFromLocation(e.target.value); setErrors((p) => ({ ...p, fromLocation: undefined })); }}
                        className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mb-1 outline-none"
                        style={{
                          backgroundColor: "var(--background)",
                          border: `1px solid ${errors.fromLocation ? "#ff6b6b" : "var(--border-color)"}`,
                          color: "var(--foreground)",
                        }} />
                      {errors.fromLocation && <span className="error-text mb-2">{errors.fromLocation}</span>}
                      <input type="text" placeholder="Shifting To"
                        value={toLocation}
                        onChange={(e) => { setToLocation(e.target.value); setErrors((p) => ({ ...p, toLocation: undefined })); }}
                        className="w-full px-[14px] py-[13px] rounded-[14px] text-sm mt-2 outline-none"
                        style={{
                          backgroundColor: "var(--background)",
                          border: `1px solid ${errors.toLocation ? "#ff6b6b" : "var(--border-color)"}`,
                          color: "var(--foreground)",
                        }} />
                      {errors.toLocation && <span className="error-text">{errors.toLocation}</span>}
                    </div>
                  </>
                ) : (
                  /* Between Cities Fields */
                  <div className="between-cols grid grid-cols-2 gap-3 mb-[18px]">
                    <div>
                      <label className="text-[13px] font-semibold block mb-2"
                        style={{ color: "var(--nav-text-muted)" }}>From City</label>
                      <select value={fromCity}
                        onChange={(e) => { setFromCity(e.target.value); setErrors((p) => ({ ...p, fromCity: undefined })); }}
                        className="w-full px-3 py-[13px] rounded-[14px] text-sm outline-none"
                        style={{
                          backgroundColor: "var(--background)",
                          border: `1px solid ${errors.fromCity ? "#ff6b6b" : "var(--border-color)"}`,
                          color: fromCity ? "var(--foreground)" : "var(--nav-text-muted)",
                        }}>
                        <option value="">Select</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errors.fromCity && <span className="error-text">{errors.fromCity}</span>}
                    </div>
                    <div>
                      <label className="text-[13px] font-semibold block mb-2"
                        style={{ color: "var(--nav-text-muted)" }}>To City</label>
                      <select value={toCity}
                        onChange={(e) => { setToCity(e.target.value); setErrors((p) => ({ ...p, toCity: undefined })); }}
                        className="w-full px-3 py-[13px] rounded-[14px] text-sm outline-none"
                        style={{
                          backgroundColor: "var(--background)",
                          border: `1px solid ${errors.toCity ? "#ff6b6b" : "var(--border-color)"}`,
                          color: toCity ? "var(--foreground)" : "var(--nav-text-muted)",
                        }}>
                        <option value="">Select</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errors.toCity && <span className="error-text">{errors.toCity}</span>}
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
                    <select value={pickupFloor}
                      onChange={(e) => { setPickupFloor(e.target.value); setErrors((p) => ({ ...p, pickupFloor: undefined })); }}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none mb-1"
                      style={{ backgroundColor: "var(--card-bg)", border: `1px solid ${errors.pickupFloor ? "#ff6b6b" : "var(--border-color)"}`, color: pickupFloor ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select floor</option>
                      {FLOOR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {errors.pickupFloor && <span className="error-text mb-2">{errors.pickupFloor}</span>}
                    <label className="text-[12px] block mb-[6px] mt-2" style={{ color: "var(--nav-text-muted)" }}>Access</label>
                    <select value={pickupAccess}
                      onChange={(e) => { setPickupAccess(e.target.value); setErrors((p) => ({ ...p, pickupAccess: undefined })); }}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                      style={{ backgroundColor: "var(--card-bg)", border: `1px solid ${errors.pickupAccess ? "#ff6b6b" : "var(--border-color)"}`, color: pickupAccess ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select access</option>
                      {ACCESS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {errors.pickupAccess && <span className="error-text">{errors.pickupAccess}</span>}
                  </div>

                  {/* Drop */}
                  <div className="rounded-2xl p-[14px]"
                    style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-color)" }}>
                    <div className="text-[12px] font-bold tracking-[0.4px] uppercase text-[#6de2a6] mb-[10px]">Drop</div>
                    <label className="text-[12px] block mb-[6px]" style={{ color: "var(--nav-text-muted)" }}>Floor</label>
                    <select value={dropFloor}
                      onChange={(e) => { setDropFloor(e.target.value); setErrors((p) => ({ ...p, dropFloor: undefined })); }}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none mb-1"
                      style={{ backgroundColor: "var(--card-bg)", border: `1px solid ${errors.dropFloor ? "#ff6b6b" : "var(--border-color)"}`, color: dropFloor ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select floor</option>
                      {FLOOR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {errors.dropFloor && <span className="error-text mb-2">{errors.dropFloor}</span>}
                    <label className="text-[12px] block mb-[6px] mt-2" style={{ color: "var(--nav-text-muted)" }}>Access</label>
                    <select value={dropAccess}
                      onChange={(e) => { setDropAccess(e.target.value); setErrors((p) => ({ ...p, dropAccess: undefined })); }}
                      className="w-full px-3 py-3 rounded-xl text-[13px] outline-none"
                      style={{ backgroundColor: "var(--card-bg)", border: `1px solid ${errors.dropAccess ? "#ff6b6b" : "var(--border-color)"}`, color: dropAccess ? "var(--foreground)" : "var(--nav-text-muted)" }}>
                      <option value="">Select access</option>
                      {ACCESS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {errors.dropAccess && <span className="error-text">{errors.dropAccess}</span>}
                  </div>
                </div>

                <button
                  className="check-btn w-full mt-2 py-[14px] rounded-[14px] border-none bg-[#2f6eff] text-white font-bold text-[15px] cursor-pointer transition-all duration-200 tracking-[0.2px]"
                  type="button" onClick={handleSubmit} disabled={loading}
                  style={{ opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Submitting..." : "Get Office Relocation Quote"}
                </button>

                {serverError && (
                  <p className="text-center text-[12px] mt-[8px]" style={{ color: "#ff6b6b" }}>
                    {serverError}
                  </p>
                )}

                <p className="text-center text-[12px] mt-[10px]"
                  style={{ color: "var(--nav-text-muted)" }}>
                  Free site survey • No hidden charges
                </p>
              </>
            )}
          </div>
        </section>

        {/* WHY US SECTION */}
        <section className="px-[5%] pt-7 pb-20"
          style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="why-inner max-w-[1280px] mx-auto flex gap-[60px] items-center">
            <div className="flex-1">
              <span className="text-[12px] text-[#4f8fff] font-bold tracking-[3px] uppercase">Why Us</span>
              <h2 className="font-['Sora',sans-serif] text-[clamp(1.8rem,3.2vw,2.8rem)] font-extrabold mt-3 mb-4 leading-[1.2]"
                style={{ color: "var(--foreground)" }}>
                Minimal DownTime,<br />Maximum Safety For Assets.
              </h2>
              <p className="text-[15px] leading-[1.8] max-w-[560px]"
                style={{ color: "var(--nav-text-muted)" }}>
                Our trained office relocation team packs computers, servers,
                documents and furniture in a structured way so everything reaches
                safely and your office starts working from the new location at the earliest.
              </p>
            </div>
            <div className="feature-grid flex-1 grid grid-cols-2 gap-4">
              {[
                { icon: "💻", title: "IT Equipment Safety", desc: "Special handling for computers, servers, printers and networking devices." },
                { icon: "📁", title: "File & Document Care", desc: "Proper cartons and labeling for important documents and records." },
                { icon: "👷", title: "Dedicated Move Manager", desc: "Single point of contact to coordinate entire office move." },
                { icon: "⏱️", title: "Weekend / Night Shifts", desc: "Relocation planned in off-hours so work is not disturbed." },
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
    </>
  );
}
