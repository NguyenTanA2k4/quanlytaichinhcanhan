# 📊 KỊCH BẢN THUYẾT TRÌNH BÁO CÁO GIỮA KỲ (BẢN CHI TIẾT TỪNG CHỮ)
**Độ dài:** 11 slides. **Định dạng Nộp:** PDF.
> 💡 **Mẹo:** Những dòng có chữ **[Ghi trên Slide]** thì bạn copy dán vào file PowerPoint. Những dòng có chữ **🗣️ Lời thoại** là kịch bản bạn cầm rèn luyện đọc ở nhà để lên bục tự tin thuyết trình trôi chảy.

---

## 🟢 Slide 1: Thông tin nhóm (Mục 3.1)
**[Ghi trên Slide]:**
- **Tên Đề Tài:** Ứng dụng Quản lý Tài chính Thông minh (Finance Assistant) ứng dụng Microservices và AI.
- **Danh sách thành viên:** (Họ tên - MSSV)
- **Mục tiêu hệ thống:** 
  1. Xây dựng lõi Microservices phản hồi <0.1s.
  2. Tích hợp AI Offline (Tesseract) quét hóa đơn tự động.
  3. Quản trị phân tán, an toàn dữ liệu.
- 👉 **Link GitHub Mã Nguồn:** `[Link GitHub của bạn]`

**🗣️ Lời thoại thuyết trình:**
> *"Kính chào quý vị hội đồng Thầy Cô. Em/Nhóm em xin trình bày báo cáo giữa kỳ với đề tài: Finance Assistant – Ứng dụng tài chính thông minh ứng dụng kiến trúc Microservices và Trí tuệ Nhân tạo. Mục tiêu cốt lõi của đề tài không chỉ là một app ghi chép thu chi bình thường, mà là một hệ thống chịu tải cao, tốc độ phản hồi tức thì và hoàn toàn tự động hóa bằng AI."*

---

## 🟢 Slide 2: Thiết kế kiến trúc hệ thống (Mục 3.2 - CHỐT KIẾN TRÚC)
**[Ghi trên Slide]:**
- Sơ đồ Kiến trúc Microservices (Thêm ảnh sơ đồ hệ thống vào đây).
- Chia làm 4 Services Độc lập:
  - **Frontend:** ReactJS + Vite + Recharts.
  - **API Gateway:** Node.js (Chốt chặn bảo mật).
  - **Transaction Service:** Node.js + Postgres (Dịch vụ Lõi).
  - **AI Service:** Python FastAPI (Máy học và OCR).
- **Trục xương sống:** RabbitMQ (Message Broker) và Redis (Memory Cache).

**🗣️ Lời thoại thuyết trình:**
> *"Thay vì làm website một cục (Monolith), em đã xé nhỏ chức năng thành 4 cụm dịch vụ Vi Mô như trên sơ đồ. Các cụm sẽ giao tiếp với nhau. Điểm nhấn lớn nhất ở đây là 'Trục xương sống' RabbitMQ dùng để truyền lệnh từ Backend sang AI, và Redis dùng để lưu Cache siêu tốc."*

---

## 🟢 Slide 3: Giải trình thay đổi nền tảng Cloud (V/v Databricks)
**[Ghi trên Slide]:**
- **Sự khác biệt bản chất (OLTP vs OLAP):** App Tài chính là hệ thống OLTP (Giao dịch thời gian thực độ trễ < 100ms). Databricks là OLAP (Phân tích Big Data theo lô).
- **Rào cản Real-time AI:** Yêu cầu xử lý ảnh lấy số tiền lập tức không phù hợp cơ chế lập lịch Jobs của Cloud Delta Lake.
- **Kiến trúc chốt:** Sử dụng Docker Container xây dựng Microservices bám sát môn học "Kiến trúc hướng dịch vụ".

**🗣️ Lời thoại thuyết trình:**
> *"Thưa thầy, mặc dù tiêu chí môn học có đề cập làm Databricks, nhưng dựa trên góc nhìn Kỹ sư Phần mềm, em xin phép BẢO VỆ giải pháp của mình: Hệ thống của em là hệ thống Đọc/Ghi dữ liệu tốc độ vài phần nghìn giây (OLTP). Việc đưa Databricks vào lõi Database (vốn sinh ra cho OLAP Big Data) là sự khập khiễng vật lý, sẽ khiến App bị lag khi đợi Cluster khởi động. Do đó, em đã đưa hệ thống 100% lên Docker ảo hóa chuyên dụng cho Microservices!"*

---

## 🟢 Slide 4: Giải pháp Kỹ thuật 1: Bảo mật chặn Lũ (Anti-DDoS) & RabbitMQ
**[Ghi trên Slide]:**
- **API Gateway - Chốt chặn tử thần:** Chặn 100 queries/phút (Rate Limiting). Mã hóa JWT & BcryptJS.
- **RabbitMQ Bất Đồng Bộ:** Không bắt User chờ AI đọc xong ảnh. Queue (hàng đợi) nhận lệnh -> Báo thành công -> AI xử lý ngầm.

**🗣️ Lời thoại thuyết trình:**
> *"Để chống bị phá hoại DDoS, em đặt Rate Limiting ở cổng Gateway, request rác bị chặn đứng ngay khỏi lọt vào Database. Mặt khác, gọi AI thường mát gần 2 giây. Em rút ngắn bằng cách nhét lệnh nhờ đọc vo RabbitMQ, app web nhận kết quả thành công trước rồi mới âm thầm sửa số dư ở dưới Database."*

---

## 🟢 Slide 5: Tiến độ thực tế (Giao Diện UI)
**[Ghi trên Slide]:**
- *(Chèn 2-3 tấm hình: Form Đăng Nhập xịn xò, Bảng Điều Khiển Dashboard có biểu đồ 2 màu).*

