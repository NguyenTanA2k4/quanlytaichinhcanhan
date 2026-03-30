const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db");

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/register
// ═══════════════════════════════════════════════════════════════
router.post(
  "/register",
  [
    body("username").trim().isLength({ min: 3 }).withMessage("Username ít nhất 3 ký tự"),
    body("password").isLength({ min: 6 }).withMessage("Password ít nhất 6 ký tự"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      // Kiểm tra username tồn tại chưa
      const userCheck = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
      }

      // Hash mật khẩu
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Lưu DB
      const result = await pool.query(
        "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
        [username, passwordHash]
      );

      const newUser = result.rows[0];

      // Tạo JWT
      const token = jwt.sign(
        { sub: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: "10d" }
      );

      res.status(201).json({
        message: "Đăng ký thành công",
        user: newUser,
        token,
      });
    } catch (err) {
      console.error("Register Error:", err.message);
      res.status(500).json({ error: "Lỗi Server" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/login
// ═══════════════════════════════════════════════════════════════
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Vui lòng nhập Username"),
    body("password").notEmpty().withMessage("Vui lòng nhập Password"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không đúng" });
      }

      const user = result.rows[0];

      // Kiểm tra Hash
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không đúng" });
      }

      // Tạo JWT Token
      const token = jwt.sign(
        { sub: user.id.toString(), username: user.username },
        JWT_SECRET,
        { expiresIn: "10d" }
      );

      res.status(200).json({
        message: "Đăng nhập thành công",
        user: { id: user.id, username: user.username },
        token,
      });
    } catch (err) {
      console.error("Login Error:", err.message);
      res.status(500).json({ error: "Lỗi Server" });
    }
  }
);

module.exports = router;
