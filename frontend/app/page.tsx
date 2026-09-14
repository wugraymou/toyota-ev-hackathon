"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./chat.module.css";

const suggestions = [
  { icon: "↗", category: "換車評估", question: "我的用車習慣適合換電動車嗎？", reply: "我們可以先從你的日常用車情境聊起。\n\n你目前開什麼車？平常主要是上下班通勤、接送家人，還是經常長途旅行？也可以一起告訴我每年的大約里程。", followup: "我主要是通勤，每年大約開 15,000 公里。" },
  { icon: "⌁", category: "充電生活", question: "家裡不能裝充電樁，也能開電動車嗎？", reply: "讓我們先整理你的充電條件，作為後續評估的起點。\n\n你家裡或公司有固定停車位嗎？附近是否有你方便使用的充電站？你可以先描述停車環境。", followup: "我住公寓，公司附近有公共充電站。" },
  { icon: "◎", category: "用車成本", question: "換成 bZ4X，用車費用會差多少？", reply: "我們可以把比較拆成購車、能源與保養三個部分。\n\n請先告訴我現有車款、購車年份，以及每年的大約里程。這個示範介面暫時不會計算或提供實際報價。", followup: "我開 2018 年的 RAV4，每年約 15,000 公里。" },
  { icon: "⤳", category: "長途出遊", question: "假日常跑長途，該怎麼安排充電？", reply: "可以先從你最常走的一條路線開始討論。\n\n通常從哪裡出發、到哪裡？途中會在哪些地方休息，或是否會過夜？告訴我行程，我們可以用它來體驗對話流程。", followup: "我常從臺北開到臺中，通常當天來回。" },
];
type Message = { id: number; role: "user" | "assistant"; content: string };

// Frontend-only demo adapter. Replace this with the LLM transport when available.
function demoReply(question: string) {
  return suggestions.find((item) => item.question === question)?.reply
    ?? "謝謝你補充用車情境！\n\n目前這裡是聊天介面示範，尚未接上 AI，因此還不能依照你的訊息產生個人化分析。你可以繼續輸入問題體驗對話，或從預設問題探索其他主題。";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [followup, setFollowup] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const transcript = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const region = transcript.current;
    if (region) region.scrollTop = region.scrollHeight;
  }, [messages, pending]);

  function send(text: string) {
    const question = text.trim();
    if (!question || timer.current || question.length > 2000) return;
    setMessages((current) => [...current, { id: nextId.current++, role: "user", content: question }]);
    setDraft(""); setPending(true); setFollowup("");
    timer.current = setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: demoReply(question) }]);
      setFollowup(suggestions.find((item) => item.question === question)?.followup ?? "");
      setPending(false); timer.current = null;
    }, 650);
    input.current?.focus();
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setMessages([]); setDraft(""); setPending(false); setFollowup("");
    input.current?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); send(draft); }

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand} aria-label="TOYOTA 油轉電顧問首頁">TOYOTA<span>BEYOND ZERO</span></Link>
      <button className={styles.newChat} onClick={reset}><span>＋</span> 開始新對話</button>
      <div className={styles.sidebarSection}><p>一起探索電動生活</p>{suggestions.map((item) => <button key={item.category} disabled={pending} onClick={() => send(item.question)}><span>{item.icon}</span>{item.category}<span className={styles.arrow}>↗</span></button>)}</div>
      <div className={styles.sidebarNote}><span className={styles.noteIcon}>bZ</span><h2>下一段旅程，從了解開始。</h2><p>從日常通勤到週末出遊，<br />找到適合自己的用車方式。</p></div>
      <Link className={styles.devLink} href="/api-test">API 測試台 <span>↗</span></Link>
    </aside>

    <section className={styles.main} aria-label="油轉電顧問聊天">
      <header className={styles.header}><div><span className={styles.headerMark}>bZ</span><strong>油轉電顧問</strong><span className={styles.headerSub}>你的電動生活，從這裡開始</span></div><span className={styles.demoBadge}>互動示範</span><button className={styles.mobileReset} onClick={reset}>新對話 ＋</button></header>
      <div className={styles.transcript} ref={transcript}>
        {messages.length === 0 ? <div className={styles.welcome}>
          <span className={styles.heroMark}>bZ<span>↗</span></span><p className={styles.eyebrow}>HELLO, ELECTRIC LIFE</p><h1>換電動車，<br />從你的生活開始聊。</h1><p className={styles.intro}>你好，我是你的油轉電顧問。<br />關於換車、充電或用車成本，你想先了解什麼？</p>
          <div className={styles.suggestions}>{suggestions.map((item) => <button key={item.category} onClick={() => send(item.question)}><span className={styles.cardTop}><span className={styles.cardIcon}>{item.icon}</span>{item.category}<span className={styles.arrow}>↗</span></span><strong>{item.question}</strong></button>)}</div>
          <p className={styles.welcomeHint}>點選一個問題開始，或在下方輸入你的想法。</p>
        </div> : <div className={styles.conversation}>
          <p className={styles.conversationDate}>本次對話 · 前端示範</p>
          <div role="log" aria-label="對話紀錄" aria-live="polite" aria-relevant="additions">
            {messages.map((message) => <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}><span className={styles.avatar}>{message.role === "user" ? "你" : "bZ"}</span><div className={styles.messageContent}><p className={styles.sender}>{message.role === "user" ? "你" : "油轉電顧問"}{message.role === "assistant" && <span>示範回覆</span>}</p><div className={styles.bubble}>{message.content}</div></div></article>)}
          </div>
          {pending && <div className={styles.typing} role="status">bZ <span>正在準備示範回覆…</span></div>}
          {!pending && followup && <button className={styles.followup} onClick={() => send(followup)}>接著聊：{followup} <span>↗</span></button>}
        </div>}
      </div>
      <div className={styles.composerArea}><form className={styles.composer} onSubmit={submit}><label className="sr-only" htmlFor="chat-message">輸入訊息</label><textarea ref={input} id="chat-message" rows={2} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.keyCode !== 229) { event.preventDefault(); send(draft); } }} placeholder="聊聊你的用車習慣，或問我一個問題…" aria-describedby="composer-help"/><div className={styles.composerBottom}><span id="composer-help">Enter 傳送 · Shift + Enter 換行<span className={styles.counter}> {draft.length} / 2000</span></span><button type="submit" disabled={pending || !draft.trim()} aria-label="傳送訊息">↑</button></div></form><p className={styles.disclaimer}>目前為前端示範，回覆為預設內容，尚未連接 AI。對話僅保留於本頁，重新整理即清除。</p></div>
    </section>
  </main>;
}
