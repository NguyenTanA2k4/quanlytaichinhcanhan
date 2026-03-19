# ─────────────────────────────────────────────
#  ai-service  |  python:3.9-slim
#  Bảo mật: chạy với user "appuser" (không phải root)
# ─────────────────────────────────────────────

FROM python:3.9-slim

# 1. Tránh Python tạo file .pyc và buffer stdout (log ngay ra console)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 2. Cài các build dependencies (một số gói scikit-learn cần gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# 3. Tạo group và user không có quyền root
RUN groupadd --gid 1001 appgroup && \
    useradd  --uid 1001 --gid appgroup --no-create-home --shell /bin/bash appuser

WORKDIR /app

# 4. Copy và cài requirements trước (tận dụng layer cache)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy source code với quyền sở hữu thuộc về appuser
COPY --chown=appuser:appgroup . .

# 6. Chuyển sang user không có quyền root TRƯỚC khi chạy app
USER appuser

EXPOSE 8002

# Health check
HEALTHCHECK --interval=20s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
