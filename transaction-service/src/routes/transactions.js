const { Router } = require("express");
const { body, query, validationResult } = require("express-validator");
const { pool } = require("../db");
const { redisClient } = require("../redis");
const { publishTransaction } = require("../rabbitmq");
const { authenticate } = require("../middleware/auth");

const router = Router();

// ── Áp dụng JWT trên toàn bộ router ─────────────────────────
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
//  POST /api/transactions
//  Thêm giao dịch mới + publish nội dung text vào RabbitMQ
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  [
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("amount phải là số dương"),
    body("type")
      .isIn(["income", "expense"])
      .withMessage("type phải là 'income' hoặc 'expense'"),
    body("category")
      .trim()
      .notEmpty()
      .withMessage("category không được để trống"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("description tối đa 500 ký tự"),
  ],
  async (req, res) => {
    // Kiểm tra lỗi validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, type, category, description } = req.body;

    // Lấy user_id từ JWT payload (đã xác thực bởi middleware)
    const userId = req.user.sub || req.user.id || req.user.userId;

    if (!userId) {
      return res.status(400).json({ error: "JWT thiếu trường user id (sub/id/userId)" });
    }

    // ── Parameterized Query – CHỐNG SQL INJECTION ─────────────
    // Giá trị người dùng truyền vào luôn ở dạng tham số $1, $2, ...
    // và KHÔNG BAO GIỜ được nối trực tiếp vào chuỗi SQL.
    const insertSQL = `
      INSERT INTO transactions (user_id, amount, type, category, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    try {
      const { rows } = await pool.query(insertSQL, [
        userId,
        amount,
        type,
        category,
        description || null,
      ]);

      const newTransaction = rows[0];

      // ── Publish sang RabbitMQ ─────────────────────────────
      publishTransaction({
        transactionId: newTransaction.id,
        userId,
        amount: newTransaction.amount,
        type,
        category,
        description: description || "",
        createdAt: newTransaction.created_at,
      });

      // ── XÓA BỘ ĐỆM REDIS CỦA USER NÀY ĐỂ TRANG MỚI ĐƯỢC CẬP NHẬT GIAO DỊCH
      try {
        const keys = await redisClient.keys(`tx:${userId}:*`);
        if (keys.length > 0) {
          await redisClient.del(keys);
          console.log(`[REDIS] Xóa ${keys.length} cache keys cũ của user ${userId} do có dữ liệu mới.`);
        }
      } catch (redisErr) {
        console.error("Redis Cache Invalidation error:", redisErr);
      }

      return res.status(201).json({
        message: "Giao dịch đã được tạo thành công",
        transaction: newTransaction,
      });
    } catch (err) {
      console.error("DB error (POST /transactions):", err.message);
      return res.status(500).json({ error: "Lỗi server", detail: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  GET /api/transactions
//  Lấy danh sách giao dịch của user (phân trang)
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit phải từ 1–100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("offset phải >= 0"),
    query("type")
      .optional()
      .isIn(["income", "expense"])
      .withMessage("type phải là 'income' hoặc 'expense'"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.sub || req.user.id || req.user.userId;
    const limit  = parseInt(req.query.limit  || "20");
    const offset = parseInt(req.query.offset || "0");
    const type   = req.query.type;

    // ── Parameterized Query – CHỐNG SQL INJECTION ─────────────
    let selectSQL;
    let params;

    if (type) {
      selectSQL = `
        SELECT * FROM transactions
        WHERE user_id = $1 AND type = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;
      params = [userId, type, limit, offset];
    } else {
      selectSQL = `
        SELECT * FROM transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, limit, offset];
    }

    // Tổng số bản ghi (để phân trang phía client)
    const countSQL = type
      ? `SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = $2`
      : `SELECT COUNT(*) FROM transactions WHERE user_id = $1`;
    const countParams = type ? [userId, type] : [userId];

    // ── KIỂM TRA REDIS CACHE TRƯỚC:
    const cacheKey = `tx:${userId}:limit:${limit}:offset:${offset}:type:${type || 'all'}`;
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[REDIS] CACHE HIT! Trả về dữ liệu cực nhanh cho key: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }
    } catch (redisErr) {
      console.error("Redis get error:", redisErr);
    }

    try {
      console.log(`[DB QUERY] CACHE MISS. Đang lấy dữ liệu từ PostgreSQL cho key: ${cacheKey}`);
      const [dataResult, countResult] = await Promise.all([
        pool.query(selectSQL, params),
        pool.query(countSQL, countParams),
      ]);

      const responseData = {
        data:   dataResult.rows,
        total:  parseInt(countResult.rows[0].count),
        limit,
        offset,
      };

      // LƯU KẾT QUẢ VÀO REDIS CACHE TRONG 60 GIÂY
      try {
        await redisClient.setEx(cacheKey, 60, JSON.stringify(responseData));
        console.log(`[REDIS] LƯU CACHE thành công cho key: ${cacheKey}`);
      } catch (redisErr) {
        console.error("Redis set error:", redisErr);
      }

      return res.json(responseData);
    } catch (err) {
      console.error("DB error (GET /transactions):", err.message);
      return res.status(500).json({ error: "Lỗi server", detail: err.message });
    }
  }
);

module.exports = router;
