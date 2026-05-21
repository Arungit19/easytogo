import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import pool from "../../../../lib/db.js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      amount,
      service,
      booking_id,
      quote_id,
      customer_name,
      customer_email,
      customer_phone,
      notes,
    } = body;

    // Validation
    if (!amount || !service) {
      return NextResponse.json(
        { error: "Amount and service are required" },
        { status: 400 }
      );
    }

    // Check Razorpay keys
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("[create-order] Razorpay keys missing in .env.local");
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: "INR",
      receipt:  `rcpt_${Date.now()}`,
      notes:    { service, booking_id, quote_id },
    });

    // Save to DB
    await pool.query(
      `INSERT INTO payments
        (razorpay_order_id, amount, currency, status, service,
         booking_id, quote_id, customer_name, customer_email, customer_phone, notes)
       VALUES ($1,$2,$3,'created',$4,$5,$6,$7,$8,$9,$10)`,
      [
        order.id,
        Math.round(amount * 100),
        "INR",
        service,
        booking_id     || null,
        quote_id       || null,
        customer_name  || null,
        customer_email || null,
        customer_phone || null,
        notes          || null,
      ]
    );

    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });

  } catch (err) {
    // Print full error in terminal
    console.error("[create-order] Full error:", err);
    return NextResponse.json(
      { error: err?.error?.description || err.message || "Order creation failed" },
      { status: 500 }
    );
  }
}