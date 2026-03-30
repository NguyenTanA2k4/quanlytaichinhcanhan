# 🌐 Hướng dẫn Đẩy Code lên GitHub & Kích hoạt CI/CD

Để đưa Đồ án của bạn ra thế giới và cho thầy cô thấy độ chuyên nghiệp (tự động chạy **CI/CD Pipeline** mỗi lần nộp code), mình cùng làm theo các bước chuẩn kỹ sư DevOps sau đây:

---

## BƯỚC 1: Dọn dẹp File Rác (Tạo `.gitignore`)
Trước khi đẩy code, **TUYỆT ĐỐI KHÔNG** được đẩy các thư mục nặng như `node_modules` hay file chứa mật khẩu nhạy cảm `.env`.
Hãy chắc chắn là bạn có file tên `.gitignore` nằm ngay ở thư mục gốc (`C:\Users\admin\Desktop\finance-assistant`). Nếu chưa có, hãy tạo nó và dán nội dung này vào:

```text
# Node & Python
node_modules/
__pycache__/
*.pyc

# Docker & Auth
.env
postgres_data/
rabbitmq_data/

# OS Files
.DS_Store
Thumbs.db
```

## BƯỚC 2: Khởi tạo Git & Đóng gói Code dưới máy tính
Mở **Terminal / PowerShell** tại đúng thư mục `finance-assistant` và gõ lần lượt 3 lệnh này:

```bash
git init
git add .
git commit -m "🚀 Hoàn thành Siêu Đồ Án Finance Assistant V2 (Microservices + AI OCR)"
```

## BƯỚC 3: Tạo Kho chứa (Repository) trên GitHub
1. Mở trình duyệt vào trang [GitHub](https://github.com/) và Đăng nhập.
2. Bấm nút **[+] New repository** ở góc phải trên.
3. Đặt tên là `finance-assistant-microservices` (hoặc tên tùy thích).
4. Chế độ: **Public** hay **Private** tùy bạn (Public thì thầy cô mới bấm link xem code được dễ dàng).
5. **Quan trọng:** Kéo xuống DƯỚI CÙNG và chừa trống hết không tích vào "Add a README" hay "Add .gitignore" vì code mình đã có sẵn -> Nhấn **Create repository**.

## BƯỚC 4: Bắn Code từ Máy Bạn lên Đám Mây GitHub ☁️
Sau khi tạo xong, GitHub sẽ cho bạn 1 đường link URL (ví dụ: `https://github.com/TenCuaBan/finance-assistant-microservices.git`). Quay lại Terminal và gõ:

```bash
git branch -M main
git remote add origin <DÁN_LINK_GITHUB_CỦA_BẠN_VÀO_ĐÂY>
git push -u origin main
```
*(Nếu GitHub có hỏi đăng nhập thì cứ điền acc/pass hoặc cấp quyền cho trình duyệt).*

---

## 🎯 BƯỚC CHẤM ĐIỂM 10: TẬN HƯỞNG CI/CD PIPELINE CHẠY TỰ ĐỘNG

Nhớ file `.github/workflows/ci.yml` tao đã viết giùm bạn ở bước trước không? Đây là lúc nó tỏa sáng!

1. Trở lại tab trình duyệt GitHub của Đồ án. Bấm vào chữ **"Actions"** (Nằm sát nút "Pull requests").
2. Bạn sẽ thấy 1 tiến trình đang quay vòng màu Vàng mang tên "**🚀 Hoàn thành Siêu Đồ Án...**".
3. **Giải thích cho Thầy Cô ở bước này:** *"Dạ thưa Giám khảo, thay vì copy ném file thủ công, máy bay trực thăng GitHub Actions trên mây Mỹ (Ubuntu Runner) đang tự động hốt code của em về, Build lại 4 cục Microservices bằng Docker để xem em code có bị chết hay rớt mạng ở server nào không. Và kiểm tra bảo mật Trivy!*".
4. Ngồi chờ tầm 2 phút, nếu nó tick V xanh lè ✅ thì chứng tỏ Code Mượt, Build Khỏe, Ẵm Chọn Điểm 10 DevOps!

Bạn làm theo 4 bước trên nhé. Chúc mừng "hạ cánh" an toàn với Điểm A đồ án môn này! 🏆🎉
