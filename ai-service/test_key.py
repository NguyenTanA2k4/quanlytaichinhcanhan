import os
import google.generativeai as genai

api_key = os.getenv("OPENAI_API_KEY", "")
print(f"API Key (first 15 chars): {api_key[:15]}...")

genai.configure(api_key=api_key)

print("\n=== Danh sách Models khả dụng ===")
try:
    count = 0
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"  ✅ {m.name}")
            count += 1
    if count == 0:
        print("  ❌ Không có model nào khả dụng! Key có thể bị lỗi.")
    else:
        print(f"\n  Tổng: {count} models sẵn sàng.")
except Exception as e:
    print(f"  ❌ LỖI: {e}")
