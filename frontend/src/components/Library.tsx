"use client";
import { useEffect, useMemo, useState } from "react";
import { score, type SopEntry } from "@/lib/kb";
import { FlagBox, StatusBadge } from "./ui";

export default function Library({ sop, focus }: { sop: SopEntry[]; focus: { id: string; n: number } | null }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const cats = useMemo(() => ["All", ...Array.from(new Set(sop.map((s) => s.cat)))], [sop]);

  useEffect(() => {
    if (!focus) return;
    setQ(""); setCat("All"); setOpen((o) => ({ ...o, [focus.id]: true }));
    requestAnimationFrame(() => document.getElementById("sop-" + focus.id)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [focus]);

  let list = sop.filter((s) => cat === "All" || s.cat === cat);
  if (q.trim()) list = list.map((e) => [score(e, q), e] as const).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).map((x) => x[1]);

  return (
    <section data-view="library">
      <div>
        <h2>SOP library</h2>
        <p className="lede">Every rule the Answer Desk uses. Search it, or report anything wrong or outdated.</p>
      </div>
      <input type="search" id="libSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: top-up, claim, PUIP, Lalamove, SGH, surcharge…" />
      <div className="row">
        {cats.map((c) => <button key={c} className="chip" type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {list.length ? list.map((e) => (
          <details key={e.id} className="sop" id={"sop-" + e.id} open={!!open[e.id]}
            onToggle={(ev) => { const o = (ev.currentTarget as HTMLDetailsElement).open; setOpen((s) => (s[e.id] === o ? s : { ...s, [e.id]: o })); }}>
            <summary><span><b>{e.title}</b><br /><span className="catlabel">{e.cat}</span></span><StatusBadge status={e.status} /></summary>
            <div className="bodyx">
              <ul className="steps">{e.body.map((l, i) => <li key={i}>{l}</li>)}</ul>
              {e.escalate && <div className="esc"><b>Escalate:</b> {e.escalate}</div>}
              <span className="mono muted">{e.source} · updated {e.updated}</span>
              <FlagBox subject={"SOP entry: " + e.title} />
            </div>
          </details>
        )) : <div className="notice">No SOP entry matches. Try the Ask tab, or tell your team lead this question isn&apos;t covered.</div>}
      </div>
    </section>
  );
}
