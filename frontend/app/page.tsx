"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./chat.module.css";

const topics = [
  { icon: "↗", category: "換車評估", question: "我的用車習慣適合換電動車嗎？" },
  { icon: "⌁", category: "充電生活", question: "沒有家用充電，電動車適合我嗎？" },
  { icon: "◎", category: "用車成本", question: "油車、油電與純電，該怎麼比較？" },
  { icon: "⤳", category: "長途出遊", question: "我常跑長途，電動車方便嗎？" },
];
const questions = [
  { key: "mileage", prompt: "先從日常里程開始：你一年大約開多少公里？", options: ["少於 8,000 公里", "8,000–15,000 公里", "15,000–25,000 公里", "超過 25,000 公里"] },
  { key: "parking", prompt: "平常停車的地方，可以安裝或使用固定充電設備嗎？", options: ["可以安裝家用充電樁", "社區有公共充電設備", "公司附近有充電站", "目前都不方便"] },
  { key: "budget", prompt: "換車時，希望優先考量哪個預算區間？", options: ["100 萬元以內", "100–150 萬元", "150–200 萬元", "先了解各方案再決定"] },
  { key: "family", prompt: "平常主要的乘車情境是？", options: ["一人通勤", "家庭接送", "常載多人或行李", "通勤與旅行都會"] },
  { key: "concern", prompt: "目前最想先釐清的疑慮是？", options: ["充電是否方便", "電池保固與衰退", "總持有成本與殘值", "長途行程與補電"] },
  { key: "vehicle", prompt: "你目前開什麼車？（也可以先選「暫不提供」）", options: ["Toyota RAV4", "Toyota Corolla Cross", "Toyota Yaris", "其他車款／暫不提供"] },
] as const;
type AnswerKey = (typeof questions)[number]["key"];
type Answers = Partial<Record<AnswerKey, string>>;
type Message = { id: number; role: "user" | "assistant"; content: string };

