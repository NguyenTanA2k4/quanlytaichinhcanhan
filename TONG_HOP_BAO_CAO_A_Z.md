# 🚀 TỔNG HỢP KIẾN THỨC BẢO VỆ ĐỒ ÁN TỪ A-Z (FINANCE ASSISTANT)

> Tài liệu này được biên soạn đặc biệt để giúp bạn "nắm trùm" toàn bộ logic kỹ thuật của ứng dụng, chuẩn bị sẵn sàng cho những câu hỏi khó nhằn nhất từ Thầy Cô.

---

## 1. TỔNG QUAN HỆ THỐNG
Dự án được thiết kế theo kiến trúc **Microservices (Dịch vụ vi mô)** thay vì Monolithic (Kiến trúc khối nguyên khối truyền thống).

### 🛠 Tech Stack (Công nghệ)
- **Frontend:** `ReactJS` kết hợp `Vite` (Build cực nhanh, chia nhỏ trang UI thành các component).
- **Backend Chính (Transaction):** `Node.js` + `Express` (Chạy luồng sự kiện siêu nhẹ, xử lý hàng nghìn kết nối cùng lúc).
- **Cơ sở dữ liệu:** `PostgreSQL` (Relational DB chuẩn công nghiệp, rất chặt chẽ, an toàn).
- **Khối AI (AI Service):** `Python` + `FastAPI` (Python là vua trong mảng Machine Learning và Data).
- **Message Broker:** `RabbitMQ` (Hệ thống chuyển phát thư trung gian).
- **Bộ nhớ đệm (Cache):** `Redis` (Lưu dữ liệu trên bộ nhớ RAM).
- **Hạ tầng (DevOps):** `Docker` + `Docker Compose` + `GitHub Actions CI/CD`.

---

## 2. GIẢI MÃ CÁC CHỨC NĂNG "VIP PRO" (DỄ BỊ HỎI NHẤT)

### 💡 Câu Hỏi Điểm Mười 1: Tại sao lại áp dụng RabbitMQ (Message Broker)?
- Nếu không có RabbitMQ (kiểu cũ - Đồng bộ): Khi User bấm "Thêm Giao Dịch", Transaction Service phải gọi thẳng API sang AI Service -> AI Service tốn 2 giây để phân tích chốt danh mục -> AI trả kết quả -> Transaction lưu Database xong mới báo cho User. -> 👉 **Gây Lag, màn hình bị xoay chờ đợi mỏi mòn.**
- **Có RabbitMQ (Bất đồng bộ):** User vừa bấm nút, Transaction Service **lưu ngay tên giao dịch** vào Database, rồi "nhét bức thư" ghi tên giao dịch đó vào hộp thư RabbitMQ, xong báo ngay *"Thành công"* cho User (Chưa tới 0.1 giây). AI Service ngầm lấy thư từ RabbitMQ, đủng đỉnh phân loại, rồi âm thầm sửa lại CSDL bằng Database. -> 👉 **Trải nghiệm siêu mượt, tách rời rủi ro (AI có bị sập mạng thì hệ thống ghi chú giao dịch vẫn hoạt động bình thường).**

### 💡 Câu Hỏi Điểm Mười 2: Thuật toán AI phân loại danh mục hoạt động thế nào?
- Hệ thống KHÔNG CẦN CHATGPT API. Nó dùng Máy Học Truyền Thống (Machine Learning) tự thân vận động dựa trên thư viện `scikit-learn` gốc.
- **TF-IDF (Term Frequency - Inverse Document Frequency):** AI nhìn từ "ăn KFC" để đếm xem chữ nào quan trọng. VD chữ "ăn" xuất hiện nhiều ở môn "Ăn uống".
- **Naive Bayes algorithm:** Đây là thuật toán xác suất thống kê. Nếu text là "đổ xăng", nó tính xác suất ra "Di chuyển" là 90%. AI tự tin nhất ở phần trăm nào thì gán luôn danh mục đó. Đoạn code `classifier.py` đã đào tạo mô hình nhỏ bằng các câu văn Tiếng Việt mẫu.

