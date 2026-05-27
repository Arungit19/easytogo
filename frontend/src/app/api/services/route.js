import { NextResponse } from "next/server";
import db from "../../../lib/db.js";
import { DEFAULT_SERVICES } from "../../../lib/serviceDefaults.js";

async function ensureServicesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      icon VARCHAR(20) NOT NULL DEFAULT '',
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      tag VARCHAR(80),
      link VARCHAR(255),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const { rows } = await db.query("SELECT COUNT(*)::int AS count FROM services");
  if (rows[0]?.count === 0) {
    for (const service of DEFAULT_SERVICES) {
      await db.query(
        `INSERT INTO services (icon, title, description, tag, link, active, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          service.icon,
          service.title,
          service.desc,
          service.tag || null,
          service.link || null,
          service.active,
          service.display_order,
        ]
      );
    }
  }
}

const mapService = (service) => ({
  id: service.id,
  icon: service.icon,
  title: service.title,
  desc: service.description,
  tag: service.tag,
  link: service.link || "#services",
  active: service.active,
  bookings: Number(service.bookings || 0),
  revenue: service.revenue || "Rs 0",
  display_order: service.display_order,
  created_at: service.created_at,
  updated_at: service.updated_at,
});

export async function GET(req) {
  try {
    await ensureServicesTable();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";
    const result = await db.query(
      `SELECT *
       FROM services
       ${activeOnly ? "WHERE active = TRUE" : ""}
       ORDER BY display_order ASC, id ASC`
    );

    return NextResponse.json({
      success: true,
      services: result.rows.map(mapService),
    });
  } catch (err) {
    console.error("[services] GET error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureServicesTable();
    const body = await req.json();
    const title = body.title?.trim();
    const desc = body.desc?.trim() || body.description?.trim();

    if (!title) {
      return NextResponse.json({ error: "Service title is required." }, { status: 400 });
    }
    if (!desc) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    const orderResult = await db.query("SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM services");
    const displayOrder = Number(body.display_order || orderResult.rows[0].next_order);

    const result = await db.query(
      `INSERT INTO services (icon, title, description, tag, link, active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.icon || "\u{1F6E0}\uFE0F",
        title,
        desc,
        body.tag?.trim() || null,
        body.link?.trim() || "#services",
        body.active ?? true,
        displayOrder,
      ]
    );

    return NextResponse.json({ success: true, service: mapService(result.rows[0]) }, { status: 201 });
  } catch (err) {
    console.error("[services] POST error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

