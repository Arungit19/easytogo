import { NextResponse } from "next/server";
import pool from "../../../lib/db.js";


export async function GET() {
 const result = await pool.query(`SELECT * FROM vehicle_transport_requests ORDER BY created_at DESC`);
  return NextResponse.json(result.rows);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      mode, city, fromCity, toCity,
      fromLocation, toLocation, vehicleType, transportMode,
    } = body;

    // Basic validation
    if (!vehicleType) {
      return NextResponse.json(
        { error: "Vehicle type is required" },
        { status: 400 }
      );
    }
    if (mode === "within" && !city) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      );
    }
    if (mode === "between" && (!fromCity || !toCity)) {
      return NextResponse.json(
        { error: "From and To cities are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO vehicle_transport_requests
        (mode, city, from_city, to_city, from_location, to_location, vehicle_type, transport_mode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, created_at`,
      [mode, city || null, fromCity || null, toCity || null,
       fromLocation || null, toLocation || null, vehicleType, transportMode || null]
    );

    return NextResponse.json(
      { success: true, id: result.rows[0].id },
      { status: 201 }
    );
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}