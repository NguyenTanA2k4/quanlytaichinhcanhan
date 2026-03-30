---
description: Hướng dẫn Khởi chạy và Báo cáo Đồ án Quản lý Tài chính (Finance Assistant)
---

# 🎓 TỔNG HỢP KIẾN TRÚC & KỊCH BẢN BÁO CÁO ĐỒ ÁN

Tài liệu này (Workflow) chứa toàn bộ thông tin về kiến trúc hệ thống, những điểm "ăn tiền" để lấy điểm cao, và các câu lệnh cần thiết để trình bày (demo) cho Hội đồng giáo viên.

## 1. Kiến Trúc Hệ Thống (Mô hình Microservices)

Đồ án được chia nhỏ thành các dịch vụ độc lập, giúp hệ thống không bị "chết chùm" (Single Point of Failure):
- **1. Frontend (ReactJS + Vite):** Giao diện Web hiển thị đẹp mắt, dark mode hiện đại. Tương tác với người dùng ở cổng `:80`.
- **2. API Gateway (Node.js/Express):** Người gác cổng ở `:8080`. Mọi truy cập vào hệ thống phải qua đây. Có tính năng **CORS** (chống gọi lén từ web khác) và **Rate Limiting** (Chống Spam/DDoS 100 request/phút).
- **3. Transaction Service (Node.js + PostgreSQL + Redis):** Quản lý Dữ liệu ở `:8001`.
  - **PostgreSQL:** Lưu trữ vĩnh viễn (Database).
  - **Redis:** Lưu Cache tạm thời trên RAM để tốc độ truy xuất siêu tốc (High Performance).
- **4. AI Service (Python/FastAPI + Tesseract OCR):** Não bộ AI ở `:8002`.
  - Giải quyết bài toán phân loại danh mục (Ăn uống, Mua sắm...) bằng thuật toán Máy Học (Machine Learning) truyền thống **TF-IDF + Naive Bayes**.
  - Giải quyết bài toán Thị giác máy tính (Computer Vision) dùng **Tesseract OCR OCR** để quét ảnh hóa đơn lấy Số tiền.

**Giao tiếp giữa các Service:** 
- Giao tiếp Bất đồng bộ qua hàng đợi thông điệp **RabbitMQ**. Khi người dùng lưu Giao dịch, lệnh lưu sẽ xong ngay, còn việc Phân loại AI sẽ chạy ngầm qua Queue, giúp Web không bị lag.

---

## 2. Các Cú Pháp Lệnh (Terminal Commands)

Dưới đây là các lệnh cần để quản trị hệ thống bằng Docker.

**▶ Khởi động Toàn bộ Hệ Thống (Chạy ẩn)**
```bash
// turbo
docker compose up -d
```
*(Lưu ý: Bạn cũng có thể click đúp vào file `start_all.bat` trên Windows)*

**▶ Tắt Toàn bộ Hệ Thống**
```bash
// turbo
docker compose down
```

**▶ Kiểm tra Log Hệ thống (Rất quan trọng khi Demo)**
Để chứng minh với thầy cô hệ thống đang chạy ngầm, mở các cửa sổ Terminal riêng và gõ:

1. Xem Log của Redis Caching:
```bash
docker logs finance-transaction-service -f
```

2. Xem Log của AI và OCR xử lý:
```bash
docker logs finance-ai-service -f
```

---

## 3. Kịch Bản Thuyết Trình Lấy Điểm Tối Đa

Khi lên bục thuyết trình, hãy thao tác theo 4 bước sau (Vừa làm vừa mở Terminal Log song song với Web để thầy cô thấy hệ thống đang log dữ liệu Live):

### 🎯 BƯỚC 1: Demo Message Queue (RabbitMQ) & Machine Learning (Naive Bayes)
- **Hành động:** Khai báo một giao dịch thủ công. VD: Gõ "mua trà sữa Phúc Long", Số tiền: 50000. Cố tình chọn mảng Danh mục là "Khác".
- **Giải thích:** *"Khi em lưu, Transaction Service sẽ lưu vào Database ngay lập tức, sau đó dồn Text qua RabbitMQ. AI Service sẽ chộp lấy Text đó từ Queue, dùng thuật toán TF-IDF và Naive Bayes phân tích câu 'mua trà sữa Phúc Long', nhận định 95% đây là 'Ăn uống' và tự động sửa cập nhật lại DB"* (Mở log AI Service lên cho thầy cô thấy quá trình Consume queue).

### 🎯 BƯỚC 2: Demo Computer Vision Offline (Tesseract OCR)
- **Hành động:** Bấm vào biểu tượng Load ảnh hóa đơn ở phần "📸 Quét Hóa Đơn Tự Động". Tải một bức ảnh biên lai siêu thị lên.
- **Giải thích:** *"Thay vì gọi Google API rủi ro bị khóa và tốn tiền, em đã tích hợp nguyên bộ mã nguồn mở Tesseract OCR vào lõi Docker Python. Hệ thống sẽ quét ảnh offline, dùng Regex bóc tách chữ 'Tổng tiền' / 'Total' và moi ra con số lớn nhất gán thẳng vào Form giao dịch cho em, không trượt đồng nào!"*

### 🎯 BƯỚC 3: Demo Tối ưu hóa Chịu tải cao (Redis Caching)
- **Hành động:** Bấm F5 tải lại trang web (hoặc chuyển trang) liên tục 5-10 lần thật nhanh. (Mở song song bảng Terminal của Transaction Service).
- **Giải thích:** *"Nếu 100 người F5 cùng lúc, Database PostgreSQL sẽ chết (Crash). Nên em đã dựng thêm Redis Caching. Ở lần F5 đầu tiên, máy chủ báo `[DB QUERY] CACHE MISS`. Nhưng 9 lần F5 sau, máy chủ báo `[REDIS] CACHE HIT` và load dữ liệu thẳng từ thanh RAM, tốc độ phản hồi tính bằng Millisecond, giảm 99% áp lực cho Database chính."*

### 🎯 BƯỚC 4: Demo Bảo vệ Hệ thống (Rate Limiting)
- **Hành động:** Dùng công cụ (hoặc gõ mã JS trên tab Console) tự gửi liên tiếp 150 request trong 10 giây.
- **Giải thích:** *"API Gateway của em áp dụng Rate Limit (100 req/min). Nếu bị kẻ gian tấn công DDoS, Gateway sẽ chém đứt kết nối và báo lỗi 429 Too Many Requests, bảo vệ hoàn toàn dàn Server phía sau."*

---
> 💡 **Lời chúc:** Với dàn đồ án trang bị "Tận răng" như thế này, nếu đi báo cáo mà giải thích trôi chảy các thuật ngữ phía trên thì điểm A hoặc thủ khoa môn học là nằm chắc trong tầm tay! Cố lên nhé!
