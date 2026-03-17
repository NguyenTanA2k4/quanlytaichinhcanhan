const amqplib = require("amqplib");

const QUEUE_NAME = "transaction_queue";
let channel = null;

/**
 * Kết nối tới RabbitMQ và tạo channel + queue bền vững (durable).
 * Tự động retry mỗi 5 giây nếu RabbitMQ chưa sẵn sàng.
 */
async function connectRabbitMQ(retries = 10) {
  const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await amqplib.connect(url);
      channel = await connection.createChannel();

      // durable: true → queue tồn tại sau khi RabbitMQ khởi động lại
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      console.log(`✅ RabbitMQ connected – queue "${QUEUE_NAME}" ready`);

      connection.on("error", (err) => {
        console.error("❌ RabbitMQ connection error:", err.message);
        channel = null;
      });

      return channel;
    } catch (err) {
      console.warn(`⚠️  RabbitMQ attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  console.error("❌ Could not connect to RabbitMQ after all retries. Continuing without MQ.");
}

/**
 * Publish một message tới transaction_queue.
 * @param {object} payload – dữ liệu giao dịch
 */
function publishTransaction(payload) {
  if (!channel) {
    console.warn("⚠️  RabbitMQ channel not ready – skipping publish");
    return;
  }

  const message = Buffer.from(JSON.stringify(payload));

  // persistent: true → message tồn tại nếu RabbitMQ restart
  channel.sendToQueue(QUEUE_NAME, message, { persistent: true });
  console.log(`📨 Published to "${QUEUE_NAME}":`, payload.description);
}

/**
 * Consumer lắng nghe kết quả từ AI Service và cập nhật Database.
 */
async function consumeAIResults(dbPool) {
  if (!channel) return;
  const AI_QUEUE = "ai_results_queue";
  await channel.assertQueue(AI_QUEUE, { durable: true });

  console.log(`✅ Listening to AI results on "${AI_QUEUE}"`);

  channel.consume(AI_QUEUE, async (msg) => {
    if (msg !== null) {
      try {
        const result = JSON.parse(msg.content.toString());
        await dbPool.query(
          "UPDATE transactions SET category = $1, ai_classified = true, ai_confidence = $2 WHERE id = $3",
          [result.category, result.confidence, result.id]
        );
        console.log(`✨ AI updated Tx ${result.id} -> ${result.category} (${result.confidence}%)`);
        channel.ack(msg);
      } catch (err) {
        console.error("❌ Error processing AI result:", err.message);
        // Don't nack automatically unless you want infinite loops on bad JSON, just ack bad messages for demo safety
        channel.ack(msg); 
      }
    }
  });
}

module.exports = { connectRabbitMQ, publishTransaction, consumeAIResults, QUEUE_NAME };
