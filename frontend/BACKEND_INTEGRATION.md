# TOYOTA AI 智慧顧問｜前後端串接規格（提案版）

本文件定義目前前端診斷流程預期的後端介面，供前後端協作確認。**目前只完成前端示範，本文件中的新增路由均為建議契約，不代表後端已實作。**既有 FastAPI 路由則以 `backend/main.py` 現況為準。

## 1. 前端目前提供什麼

首頁包括六步需求診斷（年里程、停車／充電、預算、乘車情境、主要疑慮、現有車款），快速選項與自由文字、能源方案方向、報告版面、預約表單示意，以及「明確勾選同意後才顯示」的業務摘要。全部使用本機示範邏輯，不呼叫 API、不保存或傳送資料；預約表單也不會建立真實預約。成本、充電站、電池保固和殘值均以待串接狀態呈現，不是實際估算。

建議未來把 `frontend/app/page.tsx` 中的本機 `answerQuestion`／`recommendation`／報告準備邏輯抽換成 API client；互動流程與元件不必綁定任何特定 LLM 廠牌。

## 2. 目前後端已存在的 API

| 方法與路徑 | 目前用途 | 串接注意事項 |
| --- | --- | --- |
| `GET /api/ev-overview` | 概覽靜態資料 | 部分為範例值；展示前需標示來源與日期。 |
| `GET /api/models` | 可用車款名稱 | 可用於現有車款選項。 |
| `POST /api/suitability` | 簡單適合度規則 | 必填 `current_model`, `annual_mileage`, `budget`, `usage_scenario`, `has_home_charging`, `residence_city`；目前規則及評分為示範。 |
| `POST /api/cost-comparison` | 成本比較 | 必填 `current_model`, `purchase_year`, `annual_mileage`, `budget`, `residence_city`, `usage_scenario`。總成本、購車成本、能源成本、殘值及附近站點目前仍含固定示範值，不可直接作正式報價。 |
| `POST /api/qa` | 單輪問答 | 接受 `question` 與可選 `context`；現有程式即使設定 API key 也尚未呼叫 LLM，回覆仍是示範文字。 |

目前後端 CORS 白名單為 localhost／127.0.0.1 的 3000 與 5173 埠。前端部署位置改變時，需設定正式來源及憑證策略。開發時以 `http://localhost:3000` 開啟前端，API base URL 由環境變數或 API client 設定，不要把 LLM 金鑰放入 `NEXT_PUBLIC_*` 或任何瀏覽器程式。

## 3. 建議的端點契約

### 3.1 對話與動態需求診斷

建議由後端保存對話狀態並協調 LLM 與工具：

```http
POST /api/consultations
Content-Type: application/json
```

```json
{
  "locale": "zh-TW",
  "entry_topic": "charging",
  "message": "沒有家用充電，電動車適合我嗎？",
  "profile": {},
  "consent": { "analytics": false, "sales_handoff": false }
}
```

建議回傳：

```json
{
  "consultation_id": "opaque-session-id",
  "assistant_message": "我先了解你的停車條件。平常停車的地方可以使用固定充電設備嗎？",
  "quick_replies": ["可安裝家用充電樁", "社區有公共充電", "公司附近有充電站", "目前都不方便"],
  "profile": { "annual_mileage_km": null, "charging_access": null },
  "missing_fields": ["annual_mileage_km", "charging_access"],
  "completion": 0.2
}
```

後續訊息沿用 session：

```http
POST /api/consultations/{consultation_id}/messages
```

```json
{ "message": "我住公寓，公司附近有公共充電站。" }
```

回傳相同的 assistant message／quick replies／profile 格式。`profile` 欄位建議包含 `current_model`, `purchase_year`, `annual_mileage_km`, `budget_twd`, `usage_scenario`, `parking_type`, `charging_access`, `residence_city`, `household_needs`, `main_concerns`。未知資料用 `null` 表示；不可由模型自行補造數字。快速選項與自由文字都走同一個訊息介面。

### 3.2 個人化能源方案與報告

```http
POST /api/consultations/{consultation_id}/report
```

建議回傳以來源與估算假設為一級欄位：

