import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

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
