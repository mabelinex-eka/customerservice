"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { KB } from "@/lib/kb";
import { DeskContext } from "./ui";
import Ask from "./Ask";
import Playbooks from "./Playbooks";
import Library from "./Library";
import Checker from "./Checker";
import Checklist from "./Checklist";
import Quiz from "./Quiz";

const TABS = [
  ["ask", "Ask"], ["playbooks", "Playbooks"], ["library", "SOP library"],
  ["checker", "Reply checker"], ["checklist", "Shift checklist"], ["quiz", "Quiz"],
] as const;
type View = (typeof TABS)[number][0];
const isView = (v: string): v is View => TABS.some(([k]) => k === v);

export default function AnswerDesk({ kb }: { kb: KB }) {
  const [view, setView] = useState<View>("ask");
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [toastMsg, setToast] = useState("");

  useEffect(() => {
    const sync = () => { const h = location.hash.slice(1); setView(isView(h) ? h : "ask"); };
    sync(); addEventListener("hashchange", sync); return () => removeEventListener("hashchange", sync);
  }, []);

  const toast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); }, []);
  const byId = useCallback((id: string) => kb.sop.find((s) => s.id === id), [kb.sop]);
  const openSop = useCallback((id: string) => { location.hash = "#library"; setFocus({ id, n: Date.now() }); }, []);
  const ctx = useMemo(() => ({ byId, openSop, toast }), [byId, openSop, toast]);

  const review = kb.sop.filter((s) => s.status !== "verified").length;
  const refreshed = kb.meta.lastRefreshed
    ? new Date(kb.meta.lastRefreshed).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" })
    : "—";

  return (
    <DeskContext.Provider value={ctx}>
      <header>
        <div className="wrap">
          <div className="top">
            <div className="brand"><h1>uParcel CS Answer Desk</h1><span className="sub">Singapore · answers from the Operations SOP and uparcel.sg</span></div>
            <div className="stat">
              <span><b>{kb.sop.length}</b> entries</span>
              <span>Updated <b>{refreshed}</b></span>
              {review > 0 && <span><b>{review}</b> gaps / to review</span>}
            </div>
          </div>
          <nav aria-label="Sections">
            {TABS.map(([k, label]) => <a key={k} href={"#" + k} aria-current={view === k ? "page" : undefined}>{label}</a>)}
          </nav>
        </div>
      </header>
      <main className="wrap">
        {view === "ask" && <Ask sop={kb.sop} />}
        {view === "playbooks" && <Playbooks playbooks={kb.playbooks} />}
        {view === "library" && <Library sop={kb.sop} focus={focus} />}
        {view === "checker" && <Checker />}
        {view === "checklist" && <Checklist lists={kb.checklist} />}
        {view === "quiz" && <Quiz quiz={kb.quiz} />}
        <div className="foot">Internal use only. Sources: {(kb.meta.sources ?? []).join(" · ")}. If an answer looks wrong, report it and check with your team lead before replying.</div>
      </main>
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </DeskContext.Provider>
  );
}
