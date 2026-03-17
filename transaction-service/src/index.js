require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const morgan     = require("morgan");
const { initDatabase, pool } = require("./db");
const { connectRabbitMQ, consumeAIResults } = require("./rabbitmq");
const transactionRoutes = require("./routes/transactions");

const app  = express();
const PORT = process.env.PORT || 8001;

// ── Global Middleware ─────────────────────────────────────
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// ── Health check (không cần JWT) ─────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:  "ok",
    service: "transaction-service",
    ts:      new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────
app.use("/api/transactions", transactionRoutes);

// ── 404 fallback ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route không tồn tại" });
});

// ── Global error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ── Bootstrap ─────────────────────────────────────────────
async function start() {
  try {
    // 1. Khởi tạo DB (tạo bảng nếu chưa có)
    await initDatabase();

    // 2. Kết nối RabbitMQ (không chặn nếu MQ chưa sẵn sàng)
    await connectRabbitMQ();
    
    // 3. Khởi động AI Consumer
    await consumeAIResults(pool);

    // 4. Khởi động HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Transaction Service running on port ${PORT}`);
      console.log(`   POST /api/transactions  – Thêm giao dịch (JWT required)`);
      console.log(`   GET  /api/transactions  – Lấy danh sách (JWT required)`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  }
}

start();
