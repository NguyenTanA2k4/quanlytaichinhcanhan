"""
classifier.py
─────────────
TF-IDF + Multinomial Naive Bayes để phân loại mô tả giao dịch tài chính.
Model được train ngay lúc import module – không cần file model bên ngoài.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import logging

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════
#  DỮ LIỆU HUẤN LUYỆN MẪU (tiếng Việt)
#  Format: (mô_tả_giao_dịch, danh_mục)
# ══════════════════════════════════════════════════════════════════
TRAINING_DATA = [
    # Ăn uống
    ("mua cà phê",                  "Ăn uống"),
    ("ăn phở bò",                   "Ăn uống"),
    ("đặt đồ ăn grab food",         "Ăn uống"),
    ("mua bánh mì sáng",            "Ăn uống"),
    ("ăn trưa cơm văn phòng",       "Ăn uống"),
    ("trà sữa highland",            "Ăn uống"),
    ("pizza hut cuối tuần",         "Ăn uống"),
    ("mua nước uống",               "Ăn uống"),
    ("ăn tối nhà hàng",             "Ăn uống"),
    ("order đồ ăn shopee food",     "Ăn uống"),

    # Hóa đơn / Tiền nhà
    ("đóng tiền nhà tháng 3",       "Hóa đơn"),
    ("thanh toán tiền điện",        "Hóa đơn"),
    ("nộp tiền nước tháng này",     "Hóa đơn"),
    ("phí internet wifi",           "Hóa đơn"),
    ("tiền thuê nhà tháng 2",       "Hóa đơn"),
    ("thanh toán hóa đơn điện thoại","Hóa đơn"),
    ("phí dịch vụ chung cư",       "Hóa đơn"),
    ("nộp tiền gas",                "Hóa đơn"),
    ("phí bảo trì thang máy",      "Hóa đơn"),

    # Di chuyển / Xăng xe
    ("đổ xăng xe máy",              "Di chuyển"),
    ("đặt grab bike đi làm",        "Di chuyển"),
    ("vé xe buýt tháng",            "Di chuyển"),
    ("phí gửi xe tháng",           "Di chuyển"),
    ("grab car đi sân bay",        "Di chuyển"),
    ("đổ xăng ô tô",               "Di chuyển"),
    ("vé tàu hỏa",                  "Di chuyển"),
    ("phí cầu đường cao tốc",       "Di chuyển"),

    # Mua sắm
    ("mua quần áo uniqlo",         "Mua sắm"),
    ("shopee mua đồ gia dụng",     "Mua sắm"),
    ("tiki mua sách giáo khoa",    "Mua sắm"),
    ("lazada mua phụ kiện điện thoại","Mua sắm"),
    ("mua giày thể thao",          "Mua sắm"),
    ("mua đồ nội thất ikea",       "Mua sắm"),
    ("siêu thị vinmart mua đồ",    "Mua sắm"),
    ("mua mỹ phẩm guardian",       "Mua sắm"),

    # Sức khỏe
    ("khám bệnh bệnh viện",        "Sức khỏe"),
    ("mua thuốc nhà thuốc",        "Sức khỏe"),
    ("phí bảo hiểm y tế",         "Sức khỏe"),
    ("tập gym the thao center",    "Sức khỏe"),
    ("khám răng nha khoa",         "Sức khỏe"),
    ("yoga class tháng này",       "Sức khỏe"),

    # Giải trí
    ("vé xem phim cgv",            "Giải trí"),
    ("netflix tháng này",          "Giải trí"),
    ("spotify premium",            "Giải trí"),
    ("mua game steam",             "Giải trí"),
    ("vé concert ca nhạc",        "Giải trí"),
    ("karaoke cuối tuần",          "Giải trí"),

    # Giáo dục
    ("học phí tiếng anh",         "Giáo dục"),
    ("mua khóa học udemy",        "Giáo dục"),
    ("sách lập trình python",     "Giáo dục"),
    ("học phí đại học",           "Giáo dục"),
    ("khóa học online coursera",  "Giáo dục"),

    # Thu nhập
    ("lương tháng 3",             "Thu nhập"),
    ("thưởng dự án",              "Thu nhập"),
    ("nhận lương cứng",           "Thu nhập"),
    ("hoa hồng bán hàng",        "Thu nhập"),
    ("freelance thiết kế web",    "Thu nhập"),
    ("tiền thưởng kpi",          "Thu nhập"),
]

# Tách features và labels
TEXTS  = [text  for text, _    in TRAINING_DATA]
LABELS = [label for _,    label in TRAINING_DATA]


# ══════════════════════════════════════════════════════════════════
#  XÂY DỰNG VÀ TRAIN PIPELINE
#  TfidfVectorizer → MultinomialNB
# ══════════════════════════════════════════════════════════════════
def _build_and_train() -> Pipeline:
    """
    Pipeline:
      1. TfidfVectorizer – chuyển text thành vector TF-IDF
         - analyzer='char_wb': dùng n-gram ký tự → xử lý tốt tiếng Việt
           không cần tách từ (word segmentation)
         - ngram_range=(2,4): bigram đến 4-gram ký tự
      2. MultinomialNB – phân loại Naive Bayes
    """
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            min_df=1,
            sublinear_tf=True,
        )),
        ("clf", MultinomialNB(alpha=0.1)),
    ])
    pipeline.fit(TEXTS, LABELS)
    logger.info("✅ Classifier trained on %d samples, categories: %s",
                len(TEXTS), sorted(set(LABELS)))
    return pipeline


# Train ngay khi module được import
_model: Pipeline = _build_and_train()


# ══════════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════════
def predict_category(text: str) -> dict:
    """
    Nhận một chuỗi mô tả giao dịch, trả về:
      {
        "category":    str,   # danh mục dự đoán
        "confidence":  float, # xác suất (0.0 – 1.0)
        "all_scores":  dict   # xác suất từng danh mục
      }
    """
    text = text.strip()
    if not text:
        return {"category": "Khác", "confidence": 0.0, "all_scores": {}}

    proba = _model.predict_proba([text])[0]
    classes = _model.classes_
    scores = dict(zip(classes, [round(float(p), 4) for p in proba]))

    best_idx  = proba.argmax()
    category  = classes[best_idx]
    confidence = float(proba[best_idx])

    return {
        "category":   category,
        "confidence": round(confidence, 4),
        "all_scores": scores,
    }
