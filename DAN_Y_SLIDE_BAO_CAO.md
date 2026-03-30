# 📊 DÀN Ý TRÌNH BÀY SLIDE ĐỒ ÁN MÔN HỌC
**Tên đề tài:** Cài đặt Ứng dụng Quản lý Tài chính cá nhân với Kiến trúc Microservices & AI Tesseract OCR

> Dưới đây là cấu trúc trình bày chi tiết từ 10 - 15 Slide để bạn tự làm trên PowerPoint hoặc Canva. Cấu trúc được thiết kế theo chuẩn báo cáo Đồ án Kỹ thuật: **Mở bài (Vấn đề) -> Phân tích Giải pháp Kỹ thuật -> Tính năng nổi bật -> Live Demo -> Kết luận.**

---

## 🟢 Slide 1: Trang bìa (Tiêu đề)
- **Tên Đề Tài:** Ứng dụng Quản lý Tài chính Thông minh (Finance Assistant) ứng dụng Microservices và AI.
- **Giảng viên hướng dẫn:** (Điền tên thầy cô)
- **Sinh viên thực hiện:** (Điền tên bạn)
- **Lớp / Mã SV:** (Điền thông tin)

## 🟢 Slide 2: Đặt Vấn Đề (Tại sao làm app này?)
- **Thực trạng:** Giới trẻ khó kiểm soát chi tiêu cá nhân. Ghi chép trên sổ tay hoặc Excel thủ công quá tốn thời gian.
- **Khó khăn của các app hiện tại:** Phải nhập tay 100%, không có trí tuệ nhân tạo (AI) tự động phân tích hay quét hóa đơn, tốc độ tải dữ liệu đôi khi chậm khi có nhiều giao dịch.
- **Mục tiêu đồ án:** Xây dựng hệ thống web siêu tốc, tích hợp AI phân loại rảnh tay & máy quét ảnh hóa đơn Offline. Đảm bảo an toàn dữ liệu và khả năng chịu tải hàng nghìn lượt truy cập (Microservices).

## 🟢 Slide 3: Tổng Quan Kiến Trúc (QUAN TRỌNG TỐI ĐA)
> *(Gợi ý: Hãy chụp ảnh hoặc vẽ một sơ đồ khối (Diagram) hệ thống hiển thị trang chủ của App)*
- Ứng dụng không viết chung 1 cục (Monolith), mà xé nhỏ 4 cụm dịch vụ (Microservices):
  1. **Frontend:** ReactJS + Vite (Giao diện hiển thị tối ưu hóa component).
  2. **API Gateway:** Node.js (Người bảo vệ, hứng mọi request từ Frontend).
  3. **Transaction Service:** Node.js + Postgres (Dịch vụ Lõi, quản lý thu chi).
  4. **AI Service:** Python FastAPI (Khối lượng Machine Learning và Xử lý ảnh phân tích mạnh nhất).
- **Trục xương sống:** RabbitMQ (Message Broker) và Redis (Memory Cache).

## 🟢 Slide 4: Giải pháp Kỹ thuật #1: Rate Limiting & API Gateway
- **Cổng vào duy nhất:** Gateway thu gom quyền kiểm soát (Port 8080).
- **Tính năng bảo mật:** `CORS` ngăn chặn request lậu ngoài domain.
- **Anti-DDos (Rate-Limiting):** Chặn 100 queries/phút bảo vệ Database khỏi sụp đổ bởi các tool hack Spam liên tục.

## 🟢 Slide 5: Giải pháp Kỹ thuật #2: Tối ưu dữ liệu với Redis Caching
- **Vấn đề:** Khi có 10,000 giao dịch, Postgres query SQL lấy data sẽ tốn hàng trăm mili-giây.
- **Giải pháp:** Khi User lướt trang, CSDL lấy dữ liệu ra và lưu 1 bản Copy lên thanh RAM (Tức là Redis). Lần F5 trang tiếp theo, Backend móc luôn dữ liệu từ RAM ném ra trong **0.001s** (Bảo toàn sống còn cho Database).

