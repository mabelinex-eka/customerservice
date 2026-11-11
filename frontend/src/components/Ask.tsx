"use client";
import { useState } from "react";
import { search, type SopEntry } from "@/lib/kb";
import { CopyBlock, FlagBox, Refs, Thinking } from "./ui";

type Answer = {
  covered?: boolean; answer?: string; steps?: string[]; customer_reply?: string; escalate?: string;
  refs?: string[]; confidence?: "high" | "medium" | "low"; gap_note?: string; error?: string;
};
const EXAMPLES = [
  "TikTok job still pending at 5pm",
  "Customer says cake arrived smashed",
  "Driver not answering, pickup window ending",
  "Recipient not home for a medical delivery",
  "Customer wants to cancel after the driver accepted",
];
const CONF = { high: ["b-ok", "High confidence"], medium: ["b-warn", "Medium confidence"], low: ["b-bad", "Low confidence"] } as const;

export default function Ask({ sop }: { sop: SopEntry[] }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Answer | null>(null);
  const [asked, setAsked] = useState("");

  async function ask(question = q) {
    const text = question.trim(); if (!text) return;
    setQ(text); setAsked(text); setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text }) });
      setRes(await r.json());
    } catch { setRes({ error: "Couldn't reach the server. Check your connection." }); }
    finally { setBusy(false); }
  }
  const related = asked ? search(sop, asked, 4) : [];
  const relCard = related.length > 0 && (
    <div className="card"><h3>Related SOP entries</h3><Refs ids={related.map((r) => r.id)} /></div>
  );

  return (
    <section data-view="ask">
      <div>
        <h2>What are you unsure about?</h2>
        <p className="lede">Describe the situation in plain words. You&apos;ll get the SOP steps, a reply you can send, and who to escalate to.</p>
      </div>
      <div className="card">
        <label className="lbl" htmlFor="askInput">Your question</label>
        <textarea id="askInput" value={q} onChange={(e) => setQ(e.target.value)} maxLength={3000}
          placeholder="e.g. Shopee cake order still not accepted at 11.30am, what do I do?"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); }} />
        <div className="row">
          {EXAMPLES.map((x) => <button key={x} className="chip" type="button" onClick={() => ask(x)}>{x}</button>)}
        </div>
        <div className="row"><button className="primary" type="button" disabled={busy} onClick={() => ask()}>Get the SOP answer</button></div>
      </div>

      {busy && <Thinking text="Checking the SOP…" />}
      {res?.error && (
        <div className={related.length ? "notice" : "gap"}>
          {res.error} {related.length ? "The closest SOP entries are below." : "Ask your lead before replying."}
        </div>
      )}
      {res && !res.error && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>Answer</h3>
            <span className={`badge ${(CONF[res.confidence ?? "medium"] ?? CONF.medium)[0]}`}>{(CONF[res.confidence ?? "medium"] ?? CONF.medium)[1]}</span>
          </div>
          {res.covered === false
            ? <div className="gap"><b>Not confirmed in the SOP.</b> {res.gap_note || "Escalate to Carmen before replying."}</div>
            : res.gap_note ? <div className="gap">{res.gap_note}</div> : null}
          <p style={{ margin: 0 }}>{res.answer}</p>
          {!!res.steps?.length && (
            <div><div className="lbl" style={{ marginBottom: 6 }}>What to do</div>
              <ol className="steps">{res.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
          )}
          {res.escalate && <div className="esc"><b>Escalate:</b> {res.escalate}</div>}
          {res.customer_reply && <CopyBlock label="Reply to customer" text={res.customer_reply} />}
          {!!res.refs?.length && <div><div className="lbl" style={{ marginBottom: 6 }}>From the SOP</div><Refs ids={res.refs} /></div>}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <FlagBox subject={asked} answer={res.answer} />
          </div>
        </div>
      )}
      {(res || busy) && relCard}
    </section>
  );
}
