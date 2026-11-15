"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STATUSES, score, type SopEntry, type Status } from "@/lib/kb";
import { StatusBadge } from "./ui";

type Item = { id: string; data: SopEntry; version: number; updatedAt: string; updatedBy: string; humanEdited: boolean;
  suggestion?: { data: SopEntry; reason: string; by: string; at: string } };
type Fb = { key: string; at: string; kind: string; subject: string; answer?: string; note?: string; name?: string; status: string; resolvedBy?: string };
type Log = { at: string; collection: string; id: string; action: string; by: string; before?: SopEntry; after?: SopEntry; note?: string };
type Draft = { id: string; title: string; cat: string; keywords: string; body: string; escalate: string; source: string; status: Status; order: number };

const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" }) : "";
const toDraft = (e?: Partial<SopEntry>): Draft => ({
  id: e?.id ?? "", title: e?.title ?? "", cat: e?.cat ?? "", keywords: e?.keywords ?? "", body: (e?.body ?? []).join("\n"),
  escalate: e?.escalate ?? "", source: e?.source ?? "", status: (e?.status as Status) ?? "verified", order: e?.order ?? 500,
});
const ACTIONS: Record<string, string> = { create: "Created", update: "Edited", suggest: "Nightly refresh suggested a change",
  "accept-suggestion": "Accepted suggestion", "reject-suggestion": "Rejected suggestion", seed: "Initial import" };

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({}) as T) };
}

export default function Editor() {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  useEffect(() => { api<{ name: string | null }>("/api/editor/session").then((r) => setMe(r.data.name ?? null)); }, []);
  if (me === undefined) return <Shell><div className="notice">Loading…</div></Shell>;
  if (!me) return <Shell><Login onIn={setMe} /></Shell>;
  return <Shell me={me} onOut={async () => { await api("/api/editor/logout", { method: "POST" }); setMe(null); }}><Workspace me={me} /></Shell>;
}

function Shell({ children, me, onOut }: { children: React.ReactNode; me?: string; onOut?: () => void }) {
  return (
    <>
      <header><div className="wrap"><div className="top">
        <div className="brand"><h1>Answer Desk editor</h1><span className="sub">Changes go live for agents immediately</span></div>
        <div className="row small">{me && <><span className="muted">Signed in as <b>{me}</b></span><button type="button" className="ghost" onClick={onOut}>Sign out</button></>}
          <a href="/" className="ghost" style={{ padding: "6px 8px", color: "var(--accent)" }}>Back to Answer Desk</a></div>
      </div></div></header>
      <main className="wrap">{children}</main>
    </>
  );
}

function Login({ onIn }: { onIn: (n: string) => void }) {
  const [name, setName] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await api<{ name?: string; error?: string }>("/api/editor/login", { method: "POST", body: JSON.stringify({ name, password: pw }) });
    setBusy(false); if (r.ok && r.data.name) onIn(r.data.name); else setErr(r.data.error || "Couldn't sign in.");
  }
  return (
    <section><form className="card" onSubmit={go} style={{ maxWidth: 420 }}>
      <h2>Sign in to edit</h2>
      <p className="lede small">Your name is recorded against every change you make.</p>
      <label className="lbl" htmlFor="edName">Your name</label>
      <input type="text" id="edName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <label className="lbl" htmlFor="edPw">Editor password</label>
      <input type="password" id="edPw" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password"
        style={{ width: "100%", font: "inherit", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", color: "var(--fg)" }} />
      {err && <div className="gap">{err}</div>}
      <div className="row"><button className="primary" type="submit" disabled={busy || !name.trim() || !pw}>Sign in</button></div>
    </form></section>
  );
}

function Workspace({ me }: { me: string }) {
  const [tab, setTab] = useState<"entries" | "flags" | "history">("entries");
  const [items, setItems] = useState<Item[]>([]);
  const [fb, setFb] = useState<Fb[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api<{ items: Item[] }>("/api/editor/sop"), api<{ items: Fb[] }>("/api/editor/feedback")]);
    if (a.ok) setItems(a.data.items ?? []); if (b.ok) setFb(b.data.items ?? []);
    if (!a.ok) setMsg("Couldn't load entries. Sign in again if this continues.");
  }, []);
  useEffect(() => { load(); }, [load]);
  const pending = items.filter((i) => i.suggestion).length;
  const openFb = fb.filter((f) => f.status === "open").length;
  return (
    <section>
      <nav aria-label="Editor sections" style={{ borderBottom: "1px solid var(--line)" }}>
        {([["entries", `SOP entries${pending ? ` · ${pending} to review` : ""}`], ["flags", `Agent flags${openFb ? ` · ${openFb} open` : ""}`], ["history", "Change history"]] as const).map(([k, l]) =>
          <a key={k} href={"#" + k} onClick={(e) => { e.preventDefault(); setTab(k); }} aria-current={tab === k ? "page" : undefined}>{l}</a>)}
      </nav>
      {msg && <div className="gap">{msg}</div>}
      {tab === "entries" && <Entries items={items} me={me} reload={load} />}
      {tab === "flags" && <Flags items={fb} reload={load} />}
      {tab === "history" && <History />}
    </section>
  );
}

