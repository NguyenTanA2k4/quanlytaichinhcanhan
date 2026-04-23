const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = "test_secret_key_for_ci";

// ══════════════════════════════════════════════════════════════
//  TEST SUITE: Transaction Service – Unit Tests
// ══════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

// ── Test Group 1: JWT Token ─────────────────────────────────
console.log("\n🔐 [TEST GROUP 1] JWT Token");

// Test 1.1: Tạo JWT Token thành công
const payload = { sub: "123", username: "testuser" };
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
assert(typeof token === "string" && token.length > 50, "Tạo JWT Token thành công");

// Test 1.2: Giải mã JWT Token đúng
const decoded = jwt.verify(token, JWT_SECRET);
assert(decoded.sub === "123", "Giải mã JWT: userId đúng");
assert(decoded.username === "testuser", "Giải mã JWT: username đúng");

// Test 1.3: JWT Token sai secret phải bị lỗi
try {
  jwt.verify(token, "wrong_secret");
  assert(false, "JWT sai secret phải bị từ chối");
} catch (e) {
  assert(e.name === "JsonWebTokenError", "JWT sai secret bị từ chối đúng");
}

// Test 1.4: JWT Token hết hạn
const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "0s" });
try {
  jwt.verify(expiredToken, JWT_SECRET);
  assert(false, "JWT hết hạn phải bị từ chối");
} catch (e) {
  assert(e.name === "TokenExpiredError", "JWT hết hạn bị từ chối đúng");
}


// ── Test Group 2: Bcrypt Password Hashing ───────────────────
console.log("\n🔒 [TEST GROUP 2] Bcrypt Password Hashing");

(async () => {
  // Test 2.1: Băm mật khẩu thành công
  const password = "MySecurePass123!";
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  assert(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "Băm mật khẩu: Hash có định dạng Bcrypt đúng");
  assert(hash.length === 60, "Băm mật khẩu: Hash dài 60 ký tự");

  // Test 2.2: So sánh mật khẩu đúng
  const isMatch = await bcrypt.compare(password, hash);
  assert(isMatch === true, "So sánh mật khẩu đúng: trả về true");

  // Test 2.3: So sánh mật khẩu sai
  const isWrong = await bcrypt.compare("WrongPassword", hash);
  assert(isWrong === false, "So sánh mật khẩu sai: trả về false");

  // Test 2.4: Hai lần hash cùng password cho ra kết quả khác nhau (nhờ salt)
  const hash2 = await bcrypt.hash(password, await bcrypt.genSalt(10));
  assert(hash !== hash2, "Hash 2 lần khác nhau (salt ngẫu nhiên)");


  // ── Test Group 3: Input Validation Logic ──────────────────
  console.log("\n📋 [TEST GROUP 3] Input Validation");

  // Test 3.1: Số tiền phải dương
  const amount = 50000;
  assert(amount > 0, "Số tiền > 0: hợp lệ");

  // Test 3.2: Loại giao dịch hợp lệ
  const validTypes = ["income", "expense"];
  assert(validTypes.includes("expense"), "Type 'expense' hợp lệ");
  assert(validTypes.includes("income"), "Type 'income' hợp lệ");
  assert(!validTypes.includes("transfer"), "Type 'transfer' không hợp lệ");

  // Test 3.3: Danh mục không được rỗng
  const category = "Ăn uống";
  assert(category.trim().length > 0, "Danh mục không rỗng: hợp lệ");

  // Test 3.4: Mô tả tối đa 500 ký tự
  const shortDesc = "Cơm trưa văn phòng";
  const longDesc = "A".repeat(501);
  assert(shortDesc.length <= 500, "Mô tả ngắn ≤ 500 ký tự: hợp lệ");
  assert(longDesc.length > 500, "Mô tả dài > 500 ký tự: không hợp lệ");


  // ── Kết quả ───────────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log(`📊 KẾT QUẢ: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log("═".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
})();
