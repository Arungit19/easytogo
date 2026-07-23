import pool from "../../../lib/db.js";
import { NextResponse } from "next/server";


function generateBookingRef() {
  return `CLN-${Math.floor(100000 + Math.random() * 900000)}`;
}


export async function GET() {
  const result = await pool.query(`SELECT * FROM cleaning_bookings ORDER BY created_at DESC`);
  return NextResponse.json(result.rows);
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      mode,
      city,
      fromLocation,
      toLocation,
      fromCity,
      toCity,
      cleaningType,
      propertyType,
      preferredTime,
      frequency,
    } = body;

    

    // Server-side validation
    if (!cleaningType || !propertyType || !preferredTime || !frequency || !mode) {
      return Response.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (mode === "within" && (!city || !fromLocation || !toLocation)) {
      return Response.json(
        { error: "City and both locations are required for within-city bookings." },
        { status: 400 }
      );
    }

    if (mode === "between" && (!fromCity || !toCity)) {
      return Response.json(
        { error: "Both cities are required for between-city bookings." },
        { status: 400 }
      );
    }

    const bookingRef = generateBookingRef();

    const result = await pool.query(
      `INSERT INTO cleaning_bookings
        (booking_ref, mode, city, from_location, to_location, from_city, to_city,
         cleaning_type, property_type, preferred_time, frequency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, booking_ref, created_at`,
      [
        bookingRef,
        mode,
        city || null,
        fromLocation || null,
        toLocation || null,
        fromCity || null,
        toCity || null,
        cleaningType,
        propertyType,
        preferredTime,
        frequency,
      ]
    );

    const booking = result.rows[0];

    return Response.json(
      {
        success: true,
        bookingRef: booking.booking_ref,
        bookingId: booking.id,
        createdAt: booking.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Booking error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}