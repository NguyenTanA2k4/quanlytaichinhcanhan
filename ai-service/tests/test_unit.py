"""
test_unit.py – AI Service Unit Tests
─────────────────────────────────────
Test thuật toán TF-IDF + Naive Bayes phân loại giao dịch
và kiểm tra logic OCR response parsing.
"""

import sys
import os
import re

# Thêm đường dẫn gốc để import được module app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.classifier import predict_category, LABELS, TRAINING_DATA

passed = 0
failed = 0


def assert_test(condition, test_name):
    global passed, failed
    if condition:
        print(f"  ✅ PASS: {test_name}")
        passed += 1
    else:
        print(f"  ❌ FAIL: {test_name}")
        failed += 1


# ══════════════════════════════════════════════════════════════
#  TEST GROUP 1: Kiểm tra Dữ liệu Huấn luyện
# ══════════════════════════════════════════════════════════════
print("\n📚 [TEST GROUP 1] Dữ liệu Huấn luyện")

assert_test(len(TRAINING_DATA) >= 50, f"Có ít nhất 50 mẫu huấn luyện (hiện có {len(TRAINING_DATA)})")
assert_test(len(set(LABELS)) >= 7, f"Có ít nhất 7 danh mục (hiện có {len(set(LABELS))})")

expected_categories = {"Ăn uống", "Hóa đơn", "Di chuyển", "Mua sắm", "Sức khỏe", "Giải trí", "Giáo dục", "Thu nhập"}
actual_categories = set(LABELS)
for cat in expected_categories:
    assert_test(cat in actual_categories, f"Danh mục '{cat}' tồn tại trong dữ liệu")


# ══════════════════════════════════════════════════════════════
#  TEST GROUP 2: Phân loại Đúng Danh mục (Accuracy Tests)
# ══════════════════════════════════════════════════════════════
print("\n🧠 [TEST GROUP 2] Phân loại Danh mục (TF-IDF + Naive Bayes)")

test_cases = [
    ("ăn cơm trưa", "Ăn uống"),
    ("mua cà phê", "Ăn uống"),
    ("phở bò", "Ăn uống"),
    ("đổ xăng", "Di chuyển"),
    ("grab đi làm", "Di chuyển"),
    ("tiền nhà tháng này", "Hóa đơn"),
    ("tiền điện", "Hóa đơn"),
    ("mua quần áo", "Mua sắm"),
    ("shopee", "Mua sắm"),
    ("khám bệnh viện", "Sức khỏe"),
    ("xem phim cgv", "Giải trí"),
    ("netflix", "Giải trí"),
    ("học phí", "Giáo dục"),
    ("lương tháng", "Thu nhập"),
    ("thưởng dự án", "Thu nhập"),
]

for text, expected in test_cases:
    result = predict_category(text)
    assert_test(
        result["category"] == expected,
        f"'{text}' → dự đoán '{result['category']}' (kỳ vọng '{expected}') [{result['confidence']:.0%}]"
    )


# ══════════════════════════════════════════════════════════════
#  TEST GROUP 3: Kiểm tra Cấu trúc Output
# ══════════════════════════════════════════════════════════════
print("\n📦 [TEST GROUP 3] Cấu trúc Output của predict_category()")

result = predict_category("mua bánh mì")
assert_test("category" in result, "Output có trường 'category'")
assert_test("confidence" in result, "Output có trường 'confidence'")
assert_test("all_scores" in result, "Output có trường 'all_scores'")
assert_test(isinstance(result["category"], str), "'category' là string")
assert_test(0.0 <= result["confidence"] <= 1.0, "'confidence' nằm trong khoảng [0, 1]")
assert_test(isinstance(result["all_scores"], dict), "'all_scores' là dict")
assert_test(len(result["all_scores"]) == len(set(LABELS)), f"'all_scores' có {len(set(LABELS))} danh mục")


# ══════════════════════════════════════════════════════════════
#  TEST GROUP 4: Edge Cases
# ══════════════════════════════════════════════════════════════
print("\n⚠️  [TEST GROUP 4] Edge Cases")

# Input rỗng
result_empty = predict_category("")
assert_test(result_empty["category"] == "Khác", "Input rỗng → trả về 'Khác'")
assert_test(result_empty["confidence"] == 0.0, "Input rỗng → confidence = 0")

# Input chỉ có khoảng trắng
result_spaces = predict_category("   ")
assert_test(result_spaces["category"] == "Khác", "Input toàn khoảng trắng → trả về 'Khác'")


# ══════════════════════════════════════════════════════════════
#  TEST GROUP 5: Kiểm tra OCR Response Parsing Logic
# ══════════════════════════════════════════════════════════════
print("\n📸 [TEST GROUP 5] OCR Response Parsing Logic")

# Mô phỏng response từ Gemini
sample_response = """AMOUNT:70000000
TYPE:expense
CATEGORY:Khác
DESC:Hóa đơn dịch vụ An Nam"""

amount = 0
tx_type = "expense"
category = "Khác"
description = "Từ hóa đơn OCR"

for line in sample_response.split('\n'):
    line = line.strip()
    if line.upper().startswith('AMOUNT:'):
        num_str = re.sub(r'\D', '', line.split(':', 1)[1])
        if num_str.isdigit():
            amount = int(num_str)
    elif line.upper().startswith('TYPE:'):
        val = line.split(':', 1)[1].strip().lower()
        if val in ('income', 'expense'):
            tx_type = val
    elif line.upper().startswith('CATEGORY:'):
        category = line.split(':', 1)[1].strip()
    elif line.upper().startswith('DESC:'):
        description = line.split(':', 1)[1].strip()

assert_test(amount == 70000000, f"Parse AMOUNT: {amount} == 70000000")
assert_test(tx_type == "expense", f"Parse TYPE: '{tx_type}' == 'expense'")
assert_test(category == "Khác", f"Parse CATEGORY: '{category}' == 'Khác'")
assert_test(description == "Hóa đơn dịch vụ An Nam", f"Parse DESC: '{description}'")

# Test với response có nhiều dòng rác
messy_response = """Here is the result:
AMOUNT:150000
TYPE:income
CATEGORY:Thu nhập
DESC:Lương tháng 3
Thank you!"""

amount2 = 0
for line in messy_response.split('\n'):
    line = line.strip()
    if line.upper().startswith('AMOUNT:'):
        num_str = re.sub(r'\D', '', line.split(':', 1)[1])
        if num_str.isdigit():
            amount2 = int(num_str)

assert_test(amount2 == 150000, f"Parse AMOUNT từ response có dòng rác: {amount2} == 150000")


# ── Kết quả ──────────────────────────────────────────────────
print("\n" + "═" * 50)
print(f"📊 KẾT QUẢ: {passed} passed, {failed} failed, {passed + failed} total")
print("═" * 50)

if failed > 0:
    sys.exit(1)
