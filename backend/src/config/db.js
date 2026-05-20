const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 1920,
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "1920",
  database: process.env.DB_NAME     || "shifting_app_db",
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL       PRIMARY KEY,
        name        VARCHAR(255),
        email       VARCHAR(255) UNIQUE,
        phone       VARCHAR(20)  UNIQUE,
        password    TEXT,
        avatar      TEXT,
        provider    VARCHAR(50)  DEFAULT 'local',
        role        VARCHAR(20)  DEFAULT 'user',
        is_verified BOOLEAN      DEFAULT FALSE,
        created_at  TIMESTAMP    DEFAULT NOW(),
        updated_at  TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS otps (
        id         SERIAL       PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        otp        VARCHAR(10)  NOT NULL,
        expires_at TIMESTAMP    NOT NULL,
        created_at TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS home_shifting_bookings (
        id             SERIAL       PRIMARY KEY,
        ref_id         VARCHAR(20)  UNIQUE NOT NULL,
        mode           VARCHAR(20)  NOT NULL,
        city           VARCHAR(100),
        from_place     VARCHAR(255) NOT NULL,
        to_place       VARCHAR(255) NOT NULL,
        pickup_floor   VARCHAR(50),
        pickup_access  VARCHAR(50),
        drop_floor     VARCHAR(50),
        drop_access    VARCHAR(50),
        created_at     TIMESTAMP    DEFAULT NOW()
      );
    `);

    // initDB ke andar, existing CREATE TABLE ke baad add karo:

// 1. Workers table
await client.query(`
  CREATE TABLE IF NOT EXISTS workers (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    email            VARCHAR(200) NOT NULL UNIQUE,
    phone            VARCHAR(15)  NOT NULL,
    password         TEXT         NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    city             VARCHAR(100) NOT NULL,
    avail_from       VARCHAR(10)  DEFAULT '09:00',
    avail_to         VARCHAR(10)  DEFAULT '18:00',
    status           VARCHAR(20)  DEFAULT 'pending',
    is_active        BOOLEAN      DEFAULT true,   -- ← LOGIN FIX
    total_jobs       INTEGER      DEFAULT 0,
    rating           NUMERIC(3,2) DEFAULT 0,
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  DEFAULT NOW()
  );
`);

// 2. Worker bookings junction table
await client.query(`
  CREATE TABLE IF NOT EXISTS worker_bookings (
    id          SERIAL PRIMARY KEY,
    worker_id   INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    booking_id  INTEGER NOT NULL,
    service     VARCHAR(100),
    action      VARCHAR(20) DEFAULT 'accepted',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, booking_id)
  );
`);

    const hash = await bcrypt.hash("admin@123", 10);

    await client.query(
      `INSERT INTO users (name, email, password, role, is_verified, provider)
       VALUES ('Admin', 'admin@easytogo.com', $1, 'admin', TRUE, 'local')
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;`,
      [hash]
    );

    console.log("✅ DB ready  |  Admin → admin@easytogo.com / admin@123");
  } catch (err) {
    console.error("❌ DB init error:", err.message);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };