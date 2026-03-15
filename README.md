# 💸 Finance Assistant – Microservices

Dự án đồ án môn học **Kiến trúc hướng dịch vụ & Điện toán đám mây** sử dụng kiến trúc microservices.

## Kiến trúc tổng quan

```
Browser / Mobile
      │
      ▼
┌─────────────┐     ┌─────────────────────┐
│  Frontend   │────▶│    API Gateway :3000 │
│  (Nginx:80) │     └──────────┬──────────┘
└─────────────┘                │
                   ┌───────────┴────────────┐
                   │                        │
         ┌─────────▼──────────┐   ┌─────────▼──────┐
         │ Transaction Service │   │   AI Service    │
         │      :8001          │   │     :8002        │
         └─────────┬──────────┘   └────────┬────────┘
                   │                        │
         ┌─────────▼──────────┐   ┌─────────▼────────┐
         │  PostgreSQL :5432   │   │  RabbitMQ :5672   │
         └────────────────────┘   └──────────────────┘
```

## Cấu trúc thư mục

```
finance-assistant/
├── api-gateway/              # Node.js + Express – reverse proxy & auth
│   ├── src/index.js
│   ├── package.json
│   └── Dockerfile
├── transaction-service/      # Python + FastAPI – CRUD giao dịch
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── routers/transactions.py
│   ├── requirements.txt
│   └── Dockerfile
├── ai-service/               # Python + FastAPI – phân tích AI
│   ├── app/
│   │   ├── main.py
│   │   └── routers/ai.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React + Vite – giao diện người dùng
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml        # Orchestration
├── .env.example              # Mẫu biến môi trường (KHÔNG hardcode!)
├── .gitignore
└── README.md
```

## Bắt đầu nhanh

### 1. Tạo file `.env`

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Mở file `.env` và **điền giá trị thực** cho từng biến:

| Biến | Mô tả |
|------|-------|
| `POSTGRES_USER` | Tên đăng nhập PostgreSQL |
| `POSTGRES_PASSWORD` | **Mật khẩu mạnh** cho PostgreSQL |
| `POSTGRES_DB` | Tên database |
| `RABBITMQ_DEFAULT_USER` | Tên đăng nhập RabbitMQ |
| `RABBITMQ_DEFAULT_PASS` | **Mật khẩu mạnh** cho RabbitMQ |
| `JWT_SECRET` | Chuỗi bí mật để ký JWT (≥ 32 ký tự) |
| `OPENAI_API_KEY` | (Tùy chọn) API key OpenAI |

> ⚠️ **KHÔNG commit file `.env`** – nó đã được thêm vào `.gitignore`.

### 2. Khởi động toàn bộ hệ thống

```bash
docker compose up --build
```

### 3. Kiểm tra các endpoints

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API Gateway | http://localhost:3000/health |
| Transaction Service (docs) | http://localhost:8001/docs |
| AI Service (docs) | http://localhost:8002/docs |
| RabbitMQ Management | http://localhost:15672 |

### 4. Dừng hệ thống

```bash
docker compose down          # Dừng containers
docker compose down -v       # Dừng + xoá volumes (reset DB)
```

## Bảo mật

- ✅ Không có password nào hardcode trong `docker-compose.yml`
- ✅ Tất cả secrets được mount qua biến môi trường từ `.env`
- ✅ `.env` bị loại khỏi Git bởi `.gitignore`
- ✅ Health checks đảm bảo thứ tự khởi động đúng
- ✅ Mỗi service chỉ nhận đúng biến môi trường mình cần

## Phát triển từng service độc lập

```bash
# Chỉ chạy infrastructure
docker compose up postgres rabbitmq

# Chạy transaction-service ở local
cd transaction-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```
