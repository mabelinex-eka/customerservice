"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { SopEntry, Status } from "@/lib/kb";

const STATUS: Record<Status, [string, string]> = {
  verified: ["b-ok", "SOP"], draft: ["b-warn", "Draft"], gap: ["b-bad", "Not in SOP yet"],
  needs_review: ["b-warn", "Needs review"], outdated: ["b-bad", "Outdated"],
};
export function StatusBadge({ status }: { status: Status }) {
  const [c, l] = STATUS[status] ?? STATUS.verified;
  return <span className={`badge ${c}`}>{l}</span>;
}

type Ctx = { byId: (id: string) => SopEntry | undefined; openSop: (id: string) => void; toast: (m: string) => void };
export const DeskContext = createContext<Ctx>({ byId: () => undefined, openSop: () => {}, toast: () => {} });
export const useDesk = () => useContext(DeskContext);

export function Refs({ ids }: { ids?: string[] }) {
  const { byId, openSop } = useDesk();
  const list = (ids ?? []).map((id) => byId(id)).filter(Boolean) as SopEntry[];
  if (!list.length) return null;
  return (
    <div className="refs">
      {list.map((e) => <button key={e.id} type="button" onClick={() => openSop(e.id)}>{e.title}</button>)}
    </div>
  );
}

export function CopyBlock({ label, text }: { label: string; text: string }) {
  const { toast } = useDesk();
  const ref = useRef<HTMLDivElement>(null);
  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); toast("Copied"); }
    catch {
      const el = ref.current; if (!el) return;
      const r = document.createRange(); r.selectNodeContents(el);
      const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); toast("Selected — press Ctrl+C to copy");
    }
  }, [text, toast]);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="lbl">{label}</span><button type="button" onClick={copy}>Copy</button>
      </div>
      <div className="reply" ref={ref}>{text}</div>
    </div>
  );
}

export function Thinking({ text }: { text: string }) {
  return <div className="card"><div className="thinking"><span className="dot" />{text}</div></div>;
}

/** "Wrong or outdated" — builds a note the agent pastes into the SG CS Chat for their lead. */
export function FlagBox({ subject, answer }: { subject: string; answer?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const text = `[CS Answer Desk – flagged]\nQuestion/entry: ${subject}\n${answer ? `Answer given: ${answer}\n` : ""}What's wrong: ${note || "(add details)"}`;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="row">
        <button type="button" className="ghost" onClick={() => setOpen(!open)}>Report wrong or outdated</button>
      </div>
      {open && (
        <div style={{ display: "grid", gap: 8 }}>
          <label className="lbl" htmlFor={`flag-${subject}`}>What&apos;s wrong, and what should it say?</label>
          <textarea id={`flag-${subject}`} value={note} onChange={(e) => setNote(e.target.value)} />
          <CopyBlock label="Paste this in the SG CS Chat for your team lead" text={text} />
        </div>
      )}
    </div>
  );
}
