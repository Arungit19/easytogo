import { NextResponse } from "next/server";
import pool from "../../../lib/db.js";

export async function GET() {
  const result = await pool.query(`SELECT * FROM storage_bookings ORDER BY created_at DESC`);
  return NextResponse.json(result.rows);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      city,
      address,
      service_type,
      property_type,
      preferred_date,
      time_slot,
      customer_name,
      customer_phone,
      customer_email,
    } = body;

    // Validation
    if (!city)          return NextResponse.json({ error: "City is required" }, { status: 400 });
    if (!address)       return NextResponse.json({ error: "Address is required" }, { status: 400 });
    if (!service_type)  return NextResponse.json({ error: "Service type is required" }, { status: 400 });
    if (!property_type) return NextResponse.json({ error: "Property type is required" }, { status: 400 });
    if (!preferred_date) return NextResponse.json({ error: "Preferred date is required" }, { status: 400 });
    if (!time_slot)     return NextResponse.json({ error: "Time slot is required" }, { status: 400 });

    const result = await pool.query(
      `INSERT INTO storage_bookings
        (city, address, service_type, property_type, preferred_date, time_slot,
         customer_name, customer_phone, customer_email, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',NOW())
       RETURNING id, created_at`,
      [
        city,
        address,
        service_type,
        property_type,
        preferred_date,
        time_slot,
        customer_name  || null,
        customer_phone || null,
        customer_email || null,
      ]
    );

    return NextResponse.json(
      { success: true, bookingId: result.rows[0].id },
      { status: 201 }
    );
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}