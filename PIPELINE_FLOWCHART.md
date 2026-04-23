# 🔄 PIPELINE & FLOWCHART – LUỒNG HOẠT ĐỘNG CỦA TỪNG SERVICE

> Tài liệu này mô tả chi tiết luồng dữ liệu đi từ đâu, qua những service nào, xử lý gì, và trả kết quả về đâu.

---

## 📌 Sơ Đồ Kiến Trúc Tổng Thể

```mermaid
graph TB
    USER["👤 Người dùng<br/>(Trình duyệt Web)"]
    FE["🖥️ Frontend<br/>ReactJS + Vite<br/>Port 80"]
    GW["🔀 API Gateway<br/>Node.js Express<br/>Port 8080"]
    TX["💳 Transaction Service<br/>Node.js Express<br/>Port 8001"]
    AI["🤖 AI Service<br/>Python FastAPI<br/>Port 8002"]
    PG["🐘 PostgreSQL<br/>Database<br/>Port 5432"]
    RD["⚡ Redis<br/>Cache RAM<br/>Port 6379"]
    MQ["🐰 RabbitMQ<br/>Message Queue<br/>Port 5672"]

    USER -->|"HTTP Request"| FE
    FE -->|"REST API Call"| GW
    GW -->|"/api/auth<br/>/api/transactions"| TX
    GW -->|"/api/ai"| AI
    TX -->|"SQL Query"| PG
    TX -->|"Cache Get/Set"| RD
    TX -->|"Publish Message"| MQ
    MQ -->|"Consume Message"| AI
    AI -->|"UPDATE category"| PG
    AI -->|"Gemini Vision API"| GEMINI["☁️ Google Gemini<br/>Cloud AI"]
```

---

## 🔐 Pipeline 1: ĐĂNG KÝ TÀI KHOẢN

```mermaid
sequenceDiagram
    participant U as 👤 Người dùng
    participant FE as 🖥️ Frontend
    participant GW as 🔀 API Gateway
    participant TX as 💳 Transaction Service
    participant PG as 🐘 PostgreSQL

    U->>FE: Nhập Username + Password
    FE->>GW: POST /api/auth/register
    Note over GW: Kiểm tra Rate Limit<br/>(100 req/phút/IP)
    GW->>TX: Proxy Forward → Port 8001
    Note over TX: 1. Validate input<br/>(Username ≥ 3 ký tự, Password ≥ 6)
    TX->>PG: SELECT * FROM users WHERE username = ?
    PG-->>TX: Không tìm thấy (OK, chưa tồn tại)
    Note over TX: 2. Băm mật khẩu<br/>bcrypt.hash(password, salt=10)<br/>"abc123" → "$2a$10$xK9..."
    TX->>PG: INSERT INTO users (username, password_hash)
    PG-->>TX: ✅ Trả về user {id, username}
    Note over TX: 3. Tạo JWT Token<br/>jwt.sign({sub: userId}, SECRET, 10 ngày)
    TX-->>GW: 201 {message, user, token}
    GW-->>FE: 201 Response
    FE-->>U: 🎉 "Đăng ký thành công!"
```

**Giải thích kỹ thuật:**
- **Bcrypt (salt=10):** Mật khẩu "abc123" bị xay qua 10 vòng băm → biến thành chuỗi "$2a$10$xK9..." dài 60 ký tự. Không thể giải ngược lại.
- **JWT Token:** Là thẻ từ có hạn 10 ngày, chứa mã số người dùng (userId). Frontend giữ thẻ này để gửi kèm mỗi request sau đó.

---

## 🔑 Pipeline 2: ĐĂNG NHẬP

```mermaid
sequenceDiagram
    participant U as 👤 Người dùng
    participant FE as 🖥️ Frontend
    participant GW as 🔀 API Gateway
    participant TX as 💳 Transaction Service
    participant PG as 🐘 PostgreSQL

    U->>FE: Nhập Username + Password
    FE->>GW: POST /api/auth/login
    GW->>TX: Proxy Forward
    TX->>PG: SELECT * FROM users WHERE username = ?
    PG-->>TX: Trả về user {id, password_hash}
    Note over TX: So sánh mật khẩu:<br/>bcrypt.compare("abc123", "$2a$10$xK9...")<br/>→ true ✅
    Note over TX: Tạo JWT Token mới
    TX-->>GW: 200 {token, user}
    GW-->>FE: 200 Response
    Note over FE: Lưu token vào<br/>localStorage
    FE-->>U: ✅ Chuyển đến Dashboard
```

