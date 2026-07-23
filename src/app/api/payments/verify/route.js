import { NextResponse } from "next/server";
import crypto from "crypto";
import pool from "../../../../lib/db.js";

export async function POST(req) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    // Signature verify karo
    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      await pool.query(
        `UPDATE payments SET status='failed' WHERE razorpay_order_id=$1`,
        [razorpay_order_id]
      );
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Payment successful — DB update karo
    await pool.query(
      `UPDATE payments
       SET status='paid',
           razorpay_payment_id=$1,
           razorpay_signature=$2
       WHERE razorpay_order_id=$3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[verify] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}