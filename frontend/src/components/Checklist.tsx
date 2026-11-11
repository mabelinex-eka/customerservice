"use client";
import { useEffect, useState } from "react";
import type { Checklist as CL } from "@/lib/kb";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
const load = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || "{}") as Record<number, boolean>; } catch { return {}; } };
const save = (k: string, v: Record<number, boolean>) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

export default function Checklist({ lists }: { lists: CL[] }) {
  const [id, setId] = useState(lists.find((l) => l.id === "monitoring")?.id ?? lists[0]?.id);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [date, setDate] = useState("");
  const key = `cs-check:${date}:${id}`;
  useEffect(() => { setDate(today()); }, []);
  useEffect(() => { if (date) setDone(load(key)); }, [key, date]);

  const list = lists.find((l) => l.id === id); if (!list) return null;
  const n = list.items.length, d = list.items.filter((_, i) => done[i]).length;

  return (
    <section data-view="checklist">
      <div>
        <h2>Shift checklist</h2>
        <p className="lede">Tick each check as you do it. Ticks are saved on this computer for today.</p>
      </div>
      <div className="row">
        {lists.map((l) => <button key={l.id} className="chip" type="button" aria-pressed={l.id === id} onClick={() => setId(l.id)}>{l.title}</button>)}
        <span className="mono muted">{date}</span>
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}><h3>{list.title}</h3><span className="mono">{d} / {n} done</span></div>
        <div className="bar"><i style={{ width: `${n ? (d / n) * 100 : 0}%` }} /></div>
        <div>
          {list.items.map((it, i) => (
            <label key={i} className={`check ${done[i] ? "done" : ""}`}>
              <input type="checkbox" id={`cl-${list.id}-${i}`} checked={!!done[i]}
                onChange={(e) => { const nd = { ...done, [i]: e.target.checked }; setDone(nd); save(key, nd); }} />
              <span className="t">{it.time}</span><span className="x">{it.task}</span>
            </label>
          ))}
        </div>
        <div className="row"><button type="button" onClick={() => { setDone({}); save(key, {}); }}>Clear today&apos;s ticks</button></div>
      </div>
    </section>
  );
}
