import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host:     "localhost",
  port:     1920,
  user:     "postgres",
  password: "1920",
  database: "shifting_app_db",
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Connection failed:", err.message);
  } else {
    console.log("✅ Connected! Server time:", res.rows[0].now);
  }
  pool.end();
});