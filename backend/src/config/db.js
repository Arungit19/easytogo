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

await client.query(`
  CREATE TABLE IF NOT EXISTS tracking_sessions (
    id              SERIAL PRIMARY KEY,
    booking_id      INTEGER NOT NULL,
    service_type    VARCHAR(80) NOT NULL,
    worker_id       INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    origin_lat      NUMERIC(10,7),
    origin_lng      NUMERIC(10,7),
    origin_address  TEXT,
    dest_lat        NUMERIC(10,7),
    dest_lng        NUMERIC(10,7),
    dest_address    TEXT,
    current_lat     NUMERIC(10,7),
    current_lng     NUMERIC(10,7),
    current_address TEXT,
    eta_minutes     INTEGER,
    stage           VARCHAR(80) DEFAULT 'pending',
    status          VARCHAR(30) DEFAULT 'pending',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, service_type)
  );

  CREATE TABLE IF NOT EXISTS tracking_location_history (
    id                  SERIAL PRIMARY KEY,
    tracking_session_id INTEGER NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
    lat                 NUMERIC(10,7) NOT NULL,
    lng                 NUMERIC(10,7) NOT NULL,
    address             TEXT,
    recorded_at         TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tracking_stage_history (
    id                  SERIAL PRIMARY KEY,
    tracking_session_id INTEGER NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
    stage               VARCHAR(80) NOT NULL,
    note                TEXT,
    updated_by          VARCHAR(80),
    changed_at          TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    phone      VARCHAR(40),
    email      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    status     VARCHAR(30) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`);

await client.query(`
  ALTER TABLE IF EXISTS home_shifting_bookings
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS service_type VARCHAR(120),
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE IF EXISTS cleaning_bookings
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE IF EXISTS office_relocation_requests
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE IF EXISTS packing_requests
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE IF EXISTS storage_bookings
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE IF EXISTS vehicle_transport_requests
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
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