```json
{
  "generated_at": "2026-10-13T10:00:00+08:00",
  "profile": { "annual_mileage_km": 15000, "charging_access": "workplace_public" },
  "recommendation": {
    "energy_type": "bev",
    "model": "bZ4X",
    "reasons": ["可使用公司附近公共充電"],
    "alternatives": [{ "energy_type": "hev", "model": "待選車款", "reason": "作為充電彈性較高的替代方案" }]
  },
  "tco": {
    "currency": "TWD",
    "holding_years": [3, 5, 8],
    "scenarios": [],
    "assumptions": [],
    "data_sources": [],
    "limitations": []
  },
  "charging": { "searched_at": null, "radius_km": null, "stations": [], "route_plan": null, "data_source": null },
  "battery_and_resale": { "warranty": null, "resale_range": null, "assumptions": [], "data_source": null },
  "disclaimer": "估算供參考，非購車報價或殘值保證。"
}
```

`scenarios` 應區分油車／油電／純電方案，逐項包含購車與折舊、能源、保養、補助及持有總成本；資料不足就回 `null` 與缺少原因，不用假數字補齊。所有金額須帶幣別，所有估值要附資料日期、來源、使用假設及範圍。充電站資料要回傳更新時間及營運狀態；不可把示意站點當成即時查詢結果。

### 3.3 試乘預約與業務摘要同意

摘要提供／建立交接前，後端需記錄顧客明確同意、同意文字版本、時間、用途及目標門市。建議使用獨立操作：

```http
POST /api/consultations/{consultation_id}/sales-consent
{ "granted": true, "notice_version": "2026-01", "purpose": "dealer_follow_up" }
```

顧客撤回時使用 `granted: false`，後端須停止後續交接並依保存政策處理資料。未取得同意不得把摘要寫入業務 CRM。前端只有顯示同意文案和操作按鈕；同意證據必須由後端持久化，不能以瀏覽器 state 當紀錄。

```http
POST /api/appointments
{
  "consultation_id": "opaque-session-id",
  "dealer_id": "selected-dealer-id",
  "contact": { "name": "顧客稱呼", "phone": "顧客提供的電話" },
  "request_type": "test_drive",
  "preferred_times": [],
  "sales_handoff_consent_id": "consent-record-id"
}
```

回傳預約 `appointment_id`、狀態、門市及下一步。後端需驗證聯絡方式、門市可用性、同意紀錄及重複提交；成功後回傳可顯示給顧客的明確確認資訊。未串好門市／預約服務前，前端只應呈現「尚未送出」提示。

## 4. 錯誤格式與前端行為

建議錯誤使用統一格式，並提供可供使用者理解的訊息；不要把上游 LLM prompt、堆疊、供應商金鑰或內部錯誤回傳到瀏覽器。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "請確認年行駛里程後再試一次。",
    "field_errors": { "annual_mileage_km": "must_be_non_negative" },
    "request_id": "req-id"
  }
}
```

建議處理 `400/422` 欄位提示、`401/403` 登入／授權狀態、`404` session 過期、`409` 同意或預約狀態衝突、`429` 限流及 `5xx` 重試提示。送出訊息期間鎖定重複提交；支援取消、逾時與重試。若要逐字串流，先約定 SSE 事件、錯誤事件、取消語意及完整訊息的結束事件，再接前端串流 renderer；初版使用 JSON 一次回傳即可。

## 5. 對接前需確認

1. 車型目錄、能源類型及建議用車場景的正式代碼與版本。
2. TCO 計算口徑、能源價格更新頻率、持有年限、折現方式、補助適用條件及各資料來源責任人。
3. 充電站／路線 API 提供者、資料授權、更新時間、範圍和失效處理。
4. 保固條件與殘值估算模型；殘值須回區間、日期、來源和限制。
5. LLM 廠牌由後端封裝；金鑰只存在伺服器。確認對話保存期間、刪除方式、個資遮罩、同意版本與 CRM 交接權限。
6. 門市搜尋、可預約時段、預約確認／取消、試乘同意及 CRM 摘要交接的正式服務與負責系統。
7. 正式前端網域、CORS、認證方式、速率限制及監控 request ID。

## 6. 串接建議順序

1. 先確認 JSON schema、代碼、錯誤格式及資料來源；更新 OpenAPI 文件與 mock responses。
2. 接診斷 session 與對話，將後端 `profile` 作為唯一結構化需求狀態來源。
3. 接報告計算與站點／保固／殘值服務，前端依 `data_sources` 和 `limitations` 顯示來源與限制。
4. 接同意紀錄、門市搜尋與預約建立；只在後端回成功後顯示預約完成。
5. 在 `/api-test` 驗證回應及錯誤，再以 CORS／部署網域、重試、取消和同意撤回做端對端驗收。