## 🟢 Slide 6: Giải pháp Kỹ thuật #3: Bất đồng bộ với RabbitMQ
- **Ngữ cảnh:** Gọi AI (Python) mất thời gian tính toán. Nếu Node.js chờ Python xử lý xong mới trả lời User thì Web sẽ bị xoay (Loading Timeout).
- **Giải pháp:** Chuyển giao hệ thống Nhắn tin hàng đợi (Message Queue) RabbitMQ.
  - Node.js đẩy text mới nhập vào Queue rồi báo "Đã lưu".
  - Python chộp lấy xử lý ngầm và cập nhật trả lại Database. -> Web chạy siêu mượt.

## 🟢 Slide 7: Thuật Toán Điểm 10: Machine Learning TF-IDF & Naive Bayes
- **Hệ AI phân loại (Không dựa vào ChatGPT):**
  - **TF-IDF:** Thuật toán dò tìm tần suất độ quan trọng của chữ. Ví dụ câu "Mua sách giáo khoa", từ "sách giáo khoa" mang tính quyết định môn Học Tập (Giáo dục).
  - **Naive Bayes Algorithm:** Thuật toán xác suất thống kê định lượng nhãn cao nhất (Hiển thị phần trăm % độ tự tin do Model tự phân loại).

## 🟢 Slide 8: Thuật Toán Điểm 10: Máy Quét OCR Offline Nguyên Quán
- **Vấn đề:** Lười nhập tiền lúc được thối tiền ở hóa đơn quán ăn.
- **Tesseract OCR (Optical Character Recognition):** Vận dụng lõi nhận diện ảnh siêu quyền lực của Google chạy âm thầm ngay dưới máy áo Docker. Đọc 100% Tiếng Việt rành mạch không lọt chữ.
- **Regular Expressions (Regex):** Lọc toàn bộ chữ để bắt từ khóa Regex: Xét các chữ "TỔNG CỘNG" hoặc "TOTAL" để lọc vớt chỉ số lượng Số Tiền lớn nhất một cách chính xác.

## 🟢 Slide 9: DevOps Automation (CI/CD với Github Actions)
- **Tự động hóa toàn diện:** Không cần up code bằng tay. Khi Code được DEV (em) đẩy (Push) lên nhánh `main`, con Bot CI Pipeline của Github trên Cloud sẽ tự động: Checkout -> Build Docker Image -> Setup Network. 

## 🟢 Slide 10: Live Demo (Trình diễn sản phẩm trực tiếp)
- *Thầy ơi bây giờ em xin phép biểu diễn đồ án Live (Chạy thật 100%).*
- **Kịch bản Demo:**
  1. Login Web -> Giao diện Dashboard cực nghệ.
  2. Bấm "Thêm giao dịch bằng Nhập tay" chèn 1 cái tên -> Nhờ AI Server nhạn diện tự động đổi Thể loại.
  3. Bấm "Tải Ảnh Hóa Đơn" -> Khoe chức năng Tesseract lấy chuẩn đứt Số dư.
  4. F5 Refresh liên tục -> Show Terminal Log "CACHE HIT" rực đỏ bằng Redis.

## 🟢 Slide 11: Tổng kết & Hướng phát triển tương lai
- **Kết quả đạt được:** Hệ thống vận hành trơn tru chuẩn vi dịch vụ chuẩn công nghiệp. Tốc độ cao, bảo mật, thông minh.
- **Phát triển mai sau:** Mở tính năng Báo cáo biểu đồ (Charts), tích hợp OAUTH2 (Đăng nhập Google), Build thành App Mobile (React Native).

## 🟢 Slide 12: Q&A (Hỏi & Đáp)
- "Trân trọng cảm ơn quý Thầy Cô đã lắng nghe ạ. Mời quý Thầy Cô đặt câu hỏi phản biện."
