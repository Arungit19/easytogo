import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SERVICE_MAP = {
  "Home Shifting":       "home-shifting",
  "Cleaning":            "cleaning-booking",
  "Office Relocation":   "office-relocation",
  "Packing & Unpacking": "packing",
  "Storage":             "storage-booking",
  "Vehicle Transport":   "vehicle-transport",
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { bookingId, service, workerId, workerName, workerPhone } = body;

    const token = req.headers.get("authorization");
    const slug  = SERVICE_MAP[service];

    if (!slug) {
      return NextResponse.json({ message: "Unknown service type" }, { status: 400 });
    }

    const backendRes = await fetch(`${BASE_URL}/api/${slug}/${bookingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({
        status:       "confirmed",
        worker_id:    workerId,
        worker_name:  workerName,
        worker_phone: workerPhone,
      }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data.message || "Backend rejected the update" },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("accept-booking error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}