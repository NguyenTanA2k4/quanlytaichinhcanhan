import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import httpx
import re
import io
from PIL import Image
import pytesseract

router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TRANSACTION_SERVICE_URL = os.getenv("TRANSACTION_SERVICE_URL", "http://transaction-service:8001")


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


@router.post("/ocr", response_model=OCRResponse)
async def scan_receipt(file: UploadFile = File(...)):
    """Trích xuất văn bản hóa đơn bằng Tesseract OCR và dùng Regex tìm Tổng Tiền."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file định dạng hình ảnh.")

    try:
        # Đọc dữ liệu ảnh vào bộ nhớ RAM
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Gọi Tesseract (lang=vie cho chữ tiếng Việt)
        raw_text = pytesseract.image_to_string(image, lang='vie')
        
        # Dọn dẹp khoảng trắng dư thừa
        clean_text = '\\n'.join([line.strip() for line in raw_text.splitlines() if line.strip()])
        
        # ─── THUẬT TOÁN TÌM KIẾM "TỔNG SỐ TIỀN" (Regex) ───
        amount = 0
        # Tìm các chuỗi kiểu "Tổng cộng 150.000" hoặc "Total: 150,000"
        pattern = re.compile(r'(?i)(tổng cộng|tổng|total|thanh toán|cộng)[\s:]*([\d\.\,]+)\b')
        matches = pattern.finditer(clean_text)
        
        best_match = 0
        for m in matches:
            num_str = m.group(2).replace('.', '').replace(',', '')
            if num_str.isdigit():
                val = int(num_str)
                if val > best_match:
                    best_match = val
                    
        if best_match > 0:
            amount = best_match
        else:
            # Nếu không tìm thấy chữ "tổng", rà quét toàn văn bản lấy số tiền to nhất trên 1000.
            all_nums = re.findall(r'\b([\d\.\,]{4,})\b', clean_text)
            max_num = 0
            for num_str in all_nums:
                c_num = num_str.replace('.', '').replace(',', '')
                if c_num.isdigit():
                    val = int(c_num)
                    if val > max_num:
                        max_num = val
            amount = max_num
            
        return OCRResponse(amount=amount, text=clean_text[:500])
        
    except Exception as e:
        print(f"OCR Scan Error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi xử lý ảnh OCR.")


