This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 聊天介面

首頁是油轉電顧問聊天介面。執行 `npm run dev` 後開啟 http://localhost:3000 即可體驗，不需啟動後端。

- 提供換車評估、充電生活、用車成本、長途出遊四組預設問題，以及接續問題。
- 支援自由輸入、Enter 傳送、Shift + Enter 換行、中文輸入法組字、等待回覆提示及新對話。
- 回覆使用 `app/page.tsx` 的 `demoReply` 預設內容，沒有呼叫後端或 LLM。未來可替換成 API 傳輸邏輯。
- 對話僅保留於頁面記憶體，重新整理或離開頁面即清除。

## API 測試台

原本的 API 測試台移至 http://localhost:3000/api-test，桌面版聊天側欄也有入口。提供 5 個後端端點的測試介面，包含可編輯 JSON 範例、HTTP 狀態、耗時、完整回應與瀏覽器可讀取的標頭。

先在 `backend/` 安裝 `requirements.txt` 依賴並執行 `python -m uvicorn main:app --reload --port 8000`，再在此目錄執行 `npm run dev -- --port 3000`，開啟 http://localhost:3000。

預設後端為 `http://127.0.0.1:8000`，可在頁面修改，或在 `.env.local` 設定 `NEXT_PUBLIC_API_BASE_URL` 後重新啟動前端。後端目前允許 localhost／127.0.0.1 的 3000、5173 埠，其他來源需調整後端 CORS。

選取 POST 端點會自動帶入 JSON 範例；可將成本比較的 `current_model` 改成不存在的車款測試 400，或移除必要欄位測試 422。「還原範例」會重設內容。請求可取消，30 秒未完成會逾時。非 JSON 回應保留原始文字。

部分後端資料與問答仍為示範實作。使用 `npm run lint` 與 `npm run build` 檢查前端。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
