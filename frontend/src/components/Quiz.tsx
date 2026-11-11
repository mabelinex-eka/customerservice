"use client";
import { useState } from "react";
import type { QuizQ } from "@/lib/kb";
import { CopyBlock, Refs } from "./ui";

export default function Quiz({ quiz }: { quiz: QuizQ[] }) {
  const [ans, setAns] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const right = quiz.filter((q) => ans[q.id] === q.ans).length;
  const pct = quiz.length ? Math.round((right / quiz.length) * 100) : 0;
  const missed = quiz.filter((q) => ans[q.id] !== q.ans).map((q, i) => `${quiz.indexOf(q) + 1}`).join(", ");
  const result = `[CS Answer Desk – SOP quiz]\nAgent: ${name || "(your name)"}\nScore: ${right}/${quiz.length} (${pct}%) – ${pct >= 80 ? "PASS" : "below 80%"}\nMissed questions: ${missed || "none"}\nDate: ${new Date().toLocaleDateString("en-SG", { timeZone: "Asia/Singapore" })}`;

  return (
    <section data-view="quiz">
      <div>
        <h2>SOP quiz</h2>
        <p className="lede">Questions taken from real situations in the SOP and the website. Pass mark is 80%, same as the Support Quiz.</p>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {quiz.map((q, n) => (
          <div className="card" key={q.id}>
            <h3>{n + 1}. {q.q}</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {q.opts.map((o, i) => {
                const cls = done ? (i === q.ans ? "right" : ans[q.id] === i ? "wrong" : "") : "";
                return (
                  <label key={i} className={`qopt ${cls}`}>
                    <input type="radio" name={q.id} id={`${q.id}-${i}`} checked={ans[q.id] === i} disabled={done}
                      onChange={() => setAns({ ...ans, [q.id]: i })} />
                    <span>{o}</span>
                  </label>
                );
              })}
            </div>
            {done && <div className="row small"><span className="muted">SOP:</span><Refs ids={[q.ref]} /></div>}
          </div>
        ))}
        <div className="card">
          {done ? (
            <>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>Score: {right} / {quiz.length} ({pct}%)</h3>
                <span className={`badge ${pct >= 80 ? "b-ok" : "b-bad"}`}>{pct >= 80 ? "Pass" : "Below 80% — review the SOP entries above"}</span>
              </div>
              <label className="lbl" htmlFor="quizName">Your name</label>
              <input type="text" id="quizName" value={name} onChange={(e) => setName(e.target.value)} />
              <CopyBlock label="Send your result to your team lead" text={result} />
              <div className="row"><button type="button" onClick={() => { setAns({}); setDone(false); }}>Try again</button></div>
            </>
          ) : (
            <div className="row">
              <button className="primary" type="button" onClick={() => { setDone(true); scrollTo({ top: 0 }); }}>Submit answers</button>
              <span className="small muted">{Object.keys(ans).length} of {quiz.length} answered</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
