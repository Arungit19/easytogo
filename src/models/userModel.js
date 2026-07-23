const { pool } = require("../config/db");

const User = {

  findByEmailOrPhone: async (identifier) => {
    const { rows } = await pool.query(
      `SELECT * FROM users
       WHERE email = $1 OR phone = $1
       LIMIT 1`,
      [identifier]
    );
    console.log("🔍 findByEmailOrPhone query result rows:", rows.length);
    return rows[0] || null;
  },

  findByEmail: async (email) => {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  findByPhone: async (phone) => {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE phone = $1 LIMIT 1`,
      [phone]
    );
    return rows[0] || null;
  },

  findById: async (id) => {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, avatar, role, provider, is_verified, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  create: async ({ name, email, phone, password, provider = "local", role = "user" }) => {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password, provider, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role, provider, is_verified, created_at`,
      [name, email || null, phone || null, password, provider, role]
    );
    return rows[0];
  },

  upsertProfile: async ({ name, email, phone, avatar, provider }) => {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, avatar, provider, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (email) DO UPDATE
         SET name       = COALESCE(EXCLUDED.name, users.name),
             phone      = COALESCE(EXCLUDED.phone, users.phone),
             avatar     = COALESCE(EXCLUDED.avatar, users.avatar),
             provider   = EXCLUDED.provider,
             updated_at = NOW()
       RETURNING id, name, email, phone, avatar, role, provider, is_verified`,
      [name || null, email || null, phone || null, avatar || null, provider || "local"]
    );
    return rows[0];
  },

  verify: async (identifier) => {
    await pool.query(
      `UPDATE users SET is_verified = TRUE, updated_at = NOW()
       WHERE email = $1 OR phone = $1`,
      [identifier]
    );
  },

  getAll: async () => {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, avatar, role, provider, is_verified, created_at
       FROM users ORDER BY created_at DESC`
    );
    return rows;
  },

  update: async (id, fields) => {
    const { name, phone, avatar } = fields;
    const { rows } = await pool.query(
      `UPDATE users
       SET name       = COALESCE($1, name),
           phone      = COALESCE($2, phone),
           avatar     = COALESCE($3, avatar),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, phone, avatar, role, is_verified`,
      [name, phone, avatar, id]
    );
    return rows[0];
  },

  delete: async (id) => {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  },
};

module.exports = User;