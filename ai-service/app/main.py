"""
main.py  –  AI Service
──────────────────────
FastAPI app + RabbitMQ consumer chạy song song qua background thread.

Endpoints:
  GET  /health                 – kiểm tra sức khỏe service
  POST /ai/classify            – phân loại text trực tiếp qua HTTP (để test)
  GET  /ai/categories          – danh sách danh mục model biết
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware

from app.classifier import predict_category, LABELS
from app.consumer import start_consumer_thread
from app.routers import ai

# ── Logging setup ─────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan – chạy consumer khi app start ────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI Service khởi động – training classifier...")
    start_consumer_thread()          # daemon thread, không block
    yield
    logger.info("🛑 AI Service tắt.")


app = FastAPI(
    title="AI Service",
    description="Phân loại giao dịch tài chính bằng TF-IDF + Naive Bayes",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router, prefix="/ai", tags=["AI Extra"])


# ══════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/ai/classify", tags=["AI"])
def classify(
    text: str = Body(..., embed=True, example="mua cà phê buổi sáng"),
):
    """
    Phân loại một mô tả giao dịch thành danh mục tài chính.
    Trả về danh mục dự đoán và độ tin cậy.
    """
    result = predict_category(text)
    return {
        "input":      text,
        "category":   result["category"],
        "confidence": result["confidence"],
        "all_scores": result["all_scores"],
    }


@app.get("/ai/categories", tags=["AI"])
def list_categories():
    """Trả về danh sách các danh mục model có thể phân loại."""
    return {"categories": sorted(set(LABELS))}
