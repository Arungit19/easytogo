import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 1920,
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "1920",
  database: process.env.DB_NAME     || "shifting_app_db",
});

export default pool;