import { NextResponse } from "next/server";
import db from "../../../../lib/db.js";

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

export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    const { id } = await params;
    const title = body.title?.trim();
    const desc = body.desc?.trim() || body.description?.trim();

    if (body.title !== undefined && !title) {
      return NextResponse.json({ error: "Service title is required." }, { status: 400 });
    }
    if ((body.desc !== undefined || body.description !== undefined) && !desc) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    const result = await db.query(
      `UPDATE services
       SET icon = COALESCE($1, icon),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           tag = CASE WHEN $4::boolean THEN $5 ELSE tag END,
           link = COALESCE($6, link),
           active = COALESCE($7, active),
           display_order = COALESCE($8, display_order),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        body.icon ?? null,
        title ?? null,
        desc ?? null,
        Object.prototype.hasOwnProperty.call(body, "tag"),
        body.tag?.trim() || null,
        body.link?.trim() || null,
        body.active ?? null,
        body.display_order ?? null,
        id,
      ]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, service: mapService(result.rows[0]) });
  } catch (err) {
    console.error("[services] PATCH error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    const result = await db.query("DELETE FROM services WHERE id = $1 RETURNING id", [id]);

    if (!result.rows.length) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[services] DELETE error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

