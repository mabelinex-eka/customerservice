import { NextResponse } from "next/server";
import { listCollection, saveItem } from "@/lib/db";
import { STATUSES, type SopEntry } from "@/lib/kb";
import { withEditor } from "../_guard";

export const runtime = "nodejs";

export async function GET() {
  return withEditor(async () => NextResponse.json({ items: await listCollection<SopEntry>("sop") }));
}

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function PUT(req: Request) {
  return withEditor(async (name) => {
    const b = (await req.json().catch(() => ({}))) as { id?: unknown; data?: Record<string, unknown>; expectedVersion?: unknown };
    const id = str(b.id, 80).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const d = b.data ?? {};
    const body = Array.isArray(d.body) ? (d.body as unknown[]).map((l) => str(l, 1000)).filter(Boolean).slice(0, 40) : [];
    const status = STATUSES.includes(d.status as never) ? (d.status as SopEntry["status"]) : "draft";
    const title = str(d.title, 200);
    if (!id || !title || !body.length) return NextResponse.json({ error: "An entry needs an ID, a title and at least one line of content." }, { status: 400 });
    const data: SopEntry = {
      id, title, body, status,
      cat: str(d.cat, 80) || "General", keywords: str(d.keywords, 500), escalate: str(d.escalate, 500),
      source: str(d.source, 200) || "Edited by " + name,
      updated: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }),
      order: Number.isFinite(Number(d.order)) ? Number(d.order) : 500,
    };
    const r = await saveItem("sop", id, data as unknown as Record<string, unknown>, {
      expectedVersion: Number(b.expectedVersion) || 0, by: name, mode: "human",
    });
    return NextResponse.json(r);
  });
}
