# ─────────────────────────────────────────────
#  transaction-service  |  node:18-alpine
#  Bảo mật: chạy với user "appuser" (không phải root)
# ─────────────────────────────────────────────

FROM node:18-alpine

# 1. Cài đặt tzdata để log ra đúng múi giờ (tùy chọn)
RUN apk add --no-cache tzdata

# 2. Tạo group và user không có quyền root
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid  1001 --ingroup appgroup --no-create-home appuser

WORKDIR /app

# 3. Copy package files trước (tận dụng Docker layer cache)
COPY package*.json ./

# 4. Cài dependencies với --omit=dev để loại bỏ devDependencies khỏi image
RUN npm install --omit=dev && \
    # Xóa cache npm để giảm kích thước image
    npm cache clean --force

# 5. Copy toàn bộ source code
COPY --chown=appuser:appgroup . .

# 6. Chuyển sang user không có quyền root TRƯỚC khi chạy app
USER appuser

EXPOSE 8001

# Health check cho Docker / Compose
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8001/health || exit 1

CMD ["node", "src/index.js"]
