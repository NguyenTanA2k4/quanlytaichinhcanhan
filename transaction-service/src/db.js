require("dotenv").config();
const { Pool } = require("pg");

/**
 * PostgreSQL Connection Pool
 * ─────────────────────────
 * Dùng Pool thay vì Client đơn lẻ để:
 *  • Tái sử dụng kết nối (không mở/đóng mỗi request)
 *  • Chịu tải tốt hơn – các query chờ kết nối rảnh
 *  • Tự động reconnect khi kết nối bị ngắt
 */
const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || "localhost",
  port:     parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB       || "finance_db",
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max:              20,   // Tối đa 20 kết nối đồng thời
  idleTimeoutMillis: 30000,  // Đóng kết nối nhàn rỗi sau 30s
  connectionTimeoutMillis: 2000, // Timeout khi chờ kết nối
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err.message);
});

/**
 * Khởi tạo bảng transactions nếu chưa tồn tại.
 * Chạy một lần khi service khởi động.
 */
async function initDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS transactions (
      id          SERIAL PRIMARY KEY,
      user_id     VARCHAR(128)   NOT NULL,
      amount      NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      type        VARCHAR(10)    NOT NULL CHECK (type IN ('income', 'expense')),
      category    VARCHAR(100)   NOT NULL,
      description TEXT,
      created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
  `;

  try {
    await pool.query(createTableSQL);
    
    // Upgrade existing schema to support AI classification (Choreography feature)
    try {
      await pool.query('ALTER TABLE transactions ADD COLUMN ai_classified BOOLEAN DEFAULT false');
      await pool.query('ALTER TABLE transactions ADD COLUMN ai_confidence NUMERIC(5,2)');
    } catch (e) {
      // Columns already exist or other benign error
    }

    console.log("✅ Database initialized – table 'transactions' ready");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err.message);
    throw err;
  }
}

module.exports = { pool, initDatabase };
