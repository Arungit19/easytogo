require("dotenv").config();
const app              = require("./src/app");
const { pool, initDB } = require("./src/config/db");

const PORT = process.env.PORT || 5000;

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded ✓" : "MISSING ✗");

(async () => {
  try {
    await initDB();           // create tables if not exist
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err.message);
    process.exit(1);
  }
})();