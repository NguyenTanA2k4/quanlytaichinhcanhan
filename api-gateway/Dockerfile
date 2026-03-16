# ─────────────────────────────────────────────
#  api-gateway  |  node:18-alpine
#  Bảo mật: chạy với user "appuser" (không phải root)
# ─────────────────────────────────────────────

FROM node:18-alpine

# 1. Cài wget (dùng cho health check)
RUN apk add --no-cache wget

# 2. Tạo group và user không có quyền root
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid  1001 --ingroup appgroup --no-create-home appuser

WORKDIR /app

# 3. Copy package files trước (tận dụng Docker layer cache)
COPY package*.json ./

# 4. Cài dependencies (chỉ production)
RUN npm install --omit=dev && \
    npm cache clean --force

# 5. Copy source code với quyền sở hữu của appuser
COPY --chown=appuser:appgroup . .

# 6. Chuyển sang user không có quyền root TRƯỚC khi chạy app
USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "src/index.js"]
