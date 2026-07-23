import { NextResponse } from "next/server";
import pool from "../../../lib/db.js";

async function ensureOfficeRelocationSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS office_relocation_requests (
      id             SERIAL PRIMARY KEY,
      mode           VARCHAR(20),
      city           VARCHAR(100),
      from_city      VARCHAR(100),
      to_city        VARCHAR(100),
      from_location  VARCHAR(255),
      to_location    VARCHAR(255),
      pickup_floor   VARCHAR(50),
      pickup_access  VARCHAR(50),
      drop_floor     VARCHAR(50),
      drop_access    VARCHAR(50),
      customer_name  VARCHAR(255),
      customer_phone VARCHAR(20),
      customer_email VARCHAR(255),
      status         VARCHAR(30) DEFAULT 'pending',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE IF EXISTS office_relocation_requests
      ADD COLUMN IF NOT EXISTS mode VARCHAR(20),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS from_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS to_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS from_location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS to_location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pickup_floor VARCHAR(50),
      ADD COLUMN IF NOT EXISTS pickup_access VARCHAR(50),
      ADD COLUMN IF NOT EXISTS drop_floor VARCHAR(50),
      ADD COLUMN IF NOT EXISTS drop_access VARCHAR(50),
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS service_type VARCHAR(120),
      ADD COLUMN IF NOT EXISTS user_id INTEGER,
      ADD COLUMN IF NOT EXISTS worker_id INTEGER,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
}

export async function GET() {
  try {
    await ensureOfficeRelocationSchema();
    const result = await pool.query(`SELECT * FROM office_relocation_requests ORDER BY created_at DESC`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[office-relocation] GET error:", error.message, "| code:", error.code);
    return NextResponse.json(
      { error: error.message || "Internal server error", code: error.code },
      { status: 500 }
    );
  }
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
      customer_name,
      customer_phone,
      customer_email,
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

    await ensureOfficeRelocationSchema();

    const result = await pool.query(
      `INSERT INTO office_relocation_requests
        (mode, city, from_city, to_city, from_location, to_location,
         pickup_floor, pickup_access, drop_floor, drop_access,
         customer_name, customer_phone, customer_email, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')
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
        customer_name || null,
        customer_phone || null,
        customer_email || null,
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
    console.error(
      "[office-relocation] POST error:", error.message,
      "| code:", error.code,
      "| constraint:", error.constraint,
      "| detail:", error.detail
    );
    const message = error.code === "ECONNREFUSED"
      ? "Database connection failed. Please make sure PostgreSQL is running."
      : error.message || "Something went wrong. Please try again.";
    return NextResponse.json(
      { error: message, code: error.code, constraint: error.constraint },
      { status: 500 }
    );
  }
}
