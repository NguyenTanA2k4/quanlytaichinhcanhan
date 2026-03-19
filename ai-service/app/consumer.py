"""
consumer.py
───────────
RabbitMQ consumer – lắng nghe liên tục trên "transaction_queue".
Khi nhận message, đưa qua TF-IDF + Naive Bayes để dự đoán danh mục
và log result ra console.

Chạy độc lập:
    python -m app.consumer
Hoặc được gọi qua thread khi FastAPI khởi động.
"""

import os
import json
import time
import logging
import threading

import pika

from app.classifier import predict_category

logger = logging.getLogger(__name__)

QUEUE_NAME    = "transaction_queue"
RABBITMQ_URL  = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")


# ══════════════════════════════════════════════════════════════════
#  CALLBACK – xử lý từng message
# ══════════════════════════════════════════════════════════════════
def on_message(channel, method, properties, body: bytes):
    """
    Được gọi mỗi khi có message mới trên transaction_queue.
    """
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as e:
        logger.error("❌ JSON decode error: %s | raw: %s", e, body)
        channel.basic_nack(method.delivery_tag, requeue=False)
        return

    description = payload.get("description", "").strip()
    tx_id       = payload.get("transactionId", "?")
    amount      = payload.get("amount", 0)
    tx_type     = payload.get("type", "?")

    # ── Phân loại bằng ML model ───────────────────────────────
    result = predict_category(description)

    # ── Log kết quả ra console ───────────────────────────────
    logger.info(
        "\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📨  [AI-SERVICE] Nhận giao dịch mới từ queue\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "  Transaction ID : %s\n"
        "  Loại           : %s\n"
        "  Số tiền        : %s VNĐ\n"
        "  Mô tả          : \"%s\"\n"
        "  ──────────────────────────────────────────\n"
        "  🤖 Dự đoán danh mục : %s\n"
        "  📊 Độ tin cậy       : %.1f%%\n"
        "  📋 Tất cả scores    : %s\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        tx_id,
        tx_type,
        f"{float(amount):,.0f}",
        description,
        result["category"],
        result["confidence"] * 100,
        result["all_scores"],
    )

    # Trả kết quả về cho Transaction Service qua RabbitMQ (Choreography Pattern)
    try:
        channel.queue_declare(queue="ai_results_queue", durable=True)
        result_payload = {
            "id": tx_id,
            "category": result["category"],
            "confidence": float(result["confidence"] * 100)
        }
        channel.basic_publish(
            exchange="",
            routing_key="ai_results_queue",
            body=json.dumps(result_payload),
            properties=pika.BasicProperties(delivery_mode=2) # persistent
        )
        logger.info("📤 Đã gửi kết quả về ai_results_queue cho Tx ID: %s", tx_id)
    except Exception as e:
        logger.error("❌ Lỗi khi gửi kết quả về MQ: %s", e)

    # Xác nhận message đã xử lý xong
    channel.basic_ack(method.delivery_tag)


# ══════════════════════════════════════════════════════════════════
#  CONSUMER LOOP – tự reconnect khi mất kết nối
# ══════════════════════════════════════════════════════════════════
def start_consuming(max_retries: int = 0):
    """
    Kết nối tới RabbitMQ và bắt đầu lắng nghe.
    max_retries=0 → retry vô hạn (phù hợp cho production).
    """
    attempt = 0

    while True:
        attempt += 1
        try:
            params     = pika.URLParameters(RABBITMQ_URL)
            params.heartbeat = 60               # giữ kết nối alive
            params.blocked_connection_timeout = 300

            connection = pika.BlockingConnection(params)
            channel    = connection.channel()

            # Đảm bảo queue tồn tại (idempotent)
            channel.queue_declare(queue=QUEUE_NAME, durable=True)

            # Chỉ nhận 1 message tại một thời điểm (fair dispatch)
            channel.basic_qos(prefetch_count=1)

            channel.basic_consume(
                queue=QUEUE_NAME,
                on_message_callback=on_message,
            )

            logger.info(
                "✅ [AI-SERVICE] Consumer started – đang lắng nghe queue: \"%s\"",
                QUEUE_NAME,
            )

            channel.start_consuming()   # blocking loop

        except pika.exceptions.AMQPConnectionError as e:
            wait = min(5 * attempt, 60)  # backoff tối đa 60s
            logger.warning(
                "⚠️  RabbitMQ chưa sẵn sàng (lần %d): %s – thử lại sau %ds",
                attempt, e, wait,
            )
            time.sleep(wait)

        except KeyboardInterrupt:
            logger.info("🛑 Consumer dừng theo yêu cầu.")
            break

        except Exception as e:
            logger.error("❌ Lỗi không mong đợi: %s – restart consumer...", e)
            time.sleep(5)


def start_consumer_thread() -> threading.Thread:
    """
    Chạy consumer trong background thread để không block FastAPI.
    """
    thread = threading.Thread(
        target=start_consuming,
        daemon=True,          # thread tự kết thúc khi main process thoát
        name="rabbitmq-consumer",
    )
    thread.start()
    logger.info("🔄 Consumer thread started (daemon=True)")
    return thread


# Cho phép chạy trực tiếp: python -m app.consumer
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    start_consuming()
