import { NextResponse } from "next/server";
import db from "../../../lib/db.js";

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      phone      VARCHAR(40),
      email      VARCHAR(255) NOT NULL,
      message    TEXT NOT NULL,
      status     VARCHAR(30) DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    const result = await db.query(`
      SELECT id, name, phone, email, message, status, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `);
    return NextResponse.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error("[get-in-touch] GET error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureTable();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email and message are required." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO contact_messages (name, phone, email, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, email, message, status, created_at`,
      [name, phone || null, email, message]
    );

    return NextResponse.json({ success: true, message: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[get-in-touch] POST error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
