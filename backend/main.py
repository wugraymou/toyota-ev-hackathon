"""
TOYOTA bZ4X 油轉電顧問工具 - 後端
對應文件：API設計規格_討論稿_v1.md

更新紀錄：
- cost-comparison 的保養成本/回廠次數已接上CDP真實查表資料（見 cdp_lookup.py）
- 加入基本錯誤處理：查不到車款時回傳 400 而不是讓伺服器壞掉
- 加入 .env 讀取機制，準備給之後 qa 端點呼叫 Claude API 用

啟動方式：
    uvicorn main:app --reload
啟動後打開 http://127.0.0.1:8000/docs 可以看到互動式API文件並直接測試。
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import cdp_lookup

# 讀取 .env 檔案裡的環境變數（例如之後qa端點要用的 ANTHROPIC_API_KEY）
load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

app = FastAPI(title="TOYOTA bZ4X 油轉電顧問工具 API", version="0.2.0")

# ---------------------------------------------------------------------------
# CORS 設定：允許前端開發伺服器呼叫這支後端。
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
# 1. GET /api/ev-overview —— 靜態總覽，不需要個人化輸入
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
# 新增：GET /api/models —— 回傳CDP查表裡有資料的車款清單
# 這支是規格文件原本沒列的，但前端「現有車款」輸入欄位需要知道有哪些
# 選項可以選（不然使用者亂打車款名稱，後面一定查不到），所以額外加上。
# 如果你們覺得不需要，前端也可以自己手刻一份固定清單，這支就用不到。
# ---------------------------------------------------------------------------
@app.get("/api/models")
def get_available_models():
    return {"models": cdp_lookup.list_available_models()}


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
    # TODO: 這裡先用一個很簡單的示範邏輯，之後 Product/AI Lead 定義好
    # 真正的評分模型後直接替換這段即可。
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
# 3. POST /api/cost-comparison —— 完整成本比較
# maintenance_cost_5yr、repair_visits_per_year 已接上CDP真實查表資料
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
    # --- 錯誤處理：查不到這個車款時，回傳400並附上清楚的錯誤訊息，
    # 而不是讓後面的程式碼在拿到 None 時直接壞掉 ---
    current_stats = cdp_lookup.get_model_stats(req.current_model)
    if current_stats is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"查不到車款「{req.current_model}」的資料，"
                f"可用車款清單請查 GET /api/models"
            ),
        )
    bz4x_stats = cdp_lookup.get_bz4x_stats()

    # --- 政府補助資格判斷（已經是真邏輯，不是假資料） ---
    car_age = datetime.now().year - req.purchase_year
    subsidy_eligible = car_age >= 10

    # --- 保養成本/次數：已接上CDP真實數據 ---
    maintenance_cost_5yr = {
        "current_car": round(current_stats["avg_annual_maintenance_cost"] * 5),
        "bz4x": round(bz4x_stats["avg_annual_maintenance_cost"] * 5),
    }
    repair_visits_per_year = {
        "current_car": current_stats["avg_annual_visits"],
        "bz4x": bz4x_stats["avg_annual_visits"],
    }

    return {
        # total_cost_5yr 目前還是假資料，等 purchase_cost / mileage_cost 都接上真邏輯後
        # 這裡也要跟著改成真的加總，先留意這個欄位還不能直接拿去做最終呈現
        "total_cost_5yr": {"current_car": 980000, "bz4x": 850000},
        "breakdown": {
            "purchase_cost": {"current_car": 900000, "bz4x": 1350000},  # TODO: 待補真實定價
            "mileage_cost_5yr": {"current_car": 172500, "bz4x": 45000},  # TODO: 待補真實電耗/油耗數據
            "maintenance_cost_5yr": maintenance_cost_5yr,
            "repair_visits_per_year": repair_visits_per_year,
            "government_subsidy_estimate": {
                "eligible": subsidy_eligible,
                "amount_range": [16000, 19100] if subsidy_eligible else [0, 0],
                "condition": "現有車須報廢滿10年以上，透過車輛汰舊換新抵換媒合平台申請，名額有限",
            },
            "trade_in_estimate": 450000,  # TODO: 待補真實邏輯
        },
        "battery_warranty_note": "電池保固年限/里程與耗損曲線待補（見規格文件外部資料清單）",
        "max_range_km": {"current_car_note": "依現有車型油箱續航", "bz4x": 615},  # TODO: 待補官方規格
        "nearby_charging_stations": {"radius_km": 5, "count": 12},  # TODO: 待補真實資料源
        "data_source_note": {
            "current_car_sample_size": current_stats["sample_size"],
            "bz4x_sample_size": bz4x_stats["sample_size"],
        },
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
    # TODO: 這裡之後換成呼叫 Claude API（金鑰已經可以用 ANTHROPIC_API_KEY 拿到），
    # 把 req.context（前面算出的 suitability/cost-comparison結果）一起放進
    # prompt，讓回答有憑有據。
    if not ANTHROPIC_API_KEY:
        # 先提醒自己金鑰還沒設定好，總比呼叫API時才發現要清楚
        return QAResponse(
            answer="（尚未設定 ANTHROPIC_API_KEY，目前是示範回覆）"
            f"你問的是：「{req.question}」。"
        )
    return QAResponse(
        answer=f"（示範回覆，尚未接上真正的AI）你問的是：「{req.question}」。"
        f"之後這裡會結合你的個人化試算結果，給出有根據的解釋。"
    )