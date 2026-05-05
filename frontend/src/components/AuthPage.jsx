"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, HardHat } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API = `${BASE_URL}/api`;

const handleGoogleLogin = () => {
  window.location.href = `${BASE_URL}/api/auth/google`;
};

const handleFacebookLogin = () => {
  window.location.href = `${BASE_URL}/api/auth/facebook`;
};

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState("login");
  const [loginMethod, setLoginMethod] = useState("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [signupData, setSignupData] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupOtp, setSignupOtp] = useState(["", "", "", "", "", ""]);

  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isValidPhone = (val) => /^[6-9]\d{9}$/.test(val);
  const isValidIdentifier = (val) => isValidEmail(val) || isValidPhone(val);

  const inputCls =
    "w-full border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const primaryBtn =
    "w-full py-2.5 rounded-lg font-semibold uppercase tracking-wide text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm";
  const secondaryBtn =
    "w-full py-2.5 rounded-lg font-semibold text-blue-600 border border-blue-300 hover:bg-blue-50 active:scale-[0.98] transition-all duration-200 text-sm mt-2";
  const toggleActive =
    "flex-1 py-1.5 text-sm font-medium bg-blue-600 text-white transition-colors";
  const toggleInactive =
    "flex-1 py-1.5 text-sm font-medium bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors";

  const redirectByRole = (user) => {
    const role = user?.role || "";
    if (role === "admin" || user?.isAdmin === true) {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  const saveAndRedirect = async (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    try {
      await fetch(`${API}/users/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name || user.fullName || "",
          email: user.email || "",
          phone: user.phone || "",
          avatar: user.picture || user.avatar || "",
          provider: user.provider || "local",
        }),
      });
    } catch (err) {
      console.warn("Profile sync failed:", err);
    }

    redirectByRole(user);
  };

  const handleOtpChange = (val, idx, type = "login") => {
    if (!/^\d?$/.test(val)) return;
    if (type === "login") {
      const n = [...otp]; n[idx] = val; setOtp(n);
      if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
    } else if (type === "signup") {
      const n = [...signupOtp]; n[idx] = val; setSignupOtp(n);
      if (val && idx < 5) document.getElementById(`sotp-${idx + 1}`)?.focus();
    } else if (type === "forgot") {
      const n = [...forgotOtp]; n[idx] = val; setForgotOtp(n);
      if (val && idx < 5) document.getElementById(`fotp-${idx + 1}`)?.focus();
    }
  };

  const handleKeyDown = (e, idx, type = "login") => {
    if (e.key === "Backspace") {
      if (type === "login" && !otp[idx] && idx > 0)
        document.getElementById(`otp-${idx - 1}`)?.focus();
      if (type === "signup" && !signupOtp[idx] && idx > 0)
        document.getElementById(`sotp-${idx - 1}`)?.focus();
      if (type === "forgot" && !forgotOtp[idx] && idx > 0)
        document.getElementById(`fotp-${idx - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e, type) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split("").concat(Array(6).fill("")).slice(0, 6);
    const lastIdx = Math.min(pasted.length - 1, 5);
    if (type === "login") {
      setOtp(digits);
      document.getElementById(`otp-${lastIdx}`)?.focus();
    } else if (type === "signup") {
      setSignupOtp(digits);
      document.getElementById(`sotp-${lastIdx}`)?.focus();
    } else if (type === "forgot") {
      setForgotOtp(digits);
      document.getElementById(`fotp-${lastIdx}`)?.focus();
    }
  };

  const handleLoginSubmit = async () => {
    setError(""); setSuccessMsg("");
    if (!identifier.trim()) { setError("Please enter your email."); return; }
    if (!isValidIdentifier(identifier.trim())) { setError("Enter a valid email."); return; }

    if (loginMethod === "otp") {
      setLoading(true);
      try {
        const body = isValidEmail(identifier)
          ? { email: identifier.trim() }
          : { phone: identifier.trim() };
        const res = await fetch(`${API}/auth/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Failed to send OTP"); return; }
        setSuccessMsg(`OTP sent to ${identifier}`);
        setStep("otp");
      } catch { setError("Server error. Make sure backend is running."); }
      finally { setLoading(false); }
      return;
    }

    if (!password.trim()) { setError("Please enter your password."); return; }
    setLoading(true);
    try {
      const body = isValidEmail(identifier)
        ? { email: identifier.trim(), password }
        : { phone: identifier.trim(), password };
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed"); return; }
      await saveAndRedirect(data.data.token, data.data.user);
    } catch { setError("Server error. Make sure backend is running."); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true);
    try {
      const body = isValidEmail(identifier)
        ? { email: identifier.trim(), otp: code }
        : { phone: identifier.trim(), otp: code };
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "OTP verification failed"); return; }
      await saveAndRedirect(data.data.token, data.data.user);
    } catch { setError("Server error."); }
    finally { setLoading(false); }
  };

  const handleResendOTP = async (emailOrPhone) => {
    setError(""); setSuccessMsg(""); setLoading(true);
    try {
      const body = isValidEmail(emailOrPhone)
        ? { email: emailOrPhone }
        : { phone: emailOrPhone };
      const res = await fetch(`${API}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to resend OTP"); return; }
      setSuccessMsg("OTP resent successfully!");
    } catch { setError("Server error."); }
    finally { setLoading(false); }
  };

  const handleSignupSubmit = async () => {
    setError("");
    const { fullName, email, phone, password, confirmPassword } = signupData;
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim() || !isValidEmail(email)) { setError("Enter a valid email address."); return; }
    if (!phone.trim() || !isValidPhone(phone)) { setError("Enter a valid 10-digit phone number."); return; }
    if (!password.trim() || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || "";
        if (
          msg.toLowerCase().includes("phone") &&
          (msg.toLowerCase().includes("exist") ||
            msg.toLowerCase().includes("already") ||
            msg.toLowerCase().includes("taken"))
        ) {
          setError("__PHONE_EXISTS__");
        } else {
          setError(msg || "Registration failed");
        }
        return;
      }

      if (data.data?.token) {
        setPendingToken(data.data.token);
        setPendingUser(data.data.user);
      }

      try {
        await fetch(`${API}/auth/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setSuccessMsg(`Account created! An OTP has been sent to ${email} for verification (optional).`);
      } catch {
        setSuccessMsg("Account created successfully!");
      }

      setStep("signupOtp");
    } catch { setError("Server error. Make sure backend is running."); }
    finally { setLoading(false); }
  };

  const handleSkipOtp = async () => {
    if (pendingToken && pendingUser) {
      await saveAndRedirect(pendingToken, pendingUser);
    } else {
      setLoading(true);
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: signupData.email, password: signupData.password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Auto-login failed. Please log in manually."); return; }
        await saveAndRedirect(data.data.token, data.data.user);
      } catch { setError("Could not auto-login. Please log in manually."); }
      finally { setLoading(false); }
    }
  };

  const handleVerifySignupOtp = async () => {
    setError("");
    const code = signupOtp.join("");
    if (code.length < 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupData.email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "OTP verification failed"); return; }
      await saveAndRedirect(data.data.token, data.data.user);
    } catch { setError("Server error."); }
    finally { setLoading(false); }
  };

  const handleForgotSubmit = async () => {
    setError("");
    if (!forgotInput.trim()) { setError("Please enter your email."); return; }
    if (!isValidIdentifier(forgotInput.trim())) { setError("Enter a valid email."); return; }
    setLoading(true);
    try {
      const body = isValidEmail(forgotInput)
        ? { email: forgotInput.trim() }
        : { phone: forgotInput.trim() };
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to send reset OTP"); return; }
      setSuccessMsg(`Reset OTP sent to ${forgotInput}`);
      setStep("forgotOtp");
    } catch { setError("Server error."); }
    finally { setLoading(false); }
  };

  const handleVerifyForgotOtp = async () => {
    setError("");
    const code = forgotOtp.join("");
    if (code.length < 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true);
    try {
      const body = isValidEmail(forgotInput)
        ? { email: forgotInput.trim(), otp: code }
        : { phone: forgotInput.trim(), otp: code };
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "OTP verification failed"); return; }
      await saveAndRedirect(data.data.token, data.data.user);
    } catch { setError("Server error."); }
    finally { setLoading(false); }
  };

  const OtpBoxes = ({ values, idPrefix, type }) => (
    <div className="flex gap-2 justify-between mb-4">
      {values.map((digit, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) =>
            handleOtpChange(e.target.value.replace(/[^0-9]/g, ""), i, type)
          }
          onKeyDown={(e) => handleKeyDown(e, i, type)}
          onPaste={(e) => handleOtpPaste(e, type)}
          className="w-10 h-11 border border-blue-300 rounded-lg text-center text-lg text-blue-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ))}
    </div>
  );

  const SocialButtons = () => (
    <>
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">Or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleGoogleLogin}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Google</span>
        </button>
        <button
          onClick={handleFacebookLogin}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#1877F2" d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 11.979 8.776 21.908 20.25 23.708V30.938h-6.094V24h6.094v-5.288c0-6.014 3.583-9.337 9.065-9.337 2.625 0 5.372.469 5.372.469v5.906h-3.026c-2.981 0-3.911 1.85-3.911 3.75V24h6.656l-1.064 6.938H27.75v16.77C39.224 45.908 48 35.979 48 24z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Facebook</span>
        </button>
      </div>
    </>
  );

  // ── Worker Login Button — reusable ───────────────────────────────────────
  const WorkerLoginButton = () => (
    <button
      onClick={() => router.push("/worker/login")}
      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 text-sm font-medium group"
    >
      <HardHat
        size={15}
        className="text-gray-400 group-hover:text-gray-600 transition-colors"
      />
      <span>Login as Worker</span>
    </button>
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-cover bg-center -z-10"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/60 -z-10" />

      <div className="overflow-hidden h-screen flex items-center justify-center px-4 pt-16 pb-4">
        <div className="relative w-full max-w-2xl flex rounded-2xl shadow-2xl overflow-hidden scale-[0.95]">

          {/* LEFT PROMO PANEL */}
          <div className="hidden md:flex w-2/5 bg-gradient-to-b from-blue-800 to-blue-500 flex-col items-center justify-center p-8 text-white relative">
            <button
              onClick={() => router.push("/")}
              className="absolute top-3 left-3 z-20 flex items-center gap-3 px-4 py-1 rounded-full border border-white/70 bg-blue-700/70 backdrop-blur-md text-white text-xs font-medium hover:bg-blue-800/80 hover:scale-105 transition-all duration-200 shadow-md"
            >
              <span>Back</span>
            </button>
            <Image src="/logo.png" alt="logo" width={110} height={90} className="mb-6" />
            <p className="text-sm opacity-90 text-center">Move Smart, Move Easy!</p>
            <h2 className="text-2xl font-bold text-center mt-2">
              Get Up to{" "}
              <span className="bg-white text-blue-700 px-2 rounded font-bold">30% OFF</span>
            </h2>
            <p className="text-sm opacity-90 text-center mt-1">On Your First House Shift</p>

            {/* Worker link on left panel */}
            <button
              onClick={() => router.push("/worker/login")}
              className="absolute bottom-4 flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs transition-colors"
            >
              <HardHat size={12} />
              <span>Worker Portal</span>
            </button>
          </div>

          {/* RIGHT FORM PANEL */}
          <div className="relative w-full md:w-3/5 bg-white/95 backdrop-blur-md">
            <Image
              src="/logo.png"
              alt="logo"
              width={90}
              height={72}
              className="absolute top-3 right-3 z-10 md:hidden"
            />

            <button
              onClick={() => router.push("/")}
              className="absolute top-3 left-3 z-20 flex md:hidden items-center gap-1 px-2.5 py-1 rounded-full border border-white/70 bg-blue-700/70 backdrop-blur-md text-white text-xs font-medium hover:bg-blue-800/80 transition-all duration-200 shadow-md"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div className="md:hidden h-32 bg-gradient-to-r from-blue-800 to-blue-500 flex items-end p-3 text-white">
              <div>
                <p className="text-xs opacity-90">Move Smart, Move Easy!</p>
                <h2 className="text-base font-bold">
                  Get Up to{" "}
                  <span className="bg-white text-blue-700 px-1.5 rounded font-bold">30% OFF</span>
                </h2>
                <p className="text-xs opacity-90">On Your First House Shift</p>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(100vh-140px)]">

              {/* LOGIN */}
              {step === "login" && (
                <>
                  <h2 className="text-lg font-bold text-blue-800 mb-0.5 text-center">Login</h2>
                  <p className="text-center text-xs text-gray-400 mb-3">
                    Enter your email to continue
                  </p>

                  <div className="flex rounded-lg border border-blue-200 overflow-hidden mb-3">
                    <button
                      onClick={() => { setLoginMethod("password"); setError(""); }}
                      className={loginMethod === "password" ? toggleActive : toggleInactive}
                    >
                      Password Login
                    </button>
                    <button
                      onClick={() => { setLoginMethod("otp"); setError(""); }}
                      className={loginMethod === "otp" ? toggleActive : toggleInactive}
                    >
                      OTP Login
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs text-gray-700 mb-1">Email</label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter email"
                      className={inputCls}
                    />
                  </div>

                  {loginMethod === "password" && (
                    <>
                      <div className="mb-2">
                        <label className="block text-xs text-gray-700 mb-1">Password</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className={inputCls}
                        />
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="showPwd"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                            className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                          />
                          <label htmlFor="showPwd" className="text-xs text-gray-600 cursor-pointer">
                            Show Password
                          </label>
                        </div>
                        <button
                          onClick={() => {
                            setStep("forgotPassword");
                            setError("");
                            setForgotInput("");
                            setForgotOtp(["", "", "", "", "", ""]);
                            setSuccessMsg("");
                          }}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </>
                  )}

                  {loginMethod === "otp" && (
                    <p className="text-xs text-gray-400 mb-3">
                      We'll send a 6-digit OTP to your email.
                    </p>
                  )}

                  {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                  {successMsg && <p className="text-green-600 text-xs mb-2">{successMsg}</p>}

                  <button onClick={handleLoginSubmit} disabled={loading} className={primaryBtn}>
                    {loading ? "Please wait..." : loginMethod === "password" ? "Log In" : "Send OTP"}
                  </button>

                  {/* ── WORKER LOGIN BUTTON ── */}
                  <WorkerLoginButton />

                  <SocialButtons />

                  <div className="text-center mt-3 text-xs text-gray-500">
                    Don't have an account?{" "}
                    <button
                      onClick={() => { setStep("signup"); setError(""); setSuccessMsg(""); }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Sign Up
                    </button>
                  </div>
                </>
              )}

              {/* OTP STEP */}
              {step === "otp" && (
                <>
                  <button
                    onClick={() => { setStep("login"); setOtp(["", "", "", "", "", ""]); setError(""); setSuccessMsg(""); }}
                    className="text-blue-600 mb-2 text-xs hover:underline flex items-center gap-1 font-medium"
                  >
                    ← Back to Login
                  </button>
                  <h2 className="text-lg font-bold text-blue-800 mb-0.5">Enter OTP</h2>
                  <p className="text-xs text-gray-400 mb-1">
                    Code sent to <span className="font-medium text-blue-700">{identifier}</span>
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Tip: Copy the OTP and paste it — all boxes fill instantly.
                  </p>
                  <OtpBoxes values={otp} idPrefix="otp" type="login" />
                  {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                  {successMsg && <p className="text-green-600 text-xs mb-2">{successMsg}</p>}
                  <button onClick={handleVerifyOtp} disabled={loading} className={primaryBtn}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Didn't receive OTP?{" "}
                    <button
                      onClick={() => handleResendOTP(identifier)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Resend OTP
                    </button>
                  </p>
                </>
              )}

              {/* SIGN UP */}
              {step === "signup" && (
                <>
                  <button
                    onClick={() => { setStep("login"); setError(""); setSuccessMsg(""); }}
                    className="text-blue-600 mb-2 text-xs hover:underline flex items-center gap-1 font-medium"
                  >
                    ← Back to Login
                  </button>
                  <h2 className="text-lg font-bold text-blue-800 mb-0.5">Create Account</h2>
                  <p className="text-xs text-gray-400 mb-3">
                    Fill in the details below to get started
                  </p>

                  <div className="mb-2">
                    <label className="block text-xs text-gray-700 mb-1">Full Name:</label>
                    <input
                      type="text"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      placeholder="Enter your full name"
                      className={inputCls}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs text-gray-700 mb-1">Email Address:</label>
                    <input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      placeholder="Enter your email"
                      className={inputCls}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-xs text-gray-700 mb-1">Phone Number:</label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-2.5 border border-blue-200 rounded-lg text-xs text-blue-700 bg-blue-50 font-medium">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={signupData.phone}
                        onChange={(e) => {
                          setSignupData({
                            ...signupData,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                          });
                          if (error === "__PHONE_EXISTS__") setError("");
                        }}
                        placeholder="10-digit mobile number"
                        className={`${inputCls} flex-1 ${
                          error === "__PHONE_EXISTS__"
                            ? "border-red-400 focus:ring-red-400"
                            : ""
                        }`}
                      />
                    </div>

                    {error === "__PHONE_EXISTS__" && (
                      <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <span className="text-red-500 text-sm mt-0.5">⚠️</span>
                        <div>
                          <p className="text-xs text-red-600 font-medium">
                            This phone number is already registered.
                          </p>
                          <p className="text-xs text-red-500 mt-0.5">
                            Please use a different number, or{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setStep("login");
                                setError("");
                                setSuccessMsg("");
                              }}
                              className="underline font-semibold text-red-600 hover:text-red-700"
                            >
                              log in to your existing account
                            </button>
                            .
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-2">
                    <label className="block text-xs text-gray-700 mb-1">Password:</label>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className={inputCls}
                    />
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="checkbox"
                        id="showSPwd"
                        checked={showSignupPassword}
                        onChange={(e) => setShowSignupPassword(e.target.checked)}
                        className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                      />
                      <label htmlFor="showSPwd" className="text-xs text-gray-500 cursor-pointer">
                        Show Password
                      </label>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-700 mb-1">Confirm Password:</label>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={signupData.confirmPassword}
                      onChange={(e) =>
                        setSignupData({ ...signupData, confirmPassword: e.target.value })
                      }
                      placeholder="Re-enter your password"
                      className={inputCls}
                    />
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="checkbox"
                        id="showCPwd"
                        checked={showConfirmPassword}
                        onChange={(e) => setShowConfirmPassword(e.target.checked)}
                        className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                      />
                      <label htmlFor="showCPwd" className="text-xs text-gray-500 cursor-pointer">
                        Show Password
                      </label>
                    </div>
                  </div>

                  {error && error !== "__PHONE_EXISTS__" && (
                    <p className="text-red-500 text-xs mb-2">{error}</p>
                  )}
                  {successMsg && <p className="text-green-600 text-xs mb-2">{successMsg}</p>}

                  <button onClick={handleSignupSubmit} disabled={loading} className={primaryBtn}>
                    {loading ? "Please wait..." : "Create Account"}
                  </button>

                  {/* ── WORKER LOGIN BUTTON ── */}
                  <WorkerLoginButton />

                  <SocialButtons />

                  <div className="text-center mt-3 text-xs text-gray-500">
                    Already have an account?{" "}
                    <button
                      onClick={() => { setStep("login"); setError(""); setSuccessMsg(""); }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Login
                    </button>
                  </div>
                </>
              )}

              {/* SIGNUP OTP */}
              {step === "signupOtp" && (
                <>
                  <button
                    onClick={() => {
                      setStep("signup");
                      setSignupOtp(["", "", "", "", "", ""]);
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="text-blue-600 mb-2 text-xs hover:underline flex items-center gap-1 font-medium"
                  >
                    ← Back to Sign Up
                  </button>
                  <h2 className="text-lg font-bold text-blue-800 mb-0.5">Verify Your Account</h2>

                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-green-700 font-medium">
                      🎉 Account created successfully!
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      You can enter the OTP sent to{" "}
                      <span className="font-semibold">{signupData.email}</span> to verify,
                      or skip and start using the app right away.
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 mb-1">
                    Enter the 6-digit code (optional):
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Tip: Copy the OTP and paste it — all boxes fill instantly.
                  </p>
                  <OtpBoxes values={signupOtp} idPrefix="sotp" type="signup" />

                  {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                  {successMsg && <p className="text-green-600 text-xs mb-2">{successMsg}</p>}

                  <button onClick={handleVerifySignupOtp} disabled={loading} className={primaryBtn}>
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>

                  <button onClick={handleSkipOtp} disabled={loading} className={secondaryBtn}>
                    {loading ? "Please wait..." : "Skip Verification & Continue →"}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-3">
                    Didn't receive OTP?{" "}
                    <button
                      onClick={() => handleResendOTP(signupData.email)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Resend OTP
                    </button>
                  </p>
                </>
              )}

              {/* FORGOT PASSWORD */}
              {step === "forgotPassword" && (
                <>
                  <button
                    onClick={() => { setStep("login"); setError(""); setSuccessMsg(""); }}
                    className="text-blue-600 mb-2 text-xs hover:underline flex items-center gap-1 font-medium"
                  >
                    ← Back to Login
                  </button>
                  <h2 className="text-lg font-bold text-blue-800 mb-0.5">Forgot Password</h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Enter your registered email. We'll send you a reset OTP.
                  </p>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-700 mb-1">Email:</label>
                    <input
                      type="text"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      placeholder="Enter your email"
                      className={inputCls}
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                  {successMsg && <p className="text-green-600 text-xs mb-2">{successMsg}</p>}
                  <button onClick={handleForgotSubmit} disabled={loading} className={primaryBtn}>
                    {loading ? "Sending..." : "Send Reset OTP"}
                  </button>
                </>
              )}

              {/* FORGOT OTP */}
              {step === "forgotOtp" && (
                <>
                  <button
                    onClick={() => {
                      setStep("forgotPassword");
                      setForgotOtp(["", "", "", "", "", ""]);
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="text-blue-600 mb-2 text-xs hover:underline flex items-center gap-1 font-medium"
                  >
                    ← Change Email
                  </button>
                  <h2 className="text-lg font-bold text-blue-800 mb-0.5">Enter Reset OTP</h2>
                  <p className="text-xs text-gray-400 mb-1">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-medium text-blue-700">{forgotInput}</span>
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Tip: Copy the OTP and paste it — all boxes fill instantly.
                  </p>
                  <OtpBoxes values={forgotOtp} idPrefix="fotp" type="forgot" />
                  {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
                  {successMsg && <p className="text-green-600 text-xs mb-2">{successMsg}</p>}
                  <button onClick={handleVerifyForgotOtp} disabled={loading} className={primaryBtn}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Didn't receive OTP?{" "}
                    <button
                      onClick={() => handleResendOTP(forgotInput)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Resend OTP
                    </button>
                  </p>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}