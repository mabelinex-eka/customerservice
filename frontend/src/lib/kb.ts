import raw from "../../data/knowledge_base.json";

export type Status = "verified" | "draft" | "gap" | "needs_review" | "outdated";
export type SopEntry = {
  id: string; cat: string; title: string; keywords: string; body: string[];
  escalate: string; source: string; status: Status; updated: string; order: number;
};
export type PbOption = { label: string; next: string };
export type PbNode = { q?: string; opts?: PbOption[]; end?: string[]; esc?: string; ref?: string };
export type Playbook = { id: string; title: string; summary: string; start: string; nodes: Record<string, PbNode>; order: number };
export type Checklist = { id: string; title: string; items: { time: string; task: string }[]; order: number };
export type QuizQ = { id: string; q: string; opts: string[]; ans: number; ref: string; order: number };
export type Meta = { lastRefreshed?: string; sources?: string[]; note?: string };
export type KB = { sop: SopEntry[]; playbooks: Playbook[]; checklist: Checklist[]; quiz: QuizQ[]; meta: Meta };

const byOrder = <T extends { order?: number }>(a: T[]) => [...a].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
const r = raw as unknown as { sop: SopEntry[]; playbooks: Playbook[]; checklist: Checklist[]; quiz: QuizQ[]; meta: Meta[] | Meta };

export const kb: KB = {
  sop: byOrder(r.sop),
  playbooks: byOrder(r.playbooks),
  checklist: byOrder(r.checklist),
  quiz: byOrder(r.quiz),
  meta: Array.isArray(r.meta) ? (r.meta[0] ?? {}) : r.meta,
};

function words(t: string) {
  return (t || "").toLowerCase().replace(/[^a-z0-9$%.\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}
export function score(e: SopEntry, q: string) {
  const hay = `${e.title} ${e.keywords} ${e.cat} ${e.body.join(" ")}`.toLowerCase();
  const strong = `${e.title} ${e.keywords}`.toLowerCase();
  return words(q).reduce((n, w) => n + (hay.includes(w) ? (strong.includes(w) ? 3 : 1) : 0), 0);
}
export function search(entries: SopEntry[], q: string, n = 4) {
  return entries.map((e) => [score(e, q), e] as const).filter((x) => x[0] > 0)
    .sort((a, b) => b[0] - a[0]).slice(0, n).map((x) => x[1]);
}
export function kbText(entries: SopEntry[]) {
  return entries.map((e) =>
    `[${e.id}] ${e.title} (${e.cat}; source: ${e.source}; status: ${e.status})\n` +
    e.body.map((l) => "- " + l).join("\n") + (e.escalate ? `\nEscalate: ${e.escalate}` : "")).join("\n\n");
}
