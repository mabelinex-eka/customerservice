"use client";
import { useState } from "react";
import type { Playbook } from "@/lib/kb";
import { Refs } from "./ui";

export default function Playbooks({ playbooks }: { playbooks: Playbook[] }) {
  const [pb, setPb] = useState<Playbook | null>(null);
  const [path, setPath] = useState<string[]>([]);

  const intro = (
    <div>
      <h2>Playbooks</h2>
      <p className="lede">Step-by-step for the situations that go wrong most: jobs not accepted, late agents, late or failed deliveries, claims.</p>
    </div>
  );
  if (!pb) {
    return (
      <section data-view="playbooks">{intro}
        <div className="pbgrid">
          {playbooks.map((p) => (
            <button key={p.id} type="button" className="card pbcard" onClick={() => { setPb(p); setPath([p.start]); }}>
              <h3>{p.title}</h3><span className="small muted">{p.summary}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }
  const node = pb.nodes[path[path.length - 1]];
  const crumbs = path.slice(0, -1).map((id, i) => pb.nodes[id]?.opts?.find((o) => o.next === path[i + 1])?.label).filter(Boolean).join(" → ");
  return (
    <section data-view="playbooks">{intro}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>{pb.title}</h3>
          <div className="row">
            <button className="ghost" type="button" onClick={() => (path.length > 1 ? setPath(path.slice(0, -1)) : setPb(null))}>Back</button>
            <button className="ghost" type="button" onClick={() => setPb(null)}>All playbooks</button>
          </div>
        </div>
        {crumbs && <div className="crumbs">{crumbs}</div>}
        {node?.end ? (
          <>
            <div><div className="lbl" style={{ marginBottom: 6 }}>Do this</div>
              <ol className="steps">{node.end.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
            {node.esc && <div className="esc"><b>Escalate:</b> {node.esc}</div>}
            {node.ref && <div><div className="lbl" style={{ marginBottom: 6 }}>Full SOP</div><Refs ids={[node.ref]} /></div>}
          </>
        ) : node ? (
          <>
            <p style={{ margin: 0, fontWeight: 600 }}>{node.q}</p>
            <div className="opts">
              {node.opts?.map((o) => <button key={o.next} type="button" onClick={() => setPath([...path, o.next])}>{o.label}</button>)}
            </div>
          </>
        ) : <div className="notice">This step is missing. Tell your team lead.</div>}
      </div>
    </section>
  );
}
