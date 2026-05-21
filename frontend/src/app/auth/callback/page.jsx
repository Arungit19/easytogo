"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API = `${BASE_URL}/api`;

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Google login failed. Please try again.");
      setTimeout(() => router.push("/login"), 3000);
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("No token received. Redirecting...");
      setTimeout(() => router.push("/login"), 3000);
      return;
    }

    const handleCallback = async () => {
      try {
        const base64Payload = token.split(".")[1];
        const payload = JSON.parse(atob(base64Payload));

        localStorage.setItem("token", token);

        let user = null;
        try {
          const res = await fetch(`${API}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            user = data.data || data.user || data;
          }
        } catch {
          // fallback to token payload
        }

        if (!user) {
          user = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
          };
        }

        localStorage.setItem("user", JSON.stringify(user));
        setStatus("success");

        const role = user?.role || payload?.role || "";
        if (role === "admin" || user?.isAdmin === true) {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setStatus("error");
        setMessage("Something went wrong. Redirecting to login...");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
        {status === "loading" && (
          <>
            <div className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <p className="text-blue-800 font-semibold text-lg">Signing you in...</p>
            <p className="text-gray-400 text-sm text-center">
              Please wait while we complete your login.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-700 font-semibold text-lg">Login Successful!</p>
            <p className="text-gray-400 text-sm text-center">Redirecting you now...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 font-semibold text-lg">Login Failed</p>
            <p className="text-gray-400 text-sm text-center">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