**🗣️ Lời thoại thuyết trình:**
> *"Hình ảnh minh chứng trên slide là giao diện Web Frontend của em thực hiện 100% bằng Client-Side Rendering thư viện React. Nó sinh ra biểu đồ Pie Chart thống kê rất trực quan cho luồng tiền."*

---

## 🟢 Slide 6: Tiến độ thực tế (AI OCR & AI Phân Loại)
**[Ghi trên Slide]:**
- *(Chụp ảnh màn hình lúc tải cái Hóa Đơn Lên -> Tiền được tự nhập vào).*
- Công nghệ Máy học: Tesseract (Lấy chữ từ ảnh) + RegEx (Tìm giá trị) + Naive Bayes (Máy học hiểu đoạn mã là Môn Ăn uống).

**🗣️ Lời thoại thuyết trình:**
> *"Thành quả tâm đắc nhất của em lúc này là Cỗ Máy Nhận Diện Hóa Đơn hoàn toàn Offline. Em không thuê API của ChatGPT tốn tiền. Em đã nhúng lõi siêu xử lý ảnh Tesseract của Google vào, rồi dùng thuật toán biểu thức chính quy (Regex) nhặt chính xác số tiền Thanh toán Total. Trợ lý cực kỳ đắc lực để tiết kiệm thời gian nhập liệu!"*

---

## 🟢 Slide 7: Tiến độ thực tế (Auto DevOps / CI-CD)
**[Ghi trên Slide]:**
- *(Chụp hình GitHub Tab Actions có vòng tròn xanh lá cây Build Docker & Trivy).*
- Luồng phân phát tự động GitHub Actions CI Pipeline.

**🗣️ Lời thoại thuyết trình:**
> *"Vượt qua giới hạn lập trình cá nhân, em áp dụng tiêu chuẩn Doanh nghiệp: Mỗi lần em gõ phím viết thêm chức năng rồi đẩy lên Đám Mây GitHub, con Bot ảo sẽ tự giật code, tạo máy ảo Test lỗi toàn bộ khối kiến trúc. Kèm theo là quét lổ hổng Trivy Security. Thầy có thể thấy nó màu xanh tức là code em đáp ứng hoàn hảo bảo mật quốc tế."*

---

## 🟢 Slide 8: Live Demo (Trình diễn Tốc độ Bàn Thờ)
**[Ghi trên Slide]:**
- *"Kính mời Hội đồng xem kết quả chạy thật của dự án"*

**🗣️ Lời thoại thuyết trình:**
> *"Sau phần lý thuyết, em xin phép chiếu màn hình Localhost trải nghiệm Đồ án. Em sẽ demo quy trình (1) Đăng Nhập JWT, (2) Up Ảnh Hóa Đơn chạy Auto-fill tiền, và (3) F12 F5 liên tục để Thầy thấy thuật toán Redis Caching của em trả về dữ liệu nhanh dưới 0.001 giây (1 mili-giây) mà Database không mảy may nhúc nhích."*

---

## 🟢 Slide 9: Khó khăn và Vấn đề kỹ thuật
**[Ghi trên Slide]:**
- **Lỗi Mạng Container:** Đồng bộ giao thức giữa môi trường Node.js và Python trong mạng Docker nội bộ.
- **Xử lý Cú pháp Ảnh:** Thuật toán Regex vẫn chưa quét được một số hóa đơn bị nhàu nát mờ chữ.
- **Tiến độ chưa tới:** Chưa triển khai Đăng nhập ủy quyền Google (OAuth2).

**🗣️ Lời thoại thuyết trình:**
> *"Trong quá trình làm giữa kỳ, em gặp vô số khó khăn để đưa Microservices chạy mượt vì 2 cụm độc lập Node và Python kén mạng của nhau. Kèm với đó AI đọc chữ đôi khi vẫn chênh lệch nếu hóa đơn bị vò xát làm mờ."*

---

## 🟢 Slide 10: Kế hoạch đến Cuối Kỳ
**[Ghi trên Slide]:**
- **Mục tiêu 1:** Viết kiểm thử tự động (Unit Test / Integration Test) toàn diện.
- **Mục tiêu 2:** Làm sạch hóa đơn trước khi quét bằng thư viện độ nhạy cao.
- **Mục tiêu 3:** Xây dựng hệ thống lưu Ảnh vào đám mây lưu trữ cứng (Object Storage / Local Storage).

**🗣️ Lời thoại thuyết trình:**
> *"Với những khó khăn đó, từ nay đến Mùa thi Cuối Kỳ, em vạch rõ tiến độ 3 mục tiêu bám sát như trên. Trọng tâm em sẽ phát triển luồng lưu File Lên ổ cứng phân tán để app chịu tải mạnh mẽ hơn nữa."*

---

## 🟢 Slide 11: Tổng kết & Hỏi Đáp (Q&A)
**[Ghi trên Slide]:**
- *"Kết quả: Hệ thống chạy trơn tru - Kiến trúc chặt chẽ - Bảo mật toàn diện"*
- Cảm ơn quý Thầy Cô đã lắng nghe. Mời quý Thầy Cô nhận xét phản biện.
- 👉 **Link GitHub Mã Nguồn:** `[Link GitHub của bạn]`

**🗣️ Lời thoại thuyết trình:**
> *"Dạ thưa quý thầy cô, đó là toàn bộ 100% công sức của nhóm báo cáo tiến độ giữa kỳ. Nếu thầy cô có thắc mắc gì hoặc muốn thử độ chịu tải API, em sẵn sàng trả lời và biểu diễn ngay tại đây ạ."*
