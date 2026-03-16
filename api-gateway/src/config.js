/**
 * api-gateway/src/config.js
 * ─────────────────────────
 * Tập trung toàn bộ cấu hình vào một nơi.
 * Đọc từ biến môi trường (file .env ở root dự án).
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

module.exports = {
  PORT: parseInt(process.env.GATEWAY_PORT || "8080"),

  // ── Downstream Services ──────────────────────────────────
  TRANSACTION_SERVICE_URL:
    process.env.TRANSACTION_SERVICE_URL || "http://transaction-service:8001",
  AI_SERVICE_URL:
    process.env.AI_SERVICE_URL || "http://ai-service:8002",

  // ── CORS ────────────────────────────────────────────────
  // Chỉ cho phép frontend truy cập. Nhiều origin thì thêm vào mảng.
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost,http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),

  // ── Rate Limiting ────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS:    60 * 1000, // 1 phút
  RATE_LIMIT_MAX_REQUESTS: 100,       // 100 req/phút/IP
};
