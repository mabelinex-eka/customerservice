"use client";
import { useState } from "react";
import { CopyBlock, Refs, Thinking } from "./ui";

type Result = {
  score?: number; verdict?: string; issues?: { severity: string; issue: string; fix: string }[];
  improved_reply?: string; refs?: string[]; error?: string;
};
const SEV: Record<string, string> = { high: "b-bad", medium: "b-warn", low: "b-info" };

export default function Checker() {
  const [customer, setCustomer] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function check() {
    if (!draft.trim()) return;
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft, customer }) });
      setRes(await r.json());
    } catch { setRes({ error: "Couldn't reach the server. Check your connection." }); }
    finally { setBusy(false); }
  }
  const sc = Number(res?.score) || 0;

  return (
    <section data-view="checker">
      <div>
        <h2>Reply checker</h2>
        <p className="lede">Paste your draft before you send it. It checks the reply against the SOP and suggests a complete version.</p>
      </div>
      <div className="card">
        <div className="split">
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <label className="lbl" htmlFor="chkCust">Customer&apos;s message (optional)</label>
            <textarea id="chkCust" value={customer} maxLength={3000} onChange={(e) => setCustomer(e.target.value)} placeholder="Paste what the customer wrote" />
          </div>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <label className="lbl" htmlFor="chkDraft">Your draft reply</label>
            <textarea id="chkDraft" value={draft} maxLength={3000} onChange={(e) => setDraft(e.target.value)} placeholder="Paste your reply" />
          </div>
        </div>
        <div className="row"><button className="primary" type="button" disabled={busy || !draft.trim()} onClick={check}>Check my reply</button></div>
      </div>
      {busy && <Thinking text="Checking against the SOP…" />}
      {res?.error && <div className="notice">{res.error}</div>}
      {res && !res.error && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>Result</h3><span className={`badge ${sc >= 4 ? "b-ok" : sc >= 3 ? "b-warn" : "b-bad"}`}>Score {sc}/5</span>
          </div>
          <p style={{ margin: 0 }}>{res.verdict}</p>
          {res.issues?.length ? (
            <div className="tablewrap"><table>
              <thead><tr><th>Severity</th><th>Issue</th><th>Fix</th></tr></thead>
              <tbody>{res.issues.map((i, n) => (
                <tr key={n}><td><span className={`badge ${SEV[i.severity] ?? "b-info"}`}>{i.severity}</span></td><td>{i.issue}</td><td>{i.fix}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <div className="notice">No issues found.</div>}
          {res.improved_reply && <CopyBlock label="Suggested reply" text={res.improved_reply} />}
          {!!res.refs?.length && <div><div className="lbl" style={{ marginBottom: 6 }}>From the SOP</div><Refs ids={res.refs} /></div>}
        </div>
      )}
    </section>
  );
}