---

## ➕ Pipeline 3: THÊM GIAO DỊCH MỚI (Có AI phân loại ngầm)

```mermaid
sequenceDiagram
    participant U as 👤 Người dùng
    participant FE as 🖥️ Frontend
    participant GW as 🔀 API Gateway
    participant TX as 💳 Transaction Service
    participant PG as 🐘 PostgreSQL
    participant RD as ⚡ Redis
    participant MQ as 🐰 RabbitMQ
    participant AI as 🤖 AI Service

    U->>FE: Nhập: 50000, Chi tiêu, "cơm trưa"
    FE->>GW: POST /api/transactions<br/>Header: Bearer JWT_TOKEN
    Note over GW: 1. Rate Limit Check ✅<br/>2. CORS Check ✅
    GW->>TX: Proxy Forward
    Note over TX: 3. JWT Verify<br/>Giải mã token → userId
    TX->>PG: INSERT INTO transactions<br/>(userId, 50000, "expense", "cơm trưa")
    PG-->>TX: ✅ Trả về giao dịch mới {id: 42}

    Note over TX: 4. Xóa Cache cũ của user<br/>(để F5 hiện dữ liệu mới)
    TX->>RD: DEL tx:userId:*
    RD-->>TX: ✅ Xóa thành công

    Note over TX: 5. Gửi thư vào hàng đợi<br/>(Không chờ AI xử lý)
    TX->>MQ: Publish {id:42, desc:"cơm trưa"}
    TX-->>GW: 201 "Giao dịch đã tạo thành công"
    GW-->>FE: 201 Response
    FE-->>U: ✅ Hiển thị giao dịch mới

    Note over MQ,AI: ═══ XỬ LÝ BẤT ĐỒNG BỘ (Ngầm) ═══
    MQ-->>AI: Deliver message {id:42, desc:"cơm trưa"}
    Note over AI: 6. TF-IDF + Naive Bayes<br/>"cơm trưa" → Ăn uống (87%)
    AI->>PG: UPDATE transactions<br/>SET category="Ăn uống",<br/>ai_classified=true,<br/>ai_confidence=87<br/>WHERE id=42
    PG-->>AI: ✅ Cập nhật thành công
```

**Giải thích kỹ thuật:**
- **Bước 1-5 (Đồng bộ):** Người dùng bấm "Thêm" → Nhận kết quả ngay lập tức (< 0.1 giây). Không phải chờ AI.
- **Bước 6 (Bất đồng bộ):** AI Service âm thầm rút thư từ RabbitMQ, phân loại "cơm trưa" = "Ăn uống", rồi tự cập nhật Database. Lần sau F5 trang sẽ thấy nhãn "✨ AI" xuất hiện.

---

## 📋 Pipeline 4: XEM DANH SÁCH GIAO DỊCH (Có Redis Cache)

```mermaid
sequenceDiagram
    participant U as 👤 Người dùng
    participant FE as 🖥️ Frontend
    participant GW as 🔀 API Gateway
    participant TX as 💳 Transaction Service
    participant RD as ⚡ Redis
    participant PG as 🐘 PostgreSQL

    U->>FE: Mở Dashboard / Bấm F5
    FE->>GW: GET /api/transactions?limit=50<br/>Header: Bearer JWT_TOKEN
    GW->>TX: Proxy Forward
    Note over TX: JWT Verify → userId

    TX->>RD: GET tx:userId:limit:50:offset:0
    
    alt Cache HIT (Có dữ liệu trong Redis)
        RD-->>TX: ✅ Trả về JSON từ RAM<br/>⚡ Tốc độ: 0.001 giây
        Note over TX: Log: "CACHE HIT!"
        TX-->>GW: 200 {data, total}
    else Cache MISS (Không có trong Redis)
        RD-->>TX: ❌ null
        Note over TX: Log: "CACHE MISS, query DB"
        TX->>PG: SELECT * FROM transactions<br/>WHERE user_id = ?<br/>ORDER BY created_at DESC<br/>LIMIT 50
        PG-->>TX: Trả về danh sách giao dịch
        TX->>RD: SETEX key 60s JSON_DATA<br/>(Lưu cache 60 giây)
        RD-->>TX: ✅ OK
        TX-->>GW: 200 {data, total}
    end

    GW-->>FE: 200 Response
    FE-->>U: 📊 Hiển thị bảng + biểu đồ
```

