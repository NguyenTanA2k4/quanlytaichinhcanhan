const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware xác thực JWT.
 *
 * Client phải gửi header:
 *   Authorization: Bearer <token>
 *
 * Nếu token hợp lệ, req.user sẽ chứa payload đã giải mã.
 * Nếu không, trả về 401 Unauthorized.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header. Format: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Gắn payload vào request để dùng ở route handler
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token đã hết hạn"
        : "Token không hợp lệ";

    return res.status(401).json({ error: "Unauthorized", message });
  }
}

module.exports = { authenticate };