function recommendation(answers: Answers) {
  const charging = answers.parking || "";
  if (!charging || charging.includes("暫不提供")) return { name: "先補齊充電條件再比較", tag: "充電資訊尚未確認", detail: "目前沒有足夠的停車與充電資訊，暫不判斷純電或油電哪種更適合。可以先確認住家、公司或常用路線是否有可使用的充電設備。" };
  if (charging.includes("不方便")) return { name: "先比較油電混合", tag: "替代方案優先評估", detail: "目前沒有固定充電條件，建議先比較油電混合車款，同時評估生活圈公共充電是否能補足需求。純電方案可等充電安排更明確後再比較。" };
  if (charging.includes("社區") || charging.includes("公司")) return { name: "比較純電與油電方案", tag: "兩種能源都值得評估", detail: "你有機會使用固定或目的地充電，可把純電列入比較；仍建議一起檢視充電時段、日常路線與油電方案的成本。" };
  return { name: "純電可列入優先比較", tag: "具備固定充電條件", detail: "固定充電條件有助於安排日常補電。接下來可進一步核對車款、家庭行程、預算，以及長途補電規劃。" };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [consent, setConsent] = useState(false);
  const [modal, setModal] = useState<"summary" | "booking" | null>(null);
  const [bookingSent, setBookingSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const transcript = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [messages, pending]);

  function append(role: Message["role"], content: string) {
    setMessages((current) => [...current, { id: nextId.current++, role, content }]);
  }
  function startDiagnosis(opening?: string) {
    setShowReport(false); setStep(0); setAnswers({}); setMessages([]); setConsent(false);
    if (opening) append("user", opening);
    append("assistant", "我會用幾個簡短問題了解你的用車情境，再整理可比較的能源方案。你可以跳過不想回答的項目。先從日常里程開始：你一年大約開多少公里？");
  }
  function answerQuestion(answer: string) {
    if (step < 0 || step >= questions.length || pending) return;
    const key = questions[step].key;
    const newAnswers = { ...answers, [key]: answer };
    setAnswers(newAnswers);
    append("user", answer);
    setPending(true);
    timer.current = setTimeout(() => {
      const next = step + 1;
      if (next < questions.length) {
        setStep(next);
        append("assistant", questions[next].prompt);
      } else {
        setStep(questions.length);
        append("assistant", "收到，我已整理好這次的用車條件。你可以先查看能源方案方向；成本、殘值和充電站資訊會在串接資料後補上。");
      }
      setPending(false); timer.current = null;
    }, 320);
  }
  function sendDraft() {
    const text = draft.trim();
    if (!text || pending || text.length > 2000) return;
    setDraft("");
    if (step < 0) { startDiagnosis(text); return; }
    if (step < questions.length) { answerQuestion(text); return; }
    append("user", text); setPending(true);
    timer.current = setTimeout(() => {
      append("assistant", "已記下這項補充。這份互動示範會先依前面的診斷答案呈現方案；接上 AI 與計算服務後，才會根據完整對話更新建議。");
      setPending(false); timer.current = null;
    }, 320);
  }
  function sendFreeText(event: FormEvent<HTMLFormElement>) { event.preventDefault(); sendDraft(); }
  function reset() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null; setMessages([]); setAnswers({}); setDraft(""); setPending(false); setStep(-1); setShowReport(false); setConsent(false); setModal(null);
    input.current?.focus();
  }
  const summary = `TOYOTA AI 智慧顧問｜顧客需求摘要（前端示範）\n年行駛里程：${answers.mileage ?? "未提供"}\n停車與充電：${answers.parking ?? "未提供"}\n預算：${answers.budget ?? "未提供"}\n乘車情境：${answers.family ?? "未提供"}\n主要疑慮：${answers.concern ?? "未提供"}\n現有車款：${answers.vehicle ?? "未提供"}\n方案方向：${recommendation(answers).name}\n注意：此摘要為本頁示範資料，尚未提交或傳送。`;
  async function copySummary() {
    try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}>TOYOTA<span>BEYOND ZERO</span></Link>
      <button className={styles.newChat} onClick={reset}><span>＋</span> 開始新診斷</button>
      <div className={styles.sidebarSection}><p>從生活情境開始</p>{topics.map((item) => <button key={item.category} disabled={pending} onClick={() => startDiagnosis(item.question)}><span>{item.icon}</span>{item.category}<span className={styles.arrow}>↗</span></button>)}</div>
      <div className={styles.sidebarNote}><span className={styles.noteIcon}>bZ</span><h2>適合你的移動方式，從生活開始。</h2><p>純電、油電或其他選擇，<br />一起看懂差異再做決定。</p></div>
      <Link className={styles.devLink} href="/api-test">API 測試台 <span>↗</span></Link>
    </aside>

    <section className={styles.main} aria-label="TOYOTA AI 智慧顧問">
      <header className={styles.header}><div><span className={styles.headerMark}>bZ</span><strong>TOYOTA AI 智慧顧問</strong><span className={styles.headerSub}>從生活需求出發，找到適合的能源方案</span></div><span className={styles.demoBadge}>前端互動示範</span><button className={styles.mobileReset} onClick={reset}>新診斷 ＋</button></header>
      {showReport && step >= questions.length ? <div className={styles.reportScroll}><div className={styles.report}>
        <button className={styles.backLink} onClick={() => setShowReport(false)}>← 返回診斷對話</button>
        <p className={styles.eyebrow}>YOUR MOBILITY PLAN · 示範報告</p><h1>為你的生活，整理下一步。</h1><p className={styles.intro}>以下方向只根據本頁填答做規則示範，並非正式車款推薦或報價。</p>
        <section className={styles.recommendation}><div><span className={styles.recommendTag}>{recommendation(answers).tag}</span><h2>{recommendation(answers).name}</h2><p>{recommendation(answers).detail}</p></div><span className={styles.recommendIcon}>bZ</span></section>
        <div className={styles.reportGrid}>
          <article className={styles.reportCard}><span className={styles.cardKicker}>01 · TOTAL COST OF OWNERSHIP</span><h3>油電成本與持有總成本</h3><p>比較購車、能源、保養、補助與不同持有年限，並清楚拆解各項假設。</p><div className={styles.pendingData}>等待後端計算引擎串接<span>目前不顯示金額或節省比例</span></div></article>
          <article className={styles.reportCard}><span className={styles.cardKicker}>02 · CHARGING ACCESS</span><h3>日常生活圈充電</h3><p>依居住地、通勤路線與目的地，評估充電站距離、營運資訊與長途補電安排。</p><div className={styles.pendingData}>等待充電站資料來源<span>尚未查詢真實站點</span></div></article>
          <article className={styles.reportCard}><span className={styles.cardKicker}>03 · BATTERY & RESALE</span><h3>電池保固與二手殘值</h3><p>展示保固條件及殘值估算範圍，說明資料日期、來源、使用年限與不確定性。</p><div className={styles.pendingData}>等待保固與估值資料<span>不以單一數字代表保證價格</span></div></article>
        </div>
        <section className={styles.answersPanel}><div><h3>本次診斷條件</h3><p>方案將隨需求補充更新。</p></div><div className={styles.answerChips}>{questions.map((question) => <span key={question.key}><strong>{question.prompt.split("：")[0].split("？")[0]}</strong>{answers[question.key] ?? "未提供"}</span>)}</div></section>
        <details className={styles.assumptions}><summary>資料來源、估算假設與限制</summary><p>正式報告應標示能源價格基準日、年行駛里程、持有期間、保養數據、補助資格及折現假設。殘值是區間估算而非保證售價；電池健康與保固條件依實際車款及合約為準。此示範尚未連接上述資料來源。</p></details>
        <div className={styles.reportActions}><button className={styles.primaryAction} onClick={() => { setBookingSent(false); setModal("booking"); }}>預約試乘／聯繫業務 <span>↗</span></button><button className={styles.secondaryAction} onClick={() => { setConsent(false); setModal("summary"); }}>準備面談摘要 <span>→</span></button></div>
        <p className={styles.reportNote}>提供試乘入口不代表已完成預約；正式送出需等待後端與門市流程串接。</p>
      </div></div> : <>
        {step >= 0 && step < questions.length && <div className={styles.progress}><div><span>需求診斷</span><span>{step + 1} / {questions.length}</span></div><span className={styles.progressTrack}><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></span></div>}
        {step >= questions.length && <div className={styles.readyBanner}><span>✓</span>需求整理完成，可以查看你的方案方向<button onClick={() => setShowReport(true)}>查看個人化報告 →</button></div>}
        <div className={styles.transcript} ref={transcript}>
          {messages.length === 0 ? <div className={styles.welcome}>
            <span className={styles.heroMark}>bZ<span>↗</span></span><p className={styles.eyebrow}>YOUR LIFE. YOUR DRIVE.</p><h1>油轉電，<br />從你的生活開始。</h1><p className={styles.intro}>不急著推薦車款，先了解你的日常。<br />一起釐清充電、預算、家庭與長途旅行的考量。</p>
            <div className={styles.suggestions}>{topics.map((item) => <button key={item.category} onClick={() => startDiagnosis(item.question)}><span className={styles.cardTop}><span className={styles.cardIcon}>{item.icon}</span>{item.category}<span className={styles.arrow}>↗</span></span><strong>{item.question}</strong></button>)}</div>
            <p className={styles.welcomeHint}>選擇一個情境開始，或直接描述你的用車需求。</p>
          </div> : <div className={styles.conversation}>
            <p className={styles.conversationDate}>本次需求診斷 · 前端示範</p><div role="log" aria-label="對話紀錄" aria-live="polite" aria-relevant="additions">
              {messages.map((message) => <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}><span className={styles.avatar}>{message.role === "user" ? "你" : "bZ"}</span><div className={styles.messageContent}><p className={styles.sender}>{message.role === "user" ? "你" : "智慧顧問"}{message.role === "assistant" && <span>診斷示範</span>}</p><div className={styles.bubble}>{message.content}</div></div></article>)}
            </div>
            {pending && <div className={styles.typing} role="status">bZ <span>正在整理下一步…</span></div>}
            {!pending && step >= 0 && step < questions.length && <div className={styles.quickOptions} aria-label="快速回答選項">{questions[step].options.map((option) => <button key={option} onClick={() => answerQuestion(option)}>{option}<span>↗</span></button>)}<button className={styles.skipOption} onClick={() => answerQuestion("暫不提供")}>暫不提供 <span>→</span></button></div>}
            {!pending && step >= questions.length && <button className={styles.followup} onClick={() => setShowReport(true)}>查看個人化方案與分析報告 <span>↗</span></button>}
          </div>}
        </div>
        <div className={styles.composerArea}><form className={styles.composer} onSubmit={sendFreeText}><label className="sr-only" htmlFor="chat-message">輸入訊息</label><textarea ref={input} id="chat-message" rows={2} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.keyCode !== 229) { event.preventDefault(); sendDraft(); } }} placeholder={step >= 0 && step < questions.length ? "也可以直接輸入你的答案…" : "聊聊你的用車習慣或想先了解的事…"} aria-describedby="composer-help"/><div className={styles.composerBottom}><span id="composer-help">Enter 傳送 · Shift + Enter 換行<span className={styles.counter}> {draft.length} / 2000</span></span><button type="submit" disabled={pending || !draft.trim()} aria-label="傳送訊息">↑</button></div></form><p className={styles.disclaimer}>互動示範｜尚未連接 AI 或即時資料。試算、站點與方案內容待資料服務串接及驗證。</p></div>
      </>}
    </section>

    {modal && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className={styles.modalClose} aria-label="關閉" onClick={() => setModal(null)}>×</button>{modal === "summary" ? <>
      <p className={styles.eyebrow}>CUSTOMER HANDOFF</p><h2 id="modal-title">面談需求摘要</h2><p className={styles.modalIntro}>只有在你明確同意後，才可將摘要提供給門市業務參考。</p>
      <label className={styles.consentLabel}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>我同意分享以下需求摘要給我選擇聯繫的 TOYOTA 門市，以便後續諮詢。<small>目前為介面示範；勾選不會傳送資料。正式上線前需串接同意紀錄、目的說明與撤回方式。</small></span></label>
      {consent && <><pre className={styles.summaryPreview}>{summary}</pre><button className={styles.primaryAction} onClick={copySummary}>{copied ? "已複製摘要 ✓" : "複製摘要（僅限本機）"}</button></>}
      {!consent && <p className={styles.privacyHint}>未勾選同意前，不顯示可分享摘要。</p>}
    </> : <>
      <p className={styles.eyebrow}>TEST DRIVE</p><h2 id="modal-title">預約試乘／聯繫業務</h2>{bookingSent ? <div className={styles.bookingNotice}><span>✓</span><h3>示範表單已完成</h3><p>資料尚未送出，也沒有建立真實預約。接上門市與預約 API 後，這裡會顯示實際處理結果。</p><button className={styles.secondaryAction} onClick={() => setModal(null)}>返回報告</button></div> : <form className={styles.bookingForm} onSubmit={(event) => { event.preventDefault(); setBookingSent(true); }}><p className={styles.modalIntro}>填寫聯繫偏好，體驗預約流程介面。此表單不會傳送資料。</p><label>偏好門市<select required defaultValue=""><option value="" disabled>選擇門市（示範）</option><option>臺北展示中心（示範）</option><option>新北展示中心（示範）</option><option>自行選擇鄰近門市</option></select></label><label>偏好服務<select required defaultValue=""><option value="" disabled>請選擇</option><option>預約試乘</option><option>能源方案諮詢</option><option>了解 bZ4X</option><option>了解油電車款</option></select></label><label>方便聯絡時段<select required defaultValue=""><option value="" disabled>請選擇</option><option>平日白天</option><option>平日晚上</option><option>週末</option><option>不限</option></select></label><label>稱呼<input required maxLength={40} placeholder="例如：陳小姐" /></label><label>聯絡方式<input required maxLength={80} placeholder="電話或 Email（示範，不會送出）" /></label><label className={styles.bookingConsent}><input type="checkbox" required /><span>我同意為此聯繫需求提供上述資料。<small>本示範不會送出或保存資料；正式預約須由後端依告知內容記錄同意。</small></span></label><button className={styles.primaryAction} type="submit">預覽預約流程 <span>→</span></button></form>}
    </>}</section></div>}
  </main>;
}
