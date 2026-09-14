"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

const endpoints = [
  { path: "/api/ev-overview", method: "GET", name: "電動車總覽", description: "取得油車與 bZ4X 的基本比較資訊。", example: null },
  { path: "/api/models", method: "GET", name: "可用車款", description: "取得 CDP 資料中可用的車款名稱，供成本比較使用。", example: null },
  { path: "/api/suitability", method: "POST", name: "換車適合度", description: "傳入用車條件，測試個人化適合度分析。", example: { current_model: "RAV4", annual_mileage: 15000, budget: 1400000, usage_scenario: "commute", has_home_charging: true, residence_city: "臺北市" } },
  { path: "/api/cost-comparison", method: "POST", name: "用車成本比較", description: "可改成不存在的車款測試 400，或移除必要欄位測試 422。", example: { current_model: "RAV4", purchase_year: 2015, annual_mileage: 15000, budget: 1400000, residence_city: "臺北市", usage_scenario: "commute" } },
  { path: "/api/qa", method: "POST", name: "顧問問答", description: "測試問答端點；目前後端仍回傳示範回答。", example: { question: "我每年開 15000 公里，適合換成電動車嗎？", context: null } },
] as const;
type Result = { url: string; method: string; status: number; statusText: string; ok: boolean; elapsed: number; body: string; headers: string };

export default function Home() {
  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000");
  const [selected, setSelected] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const controller = useRef<AbortController | null>(null);
  const endpoint = endpoints[selected];
  useEffect(() => () => controller.current?.abort(), []);

  function chooseEndpoint(index: number) {
    setSelected(index);
    setBody(endpoints[index].example ? JSON.stringify(endpoints[index].example, null, 2) : "");
    setError(""); setResult(null);
  }

  async function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controller.current) return;
    setError(""); setResult(null);
    let url: string;
    try {
      const base = new URL(baseUrl.trim());
      if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
      url = base.href.replace(/\/+$/, "") + endpoint.path;
    } catch {
      setError("請輸入有效的 HTTP 或 HTTPS 後端網址，不要包含帳密、查詢參數或 #。"); return;
    }
    if (endpoint.method === "POST") {
      try { JSON.parse(body); } catch { setError("Request Body 不是有效的 JSON，請檢查引號、逗號與括號。"); return; }
    }
    const abortController = new AbortController();
    controller.current = abortController;
    setBusy(true);
    const start = performance.now();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; abortController.abort(); }, 30000);
    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers: endpoint.method === "POST" ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
        body: endpoint.method === "POST" ? body : undefined,
        signal: abortController.signal, cache: "no-store",
      });
      const raw = await response.text();
      let formatted = raw;
      try { formatted = JSON.stringify(JSON.parse(raw), null, 2); } catch { /* Preserve non-JSON responses. */ }
      setResult({ url, method: endpoint.method, status: response.status, statusText: response.statusText, ok: response.ok, elapsed: Math.round(performance.now() - start), body: formatted || "（空白回應）", headers: Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join("\n") });
    } catch {
      setError(timedOut ? "請求超過 30 秒，已停止等待。請確認後端狀態後重試。" : abortController.signal.aborted ? "已取消請求。" : "無法連線。請確認後端已啟動、網址正確，且 CORS 允許目前前端來源；HTTPS 頁面也可能無法呼叫 HTTP 後端。");
    } finally { clearTimeout(timeout); controller.current = null; setBusy(false); }
  }

  return <main className="workspace">
    <header className="page-header"><div><p className="eyebrow">TOYOTA / bZ4X · DEVELOPMENT</p><h1>後端 API 測試台</h1><p className="subtitle">選擇端點、調整資料，直接檢查後端的真實回應。</p></div><span className="environment">開發工具</span></header>
    <form onSubmit={sendRequest}>
      <section className="connection panel"><label htmlFor="base-url">後端網址 · Base URL</label><input id="base-url" type="url" required value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} disabled={busy} /><p className="hint">預設連線至本機 FastAPI。前端建議使用 localhost:3000，以符合後端 CORS 設定。</p></section>
      <div className="test-grid">
        <nav className="panel endpoint-list" aria-label="API 端點"><h2>API 端點 <span>05</span></h2>{endpoints.map((item, index) => <button type="button" key={item.path} disabled={busy} aria-pressed={selected === index} className={`endpoint ${selected === index ? "selected" : ""}`} onClick={() => chooseEndpoint(index)}><span className={`method ${item.method.toLowerCase()}`}>{item.method}</span><span><strong>{item.name}</strong><code>{item.path}</code></span></button>)}</nav>
        <section className="panel request-panel"><div className="section-heading"><h2>請求內容</h2><span className={`method ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span></div><code className="request-path">{endpoint.path}</code><p className="hint description">{endpoint.description}</p>
          {endpoint.method === "POST" ? <><div className="body-label"><label htmlFor="request-body">Request Body · JSON</label><button type="button" className="text-button" disabled={busy} onClick={() => { setBody(JSON.stringify(endpoint.example, null, 2)); setError(""); }}>還原範例</button></div><textarea id="request-body" value={body} onChange={(e) => setBody(e.target.value)} disabled={busy} spellCheck={false} aria-describedby="json-hint" /><p id="json-hint" className="hint">可修改或移除欄位以測試後端驗證。車款名稱可先查詢「可用車款」。</p></> : <div className="empty-request">此 GET 請求不需要 Request Body。<br /><span>點擊下方按鈕即可取得資料。</span></div>}
          <div className="actions"><button className="send-button" type="submit" disabled={busy}>{busy ? "請求中…" : "發送請求 →"}</button>{busy && <button className="cancel-button" type="button" onClick={() => controller.current?.abort()}>取消</button>}</div>
        </section>
        <section className="panel response-panel" aria-busy={busy}><div className="section-heading"><h2>回應結果</h2><span className="response-label">RESPONSE</span></div><div role="status" aria-live="polite">{busy && <p className="hint">等待後端回應，最多 30 秒…</p>}{error && <p className="error-message">{error}</p>}{result && <div className="result-summary"><span className={`status ${result.ok ? "success" : "failure"}`}>{result.status} {result.statusText || (result.ok ? "成功" : "錯誤")}</span><span>{result.elapsed} ms</span></div>}</div>
          {result ? <><p className="result-url"><strong>{result.method}</strong> {result.url}</p><pre className="response-body" tabIndex={0} aria-label="回應內容">{result.body}</pre><details><summary>回應標頭（瀏覽器可讀取部分）</summary><pre className="headers">{result.headers || "（無可讀取標頭）"}</pre></details></> : !busy && !error && <div className="empty-response"><span className="empty-icon">{ "{ }" }</span><h3>準備好測試了</h3><p>發送請求後，這裡會顯示 HTTP 狀態、<br />回應時間與完整 JSON 或文字內容。</p></div>}
        </section>
      </div>
    </form><footer>回應來自實際後端；部分業務資料與 AI 問答目前仍為後端示範實作。</footer>
  </main>;
}