function Entries({ items, me, reload }: { items: Item[]; me: string; reload: () => Promise<void> }) {
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<"all" | "review" | "retired">("all");
  const [sel, setSel] = useState<Item | "new" | null>(null);
  const list = useMemo(() => {
    let l = items.filter((i) => filter === "retired" ? i.data.status === "retired" : i.data.status !== "retired");
    if (filter === "review") l = l.filter((i) => i.suggestion || ["needs_review", "gap", "draft", "outdated"].includes(i.data.status));
    if (q.trim()) l = l.map((i) => [score(i.data, q), i] as const).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    else l = [...l].sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
    return l;
  }, [items, q, filter]);

  if (sel) {
    const item = sel === "new" ? null : items.find((i) => i.id === sel.id) ?? sel;
    return <EntryForm key={item ? item.id + item.version : "new"} item={item} me={me} cats={[...new Set(items.map((i) => i.data.cat))]}
      onDone={async (keepOpenId) => { await reload(); setSel(keepOpenId ? (items.find((i) => i.id === keepOpenId) ?? null) : null); }} onBack={() => setSel(null)} />;
  }
  return (
    <div style={{ display: "grid", gap: 12, paddingTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          {([["all", "Active"], ["review", "Needs attention"], ["retired", "Retired"]] as const).map(([k, l]) =>
            <button key={k} className="chip" type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        <button className="primary" type="button" onClick={() => setSel("new")}>New entry</button>
      </div>
      <input type="search" id="edSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entries…" />
      <div className="tablewrap card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Entry</th><th>Status</th><th>Last change</th></tr></thead>
          <tbody>{list.map((i) => (
            <tr key={i.id} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
              <td><b>{i.data.title}</b><br /><span className="catlabel">{i.data.cat} · {i.id}</span>
                {i.suggestion && <div><span className="badge b-info">Suggested update waiting</span></div>}</td>
              <td><StatusBadge status={i.data.status} /></td>
              <td className="small muted">{i.updatedBy || "—"}<br />{fmt(i.updatedAt)}</td>
            </tr>))}
          </tbody>
        </table>
        {!list.length && <div className="notice">No entries match.</div>}
      </div>
    </div>
  );
}

function EntryForm({ item, me, cats, onDone, onBack }: { item: Item | null; me: string; cats: string[]; onDone: (keepOpenId?: string) => void; onBack: () => void }) {
  const [d, setD] = useState<Draft>(toDraft(item?.data));
  const [version, setVersion] = useState(item?.version ?? 0);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState("");
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  async function save(override?: Partial<Draft>) {
    const x = { ...d, ...override };
    setBusy(true); setErr(""); setSaved("");
    const r = await api<{ error?: string; item?: Item }>("/api/editor/sop", { method: "PUT", body: JSON.stringify({
      id: x.id, expectedVersion: version,
      data: { ...x, body: x.body.split("\n").map((l) => l.trim()).filter(Boolean) } }) });
    setBusy(false);
    if (r.ok && r.data.item) { setVersion(r.data.item.version); setD(toDraft(r.data.item.data as SopEntry)); setSaved(`Saved by ${me}. Agents see it now.`); onDone(r.data.item.id); }
    else if (r.status === 409) setErr("Someone else changed this entry while you were editing. Copy your changes, go back and open it again.");
    else setErr(r.data.error || "Couldn't save.");
  }
  async function resolve(accept: boolean) {
    if (!item) return; setBusy(true);
    const r = await api<{ error?: string }>("/api/editor/suggestion", { method: "POST", body: JSON.stringify({ id: item.id, accept, expectedVersion: item.version }) });
    setBusy(false); if (r.ok) onDone(item.id); else setErr(r.status === 409 ? "This entry changed. Go back and open it again." : r.data.error || "Couldn't update.");
  }
  const sug = item?.suggestion;
  const field = { width: "100%" };
  return (
    <div style={{ display: "grid", gap: 12, paddingTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>{item ? "Edit entry" : "New entry"}</h2>
        <button className="ghost" type="button" onClick={onBack}>Back to list</button>
      </div>
      {sug && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <div className="row" style={{ justifyContent: "space-between" }}><h3>Suggested update from {sug.by}</h3><span className="small muted">{fmt(sug.at)}</span></div>
          <p className="small" style={{ margin: 0 }}><b>Why:</b> {sug.reason}</p>
          <div className="split">
            <div style={{ minWidth: 0 }}><div className="lbl">Current</div><ul className="steps small">{item!.data.body.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
            <div style={{ minWidth: 0 }}><div className="lbl">Suggested</div><ul className="steps small">{sug.data.body?.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
          </div>
          <div className="row"><button className="primary" type="button" disabled={busy} onClick={() => resolve(true)}>Accept suggestion</button>
            <button type="button" disabled={busy} onClick={() => resolve(false)}>Keep current version</button></div>
        </div>
      )}
      <div className="card">
        <div className="split">
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}><label className="lbl" htmlFor="fTitle">Title (the question agents ask)</label><input type="text" id="fTitle" style={field} value={d.title} onChange={set("title")} /></div>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}><label className="lbl" htmlFor="fId">Entry ID</label>
            <input type="text" id="fId" style={field} value={d.id} disabled={!!item} placeholder="e.g. pa-sgh-cutoff" onChange={set("id")} /></div>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}><label className="lbl" htmlFor="fCat">Category</label>
            <input type="text" id="fCat" style={field} list="cats" value={d.cat} onChange={set("cat")} /><datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></div>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}><label className="lbl" htmlFor="fStatus">Status</label>
            <select id="fStatus" value={d.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gap: 6 }}><label className="lbl" htmlFor="fBody">Rule / steps — one line per point</label>
          <textarea id="fBody" rows={10} value={d.body} onChange={set("body")} /></div>
        <div style={{ display: "grid", gap: 6 }}><label className="lbl" htmlFor="fEsc">Escalate to (optional)</label><input type="text" id="fEsc" style={field} value={d.escalate} onChange={set("escalate")} /></div>
        <div className="split">
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}><label className="lbl" htmlFor="fKw">Search words agents might use</label><input type="text" id="fKw" style={field} value={d.keywords} onChange={set("keywords")} /></div>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}><label className="lbl" htmlFor="fSrc">Source</label><input type="text" id="fSrc" style={field} value={d.source} placeholder="e.g. Operations Master SOP 2026 §6.2" onChange={set("source")} /></div>
        </div>
        {err && <div className="gap">{err}</div>}
        {saved && <div className="notice">{saved}</div>}
        <div className="row">
          <button className="primary" type="button" disabled={busy} onClick={() => save()}>Save</button>
          {item && d.status !== "retired" && <button type="button" disabled={busy} onClick={() => save({ status: "retired" })}>Retire entry</button>}
          {item && <span className="small muted">Version {version}{item.updatedBy ? ` · last changed by ${item.updatedBy}, ${fmt(item.updatedAt)}` : ""}</span>}
        </div>
      </div>
      {item && <History id={item.id} onRestore={(e) => setD(toDraft(e))} />}
    </div>
  );
}

