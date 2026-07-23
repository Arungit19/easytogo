import { NextResponse } from "next/server";
import pool from "../../../lib/db.js";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT * FROM payments ORDER BY created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[payments] GET error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}