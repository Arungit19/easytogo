import { NextResponse } from "next/server";
import pool from "../../../lib/db.js";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        'Home Shifting' AS service,
        mode,
        city,
        from_location AS from_loc,
        to_location   AS to_loc,
        status,
        created_at
      FROM home_shifting_quotes

      UNION ALL

      SELECT 
        id,
        'Cleaning' AS service,
        mode,
        city,
        from_location,
        to_location,
        NULL AS status,
        created_at
      FROM cleaning_bookings

      UNION ALL

      SELECT 
        id,
        'Office Relocation' AS service,
        mode,
        city,
        from_location,
        to_location,
        NULL AS status,
        created_at
      FROM office_relocation_requests

      UNION ALL

      SELECT 
        id,
        'Packing & Unpacking' AS service,
        mode,
        city,
        from_location,
        to_location,
        NULL AS status,
        created_at
      FROM packing_requests

      UNION ALL

      SELECT 
        id,
        'Storage' AS service,
        mode,
        city,
        from_location,
        to_location,
        NULL AS status,
        created_at
      FROM storage_bookings

      UNION ALL

      SELECT 
        id,
        'Vehicle Transport' AS service,
        mode,
        city,
        from_location,
        to_location,
        NULL AS status,
        created_at
      FROM vehicle_transport_requests

      ORDER BY created_at DESC
    `);

    return NextResponse.json(result.rows);

  } catch (err) {
    console.error("[all-quotes] GET error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}