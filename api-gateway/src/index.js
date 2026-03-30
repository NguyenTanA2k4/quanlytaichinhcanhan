/**
 * api-gateway/src/index.js
 * ────────────────────────
 * Cổng duy nhất vào hệ thống finance-assistant.
 *
 * Chức năng:
 *  • Port 8080
 *  • Rate Limiting  – 100 req/phút/IP  (chống DDoS / spam)
 *  • CORS chặt chẽ  – chỉ cho phép origin từ biến ALLOWED_ORIGINS
 *  • Proxy routes   – /api/transactions → transaction-service
 *                     /api/ai           → ai-service
 *  • Health check   – GET /health (không cần auth)
 */

const express              = require("express");
const cors                 = require("cors");
const morgan               = require("morgan");
const rateLimit            = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cfg                  = require("./config");

const app = express();

// ════════════════════════════════════════════════════════════
//  1. CORS – chỉ cho phép đúng origin của frontend
// ════════════════════════════════════════════════════════════
const corsOptions = {
  // origin là hàm → kiểm tra động từng request
  origin(requestOrigin, callback) {
    console.log("👉 Checking CORS origin:", requestOrigin);
    // Cho phép request không có origin (server-to-server, curl, Postman)
    if (!requestOrigin) return callback(null, true);

    if (
      cfg.ALLOWED_ORIGINS.includes(requestOrigin) ||
      requestOrigin.endsWith(".loca.lt") ||
      requestOrigin.endsWith(".trycloudflare.com")
    ) {
      callback(null, true);
    } else {
      callback(
        new Error(`CORS blocked: origin "${requestOrigin}" không được phép`)
      );
    }
  },
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,  // IE11 cần 200 thay vì 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Pre-flight cho mọi route

// ════════════════════════════════════════════════════════════
//  2. Rate Limiting – 100 req / phút / IP
// ════════════════════════════════════════════════════════════
const limiter = rateLimit({
  windowMs: cfg.RATE_LIMIT_WINDOW_MS,    // 60_000 ms = 1 phút
  max:      cfg.RATE_LIMIT_MAX_REQUESTS, // 100 requests

  // Trả về header chuẩn RateLimit-* (RFC 6585)
  standardHeaders: "draft-7",
  legacyHeaders:   false,

  // Thông báo rõ ràng khi bị chặn
  message: {
    error: "TooManyRequests",
    message: `Bạn đã gửi quá ${cfg.RATE_LIMIT_MAX_REQUESTS} requests/phút. Vui lòng thử lại sau.`,
  },

  // Dùng client IP thực qua header X-Forwarded-For (khi đứng sau load balancer)
  keyGenerator: (req) => req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip,
});

// Áp dụng rate limit cho toàn bộ API (ngoại trừ /health sẽ được đặt trước)
app.use("/api", limiter);

// ════════════════════════════════════════════════════════════
//  3. Request Logging
// ════════════════════════════════════════════════════════════
app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

// ════════════════════════════════════════════════════════════
//  4. Health Check (không cần auth, không bị rate limit)
// ════════════════════════════════════════════════════════════
app.get("/health", (_req, res) => {
  res.json({
    status:  "ok",
    service: "api-gateway",
    port:    cfg.PORT,
    uptime:  process.uptime().toFixed(1) + "s",
    ts:      new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════════
//  5. Proxy Middleware – common options
// ════════════════════════════════════════════════════════════
function makeProxy(target, pathRewrite) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      error(err, req, res) {
        console.error(`[Proxy Error] ${req.method} ${req.url} →`, err.message);
        if (!res.headersSent) {
          res.status(502).json({
            error: "BadGateway",
            message: "Downstream service không phản hồi. Vui lòng thử lại.",
          });
        }
      },
      proxyReq(proxyReq, req) {
        // Ghi log request được forward
        console.log(`[Proxy] ${req.method} ${req.url} → ${target}`);
      },
    },
  });
}

// ── Route: /api/transactions  →  transaction-service ──────
app.use(
  "/api/transactions",
  makeProxy(cfg.TRANSACTION_SERVICE_URL, {
    "^/api/transactions": "/api/transactions",
  })
);

// ── Route: /api/auth  →  transaction-service ──────────────
app.use(
  "/api/auth",
  makeProxy(cfg.TRANSACTION_SERVICE_URL, {
    "^/api/auth": "/api/auth",
  })
);

// ── Route: /api/ai  →  ai-service ─────────────────────────
app.use(
  "/api/ai",
  makeProxy(cfg.AI_SERVICE_URL, {
    "^/api/ai": "/ai",
  })
);

// ════════════════════════════════════════════════════════════
//  6. 404 & Global Error Handler
// ════════════════════════════════════════════════════════════
app.use((_req, res) => {
  res.status(404).json({ error: "NotFound", message: "Route không tồn tại" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // CORS error
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ error: "Forbidden", message: err.message });
  }
  console.error("[Gateway Error]", err.message);
  res.status(500).json({ error: "InternalServerError" });
});

// ════════════════════════════════════════════════════════════
//  7. Start Server
// ════════════════════════════════════════════════════════════
app.listen(cfg.PORT, () => {
  console.log("╔══════════════════════════════════════════════╗");
  console.log(`║  🚀 API Gateway running on port ${cfg.PORT}         ║`);
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  CORS allowed origins:                       ║`);
  cfg.ALLOWED_ORIGINS.forEach((o) =>
    console.log(`║    • ${o.padEnd(40)}║`)
  );
  console.log(`║  Rate limit: ${cfg.RATE_LIMIT_MAX_REQUESTS} req/${cfg.RATE_LIMIT_WINDOW_MS / 1000}s per IP          ║`);
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Routes:                                     ║`);
  console.log(`║    /api/transactions → transaction-service   ║`);
  console.log(`║    /api/ai           → ai-service            ║`);
  console.log("╚══════════════════════════════════════════════╝");
});