### 💡 Câu Hỏi Điểm Mười 3: Tính năng quét hóa đơn (OCR) hoạt động như nào? Bằng API ngoài à?
- **Trả lời:** Dạ không, hệ thống chạy Offline 100% bằng Computer Vision.
- Khi Build Docker, em cài đặt bộ công cụ gốc **`tesseract-ocr`** (Mã nguồn mở lừng danh do Google phát triển từ lâu).
- Khi người dùng Upload hình ảnh qua Gateway xuống lõi API Python `/ocr`, hàm `pytesseract` sẽ ăn bức ảnh, phân tách từng Pixel (điểm ảnh) thành chữ (String) Tiếng Việt có dấu (nhờ gói dataset `tesseract-ocr-vie`).
- Lấy được toàn bộ chữ, em chèn thuật toán Biểu thức chính quy (**Regex Regex**) để săn lùng các cụm chữ *"Tổng cộng:", "Total:"*. Sau đó lấy con số dính liền đằng sau lớn nhất. Rút trích nó trả ngược về form Tự Động điền cho người dùng.

### 💡 Câu Hỏi Điểm Mười 4: Tại sao Web load 50 giao dịch lại siêu nhanh? Database có bị quá tải không?
- **Trả lời:** Em sử dụng thuật toán Caching với **Redis**. Cơ sở dữ liệu thường xuyên đọc nội dung từ ổ cứng rất lười và mệt.
- Lần F5 trang web tiên cùa User: Transaction Service phải xuống cự cãi với PostgreSQL (*Cache Miss - mất 100ms*). Tuy nhiên lấy xong nó lưu ngay 1 bản Copy vào Redis RAM.
- 10 lần F5 trang Web tiếp theo: Transaction Service kiểm tra Redis thấy có sẵn (*Cache Hit*), nó lấy từ RAM vứt thẳng ra cho User (Mất chưa tới *2ms*).
- **Cache Invalidation:** Ngay khi User thêm hoặc sửa giao dịch, em xóa sạch bộ nhớ Redis cũ của người đó, ép lần tải kế phải gọi lại Postgres tránh dữ liệu ứ đọng!

### 💡 Câu Hỏi Điểm Mười 5: Cổng kết nối API Gateway và bảo mật chống phá hoại
- Em không mở port cho bên ngoài truy cập thẳng Microservices. Chỉ có cổng `:8080` (API Gateway).
- Áp dụng **Rate Limiting**: Em cài đặt tối đa chặn 100 lệnh/phút. Thầy có dùng Script hay máy trạm để DDoS gửi 1000 request, Gateway tự động ngắt chốt văng mã lỗi **429 Too Many Requests**. Các Server lõi bên trong hoàn toàn không ảnh hưởng.
- Áp dụng **CORS**: Chỉ trình duyệt khởi nguồn từ domain chỉ định cực đoan mới gọi API được (Chặn Request lậu).

### 💡 Câu Hỏi Điểm Mười 6: Tự động Hóa Code (Auto DevOps) GitHub Actions là sao?
- Thay vì nén thư mục gửi lên máy chủ cài rườm rà.
- Em tạo file cài đặt luồng chạy `.github/workflows/ci.yml`. Mỗi khi Dev viết code xong, push lên Branch `main`. Máy chủ Github ở Mỹ tự tải code mới xuống, tự động Build lại nguyên khung hệ thống Docker xem có bị sập ở bước nào không (Test Integration Pipeline). Nếu xanh lè thì chứng tỏ Code sạch, sẵn sàng giao máy ảo cho khách hàng.

---

## 3. CÁC CÂU LỆNH CHUẨN BỊ (TRƯỚC KHI THẦY CÔ KIỂM TRA)
Hãy đảm bảo Docker Desktop được bật trước khi gọi Thầy Cô xem!

1. Kéo rèm màn hình (Bật Server):
```bash
docker compose up -d
```
2. Mở trình duyệt: `http://localhost`
3. Màn hình máy tính Thầy Cô nhìn: Chia đôi màn hình cực ngầu. Nửa trái Web bật F12 console. Nửa phải mở CMD gõ lệnh: (Cho Thầy cô coi Log chạy chữ ma trận siêu đẹp).
```bash
docker logs finance-api-gateway -f
```
4. Nếu thầy cô hỏi chỗ Tesseract chạy ảnh: Mở file `ai-service/app/routers/ai.py` giải thích chỗ Regex.
5. Xem Log Redis: 
```bash
docker logs finance-transaction-service -f
```

---
*Chúc bạn bảo vệ thật xuất sắc! Sự am hiểu tường tận kiến trúc này chính là thứ sẽ đánh gục điểm A+ của giảng viên!*
