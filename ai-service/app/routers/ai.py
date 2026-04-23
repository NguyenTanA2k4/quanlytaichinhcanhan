import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import httpx
import re
import io
from PIL import Image
import pytesseract
import google.generativeai as genai

router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TRANSACTION_SERVICE_URL = os.getenv("TRANSACTION_SERVICE_URL", "http://transaction-service:8001")

# Configure Gemini if the key is provided
if OPENAI_API_KEY:
    try:
        genai.configure(api_key=OPENAI_API_KEY)
        print("Gemini API configured successfully.")
    except Exception as e:
        print(f"Failed to configure Gemini: {e}")


class AnalyzeRequest(BaseModel):
    user_id: str
    question: Optional[str] = "Phân tích tình hình tài chính của tôi"


class AnalyzeResponse(BaseModel):
    answer: str
    summary: dict


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_finances(payload: AnalyzeRequest):
    """Fetch recent transactions and generate AI financial advice."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{TRANSACTION_SERVICE_URL}/transactions/",
                params={"user_id": payload.user_id, "limit": 50},
                timeout=10.0,
            )
            resp.raise_for_status()
            transactions = resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Could not fetch transactions: {e}")

    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    balance = total_income - total_expense

    # Placeholder AI answer (replace with real LLM call when OPENAI_API_KEY is set)
    answer = (
        f"Trong {len(transactions)} giao dịch gần nhất:\n"
        f"• Tổng thu: {total_income:,.0f} VNĐ\n"
        f"• Tổng chi: {total_expense:,.0f} VNĐ\n"
        f"• Số dư: {balance:,.0f} VNĐ\n\n"
        "Lời khuyên: Hãy kiểm soát chi tiêu theo danh mục để tối ưu ngân sách."
    )

    return AnalyzeResponse(
        answer=answer,
        summary={
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": balance,
            "transaction_count": len(transactions),
        },
    )


class OCRResponse(BaseModel):
    amount: int
    text: str
    category: str = ""
    type: str = "expense"
    description: str = ""


@router.post("/ocr", response_model=OCRResponse)
async def scan_receipt(file: UploadFile = File(...)):
    """Trích xuất Tổng Tiền + Danh mục + Loại từ ảnh hóa đơn bằng Google Gemini Vision AI."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file định dạng hình ảnh.")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="API Key chưa được cấu hình.")

        # Model names lấy từ API list_models (đã kiểm chứng hoạt động)
        MODEL_CANDIDATES = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-2.5-flash',
        ]

        prompt = (
            "Bạn là chuyên gia kế toán Việt Nam. Đọc hóa đơn/biên lai trong ảnh này.\n"
            "Trả về CHÍNH XÁC theo format sau (mỗi dòng một giá trị, không thêm gì khác):\n"
            "AMOUNT:số_tiền_nguyên\n"
            "TYPE:expense hoặc income\n"
            "CATEGORY:danh_mục\n"
            "DESC:mô_tả_ngắn\n\n"
            "QUY TẮC SỐ TIỀN:\n"
            "- '70 triệu VNĐ' → AMOUNT:70000000\n"
            "- '150k' hoặc '150 nghìn' → AMOUNT:150000\n"
            "- '1.500.000' → AMOUNT:1500000\n"
            "- Luôn quy đổi thành số nguyên đầy đủ, không dấu chấm/phẩy\n\n"
            "QUY TẮC DANH MỤC (chọn 1 trong các danh mục sau):\n"
            "Ăn uống, Hóa đơn, Di chuyển, Mua sắm, Sức khỏe, Giải trí, Giáo dục, Thu nhập, Khác\n\n"
            "QUY TẮC LOẠI:\n"
            "- Nếu là hóa đơn thanh toán/mua hàng → TYPE:expense\n"
            "- Nếu là phiếu thu/lương → TYPE:income\n\n"
            "VÍ DỤ KẾT QUẢ ĐÚNG:\n"
            "AMOUNT:70000000\n"
            "TYPE:expense\n"
            "CATEGORY:Khác\n"
            "DESC:Hóa đơn dịch vụ An Nam\n"
        )

        last_error = None
        for model_name in MODEL_CANDIDATES:
            try:
                print(f"[OCR] Đang thử model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([prompt, image])
                result_text = response.text.strip()
                print(f"[OCR] Model {model_name} trả về:\n{result_text}")

                # Parse kết quả có cấu trúc
                amount = 0
                tx_type = "expense"
                category = "Khác"
                description = "Từ hóa đơn OCR"

                for line in result_text.split('\n'):
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

                if amount > 0:
                    return OCRResponse(
                        amount=amount,
                        text=f"[Gemini AI] {amount:,} VNĐ",
                        category=category,
                        type=tx_type,
                        description=description
                    )
                else:
                    print(f"[OCR] Không tìm thấy số tiền, thử model tiếp...")
                    continue

            except Exception as e:
                last_error = e
                print(f"[OCR] Model {model_name} lỗi: {e}")
                continue

        error_msg = f"Không đọc được hóa đơn. Lỗi: {last_error}"
        print(f"[OCR] {error_msg}")
        return OCRResponse(amount=0, text=error_msg)

    except HTTPException:
        raise
    except Exception as e:
        print(f"OCR Scan Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý ảnh: {str(e)}")
