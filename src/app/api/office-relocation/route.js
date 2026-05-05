import { NextResponse } from "next/server";




export async function GET() {
  const result = await pool.query(`SELECT * FROM office_relocation_requests ORDER BY created_at DESC`);
  return NextResponse.json(result.rows);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      mode,
      city,
      fromCity,
      toCity,
      fromLocation,
      toLocation,
      pickupFloor,
      pickupAccess,
      dropFloor,
      dropAccess,
    } = body;

    // Basic server-side validation
    if (!mode || !pickupFloor || !pickupAccess || !dropFloor || !dropAccess) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (mode === "within" && (!city || !fromLocation || !toLocation)) {
      return NextResponse.json(
        { error: "Missing city or location fields" },
        { status: 400 }
      );
    }

    if (mode === "between" && (!fromCity || !toCity)) {
      return NextResponse.json(
        { error: "Missing city fields" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO office_relocation_requests
        (mode, city, from_city, to_city, from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, created_at`,
      [
        mode,
        city || null,
        fromCity || null,
        toCity || null,
        fromLocation || null,
        toLocation || null,
        pickupFloor,
        pickupAccess,
        dropFloor,
        dropAccess,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Booking submitted successfully",
        bookingId: result.rows[0].id,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}