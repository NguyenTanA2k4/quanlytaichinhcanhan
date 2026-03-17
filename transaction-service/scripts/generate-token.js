/**
 * scripts/generate-token.js
 * ─────────────────────────
 * Tạo JWT test token để gọi các API có bảo mật.
 * Chạy: node scripts/generate-token.js
 *
 * Yêu cầu: JWT_SECRET phải có trong file .env ở thư mục gốc
 */
require("dotenv").config({ path: "../.env" });
const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("❌ JWT_SECRET chưa được set trong file .env");
  process.exit(1);
}

const payload = {
  sub:      "user-001",        // user id
  username: "test_user",
  iat:      Math.floor(Date.now() / 1000),
};

const token = jwt.sign(payload, secret, { expiresIn: "24h" });

console.log("\n✅ JWT Token (hiệu lực 24h):");
console.log("━".repeat(60));
console.log(token);
console.log("━".repeat(60));
console.log("\nSử dụng trong curl:");
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:8001/api/transactions`);
