import { NextResponse } from "next/server";
import pool from "../../../../lib/db.js";

const SERVICE_TABLE = {
  "Home Shifting":       "home_shifting_quotes",
  "Cleaning":            "cleaning_bookings",
  "Office Relocation":   "office_relocation_requests",
  "Packing & Unpacking": "packing_requests",
  "Storage":             "storage_bookings",
  "Vehicle Transport":   "vehicle_transport_requests",
};

const VALID_STATUS = ["pending", "in_progress", "completed", "cancelled"];

// Tables that don't have status column yet — auto-add it
async function ensureStatusColumn(table) {
  await pool.query(`
    ALTER TABLE ${table}
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  `);
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const numId = Number(id);

    if (!id || isNaN(numId))
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

    const { status, service } = await req.json();

    if (!VALID_STATUS.includes(status))
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${VALID_STATUS.join(", ")}` },
        { status: 400 }
      );

    const table = SERVICE_TABLE[service];
    if (!table)
      return NextResponse.json(
        { error: `Invalid service: ${service}` },
        { status: 400 }
      );

    // Auto-add status column if missing (safe, runs only if needed)
    await ensureStatusColumn(table);

    // Check record exists
    const check = await pool.query(
      `SELECT id FROM ${table} WHERE id = $1`,
      [numId]
    );
    if (check.rowCount === 0)
      return NextResponse.json(
        { error: `ID=${numId} not found in ${table}` },
        { status: 404 }
      );

    // Update status
    const result = await pool.query(
      `UPDATE ${table} SET status = $1 WHERE id = $2 RETURNING *`,
      [status, numId]
    );

    return NextResponse.json(result.rows[0]);

  } catch (err) {
    console.error("[quotes] PATCH error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}