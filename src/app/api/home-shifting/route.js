import { NextResponse } from "next/server";
import pool from "../../../lib/db.js";

const SERVICE_TYPE_MAP = {
  "1 BHK":                 "1bhk",
  "2 BHK":                 "2bhk",
  "3 BHK":                 "3bhk",
  "4 BHK":                 "4bhk",
  "Apartment / Full Home": "apartment",
};

const ACCESS_MAP = {
  "With Lift":         "lift",
  "Without Lift":      "no_lift",
  "Narrow Stairs":     "stairs",
  "Easy Truck Access": "easy_access",
};


export async function GET() {
  const result = await pool.query(`SELECT * FROM home_shifting_bookings ORDER BY created_at DESC`);
  return NextResponse.json(result.rows);
}


export async function POST(req) {
  try {
    const body = await req.json();

    const {
      refId,
      mode,
      serviceType,
      city,
      fromPlace,
      toPlace,
      pickupFloor,
      pickupAccess,
      dropFloor,
      dropAccess,
    } = body;

    if (!serviceType)
      return NextResponse.json({ error: "Service type is required." }, { status: 400 });

    if (!mode || !["within", "between"].includes(mode))
      return NextResponse.json({ error: "Invalid booking mode." }, { status: 400 });

    if (!fromPlace)
      return NextResponse.json({ error: "From location is required." }, { status: 400 });

    if (!toPlace)
      return NextResponse.json({ error: "To location is required." }, { status: 400 });

    if (mode === "within" && !city)
      return NextResponse.json({ error: "City is required." }, { status: 400 });

    if (mode === "between" && fromPlace === toPlace)
      return NextResponse.json({ error: "From and To cities cannot be the same." }, { status: 400 });

    if (!pickupFloor)
      return NextResponse.json({ error: "Pickup floor is required." }, { status: 400 });
    if (!pickupAccess)
      return NextResponse.json({ error: "Pickup access is required." }, { status: 400 });
    if (!dropFloor)
      return NextResponse.json({ error: "Drop floor is required." }, { status: 400 });
    if (!dropAccess)
      return NextResponse.json({ error: "Drop access is required." }, { status: 400 });

    const dbServiceType  = SERVICE_TYPE_MAP[serviceType];
    const dbPickupAccess = ACCESS_MAP[pickupAccess];
    const dbDropAccess   = ACCESS_MAP[dropAccess];

    if (!dbServiceType)
      return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
    if (!dbPickupAccess || !dbDropAccess)
      return NextResponse.json({ error: "Invalid access type." }, { status: 400 });

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const bookingResult = await client.query(
        `INSERT INTO home_shifting_bookings (
          ref_id,
          mode,
          city,
          from_place,
          to_place,
          pickup_floor,
          pickup_access,
          drop_floor,
          drop_access,
          service_type
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10
        )
        RETURNING id, created_at`,
        [
          refId,
          mode,
          city      || null,
          fromPlace,
          toPlace,
          pickupFloor,
          dbPickupAccess,
          dropFloor,
          dbDropAccess,
          dbServiceType,
        ]
      );

      const bookingId = bookingResult.rows[0].id;

      const quoteResult = await client.query(
        `INSERT INTO home_shifting_quotes (
          mode,
          city,
          from_location,
          to_location,
          from_city,
          to_city,
          pickup_floor,
          pickup_access,
          drop_floor,
          drop_access,
          status,
          service_type
        ) VALUES (
          $1,  $2,  $3,  $4,  $5,
          $6,  $7,  $8,  $9,  $10,
          $11, $12
        )
        RETURNING id, created_at`,
        [
          mode,
          city      || null,
          mode === "within"  ? fromPlace : null,
          mode === "within"  ? toPlace   : null,
          mode === "between" ? fromPlace : null,
          mode === "between" ? toPlace   : null,
          pickupFloor,
          dbPickupAccess,
          dropFloor,
          dbDropAccess,
          "pending",
          dbServiceType,
        ]
      );

      const quoteId = quoteResult.rows[0].id;

      await client.query("COMMIT");

      return NextResponse.json(
        { success: true, bookingId, quoteId, createdAt: bookingResult.rows[0].created_at },
        { status: 201 }
      );

    } catch (txErr) {
      await client.query("ROLLBACK");
      console.error(
        "[home-shifting] TX error:", txErr.message,
        "| code:", txErr.code,
        "| constraint:", txErr.constraint,
        "| detail:", txErr.detail
      );
      return NextResponse.json(
        { error: txErr.message, code: txErr.code, constraint: txErr.constraint },
        { status: 500 }
      );
    } finally {
      client.release();
    }

  } catch (err) {
    console.error("[home-shifting] Request error:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}