// app/api/payments/cod/route.js
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function POST(request) {
  try {
    const body = await request.json();

    // Forward the request to your Express backend
    const res = await fetch(`${BACKEND_URL}/api/payments/cod`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the Authorization header from the original request
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);

  } catch (err) {
    console.error("COD route error:", err.message);
    return NextResponse.json(
      { error: "Internal server error: " + err.message },
      { status: 500 }
    );
  }
}