# 後端骨架使用說明

## 這是什麼

四支端點已經按照《API設計規格_討論稿_v1.md》建好，目前回傳的是固定的示範資料
（`government_subsidy_estimate` 這一項有接上真邏輯示範，其他先用假資料）。
已實際啟動測試過，四支都能正常回應。前端隊友可以馬上對接開發。

## 怎麼放進你的repo

把這個資料夾裡的 `main.py`、`requirements.txt` 複製到你repo的 `backend/` 資料夾裡。

## 第一次使用

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows 用 venv\Scripts\activate
pip install -r requirements.txt
```

## 啟動伺服器

```bash
uvicorn main:app --reload
```

看到這幾行代表成功：
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

## 怎麼確認有沒有跑起來

打開瀏覽器到 **http://127.0.0.1:8000/docs**，會看到一個互動式頁面，
列出四支端點，可以直接在網頁上點開、填資料、按 Execute 測試，
不需要另外裝 Postman 之類的工具。這個頁面是FastAPI自動生成的，
你之後改程式碼、加欄位，這裡也會自動跟著更新，不用手動維護。

## 給前端隊友的資訊

告訴他：
- 後端網址：`http://127.0.0.1:8000`
- 四支端點路徑：`/api/ev-overview`、`/api/suitability`、`/api/cost-comparison`、`/api/qa`
- 詳細格式看 `/docs`，或是規格文件《API設計規格_討論稿_v1.md》
- 記得他那邊的前端要跑在 `localhost:3000` 或 `localhost:5173`（Vite），
  已經在CORS設定裡允許了；如果他用別的port，跟你說一聲，你在
  `main.py` 的 `allow_origins` 那邊加一行就好

## 之後要做的事（TODO標記都在main.py裡）

- `suitability` 目前的評分邏輯是示範用的簡單規則，Product/AI Lead定案評分模型後直接替換
- `cost-comparison` 裡除了補助資格判斷，其餘都還是固定假資料，之後要接上真正的CDP數據計算
- `qa` 目前是罐頭回覆，之後要接上Claude API呼叫