function Flags({ items, reload }: { items: Fb[]; reload: () => Promise<void> }) {
  const [showAll, setShowAll] = useState(false);
  const list = items.filter((f) => showAll || f.status === "open");
  return (
    <div style={{ display: "grid", gap: 12, paddingTop: 12 }}>
      <div className="row"><button className="chip" type="button" aria-pressed={!showAll} onClick={() => setShowAll(false)}>Open</button>
        <button className="chip" type="button" aria-pressed={showAll} onClick={() => setShowAll(true)}>All</button></div>
      {list.length ? list.map((f) => (
        <div className="card" key={f.key}>
          <div className="row" style={{ justifyContent: "space-between" }}><b>{f.subject}</b><span className="small muted">{f.name || "Agent"} · {fmt(f.at)}</span></div>
          {f.answer && <div className="small muted">Answer given: {f.answer}</div>}
          <div>{f.note}</div>
          <div className="row">{f.status === "open"
            ? <button type="button" onClick={async () => { await api("/api/editor/feedback", { method: "POST", body: JSON.stringify({ key: f.key }) }); reload(); }}>Mark resolved</button>
            : <span className="badge b-ok">Resolved{f.resolvedBy ? ` by ${f.resolvedBy}` : ""}</span>}</div>
        </div>)) : <div className="notice">No {showAll ? "" : "open "}flags.</div>}
    </div>
  );
}

function History({ id, onRestore }: { id?: string; onRestore?: (e: SopEntry) => void }) {
  const [rows, setRows] = useState<Log[] | null>(null);
  useEffect(() => { api<{ items: Log[] }>("/api/editor/log" + (id ? `?id=${encodeURIComponent(id)}` : "")).then((r) => setRows(r.data.items ?? [])); }, [id]);
  return (
    <div className="card" style={{ marginTop: id ? 0 : 12 }}>
      <h3>{id ? "History of this entry" : "Recent changes"}</h3>
      {!rows ? <div className="notice">Loading…</div> : !rows.length ? <div className="notice">No changes yet.</div> : (
        <div className="tablewrap"><table>
          <thead><tr><th>When</th><th>Who</th><th>What</th>{onRestore && <th></th>}</tr></thead>
          <tbody>{rows.map((r, n) => (
            <tr key={n}><td className="small mono">{fmt(r.at)}</td><td className="small">{r.by}</td>
              <td className="small">{ACTIONS[r.action] ?? r.action}{!id && r.id !== "info" ? ` · ${r.after?.title ?? r.before?.title ?? r.id}` : ""}{r.note ? <div className="muted">{r.note}</div> : null}</td>
              {onRestore && <td>{r.before && <button type="button" className="ghost" onClick={() => onRestore(r.before!)}>Load version before this</button>}</td>}
            </tr>))}</tbody>
        </table></div>)}
      {onRestore && <p className="small muted" style={{ margin: 0 }}>Loading an old version fills the form; nothing changes until you click Save.</p>}
    </div>
  );
}
