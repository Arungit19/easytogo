import { NextResponse } from "next/server";
import db from "../../../lib/db.js";

export async function GET() {
  const result = await db.query(`
    SELECT id, name, email, phone, role, provider,
           city, state, pincode, current_address, preferred_contact, created_at
    FROM users ORDER BY created_at DESC
  `);
  return NextResponse.json(result.rows);
}