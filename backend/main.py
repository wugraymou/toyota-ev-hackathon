"""
TOYOTA bZ4X 油轉電顧問工具 - 後端骨架 (mock版)
對應文件：API設計規格_討論稿_v1.md

這份是「先架端點、回假資料」的骨架，讓前端可以立刻對接開發。
之後把 TODO 標記的地方換成真正的計算邏輯即可，端點網址與資料格式都不用改，
前端那邊完全不需要跟著改程式碼。

啟動方式：
    uvicorn main:app --reload
啟動後打開 http://127.0.0.1:8000/docs 可以看到互動式API文件並直接測試。
"""

from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="TOYOTA bZ4X 油轉電顧問工具 API", version="0.1.0")

# ---------------------------------------------------------------------------
# CORS 設定：允許前端開發伺服器呼叫這支後端。
# 前端常見的本機開發網址都先加進來，你們實際用哪個框架就會用到對應的那個。
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React (Create React App 預設)
        "http://localhost:5173",   # React + Vite 預設
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# 1. GET /api/ev-overview  —— 靜態總覽，不需要個人化輸入
# ---------------------------------------------------------------------------
@app.get("/api/ev-overview")
def get_ev_overview():
    return {
        "avg_mileage_cost_per_km": {"gas": 2.3, "bz4x": 0.6},
        "avg_purchase_price_range": {
            "gas_hev_compact_suv": [850000, 1050000],
            "bz4x": [1300000, 1450000],
        },
        "avg_charging_time_home": "6-8小時（220V家用）",
        "avg_charging_time_fast": "30分鐘充至80%",
        "driving_feel_note": "靜音、加速平順，無變速箱換檔頓挫感",
    }


# ---------------------------------------------------------------------------
# 2. POST /api/suitability —— 個人化適合度分析
# ---------------------------------------------------------------------------
class SuitabilityRequest(BaseModel):
    current_model: str
    annual_mileage: int
    budget: int
    usage_scenario: str          # commute / long_trip / family / mixed
    has_home_charging: bool
    residence_city: str


class SuitabilityResponse(BaseModel):
    suitability_score: int
    suitability_level: str
    reason: str


@app.post("/api/suitability", response_model=SuitabilityResponse)
def post_suitability(req: SuitabilityRequest):
    # TODO: 這裡先用一個很簡單的示範邏輯（年里程高 + 有家充 = 分數較高），
    # 之後 Product/AI Lead 定義好真正的評分模型後直接替換這段即可。
    score = 50
    if req.annual_mileage >= 12000:
        score += 20
    if req.has_home_charging:
        score += 15
    score = min(score, 99)

    if score >= 80:
        level = "高度適合"
        reason = "你的年里程偏高且有自宅充電條件，換購後里程成本可大幅下降"
    elif score >= 60:
        level = "中度適合"
        reason = "你的用車模式轉換後有一定效益，建議搭配成本試算進一步評估"
    else:
        level = "需再評估"
        reason = "以目前資料來看，換購效益不明顯，建議先查看詳細成本比較"

    return SuitabilityResponse(suitability_score=score, suitability_level=level, reason=reason)


# ---------------------------------------------------------------------------
# 3. POST /api/cost-comparison —— 完整成本比較（先回假資料）
# ---------------------------------------------------------------------------
class CostComparisonRequest(BaseModel):
    current_model: str
    purchase_year: int
    annual_mileage: int
    budget: int
    residence_city: str
    usage_scenario: str


@app.post("/api/cost-comparison")
def post_cost_comparison(req: CostComparisonRequest) -> Dict[str, Any]:
    # 這裡做一個小示範：政府補助資格判斷是唯一已經接上「真邏輯」的部分，
    # 其餘數字先回傳固定的範例值（取自CDP資料的真實均值，比隨便填的數字更可信）。
    car_age = datetime.now().year - req.purchase_year
    subsidy_eligible = car_age >= 10

    return {
        "total_cost_5yr": {"current_car": 980000, "bz4x": 850000},
        "breakdown": {
            "purchase_cost": {"current_car": 900000, "bz4x": 1350000},
            "mileage_cost_5yr": {"current_car": 172500, "bz4x": 45000},
            "maintenance_cost_5yr": {"current_car": 92885, "bz4x": 52255},
            "repair_visits_per_year": {"current_car": 2.7, "bz4x": 2.69},
            "government_subsidy_estimate": {
                "eligible": subsidy_eligible,
                "amount_range": [16000, 19100] if subsidy_eligible else [0, 0],
                "condition": "現有車須報廢滿10年以上，透過車輛汰舊換新抵換媒合平台申請，名額有限",
            },
            "trade_in_estimate": 450000,
        },
        "battery_warranty_note": "電池保固年限/里程與耗損曲線待補（見規格文件外部資料清單）",
        "max_range_km": {"current_car_note": "依現有車型油箱續航", "bz4x": 615},
        "nearby_charging_stations": {"radius_km": 5, "count": 12},
    }


# ---------------------------------------------------------------------------
# 4. POST /api/qa —— 問答工具（先回罐頭回覆，之後接LLM）
# ---------------------------------------------------------------------------
class QARequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None


class QAResponse(BaseModel):
    answer: str


@app.post("/api/qa", response_model=QAResponse)
def post_qa(req: QARequest):
    # TODO: 這裡之後換成呼叫 Claude API，把 req.context（前面算出的
    # suitability/cost-comparison結果）一起放進 prompt，讓回答有憑有據。
    return QAResponse(
        answer=f"（示範回覆，尚未接上真正的AI）你問的是：「{req.question}」。"
        f"之後這裡會結合你的個人化試算結果，給出有根據的解釋。"
    )