**Giải thích kỹ thuật:**
- **Lần F5 đầu tiên:** Cache MISS → Query PostgreSQL (chậm hơn) → Lưu kết quả vào Redis 60 giây.
- **Lần F5 thứ 2 (trong 60s):** Cache HIT → Lấy thẳng từ RAM Redis (nhanh gấp 100 lần) → Database không bị động.
- **Khi thêm giao dịch mới:** Cache cũ bị XÓA (Pipeline 3, bước 4) → Lần F5 kế sẽ tải lại dữ liệu mới nhất.

---

## 📸 Pipeline 5: QUÉT HÓA ĐƠN BẰNG GEMINI AI VISION

```mermaid
sequenceDiagram
    participant U as 👤 Người dùng
    participant FE as 🖥️ Frontend
    participant GW as 🔀 API Gateway
    participant AI as 🤖 AI Service
    participant GM as ☁️ Google Gemini Cloud

    U->>FE: Bấm "Choose File" → Chọn ảnh hóa đơn
    FE->>GW: POST /api/ai/ocr<br/>Body: FormData (file ảnh)
    GW->>AI: Proxy Forward → Port 8002

    Note over AI: 1. Đọc ảnh vào RAM<br/>Image.open(bytes)
    Note over AI: 2. Xây dựng Prompt:<br/>"Đọc hóa đơn, tìm Tổng tiền,<br/>Loại, Danh mục, Mô tả..."

    AI->>GM: generate_content([prompt, image])<br/>Model: gemini-2.0-flash
    Note over GM: 3. Vision Transformer<br/>mã hóa ảnh → vector<br/>4. Language Model<br/>suy luận ngữ cảnh
    GM-->>AI: "AMOUNT:70000000<br/>TYPE:expense<br/>CATEGORY:Khác<br/>DESC:Hóa đơn dịch vụ An Nam"

    Note over AI: 5. Parse kết quả<br/>Tách từng dòng AMOUNT/TYPE/...
    AI-->>GW: 200 {amount, type, category, description}
    GW-->>FE: 200 Response
    Note over FE: 6. Tự động điền 4 ô:<br/>Số tiền, Loại, Danh mục, Mô tả
    FE-->>U: 🎉 "Gemini AI đã đọc thành công!<br/>💰 70,000,000 VNĐ"
```

---

## 🔄 Pipeline 6: CI/CD GITHUB ACTIONS

```mermaid
graph LR
    DEV["👨‍💻 Developer<br/>git push"] -->|"Push code"| GH["☁️ GitHub<br/>Repository"]
    GH -->|"Trigger"| CI["⚙️ GitHub Actions"]
    CI --> BUILD["🔨 Docker Build<br/>Build tất cả images"]
    BUILD --> SCAN["🛡️ Trivy Security<br/>Quét lỗ hổng bảo mật"]
    SCAN -->|"Pass ✅"| DONE["✅ Pipeline<br/>Thành Công"]
    SCAN -->|"Fail ❌"| ALERT["⚠️ Cảnh báo<br/>Có lỗ hổng"]
```

---

## 📊 Tổng kết: Bảng So Sánh Vai Trò Từng Service

| Service | Ngôn ngữ | Port | Vai trò chính | Giao tiếp với |
|---------|----------|------|---------------|---------------|
| **Frontend** | ReactJS | 80 | Giao diện người dùng, biểu đồ | → API Gateway |
| **API Gateway** | Node.js | 8080 | Bảo mật (CORS, Rate Limit), Định tuyến | → Transaction, AI |
| **Transaction Service** | Node.js | 8001 | Xác thực JWT, CRUD giao dịch, Cache Redis | → PostgreSQL, Redis, RabbitMQ |
| **AI Service** | Python | 8002 | Phân loại TF-IDF, Quét ảnh Gemini Vision | → PostgreSQL, RabbitMQ, Google Cloud |
| **PostgreSQL** | SQL | 5432 | Lưu trữ dữ liệu vĩnh viễn | ← Transaction, AI |
| **Redis** | In-Memory | 6379 | Bộ nhớ đệm tốc độ cao | ← Transaction |
| **RabbitMQ** | AMQP | 5672 | Hàng đợi tin nhắn bất đồng bộ | ← Transaction → AI |
