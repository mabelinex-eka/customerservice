import { NextResponse } from "next/server";
import { addFeedback } from "@/lib/db";

export const runtime = "nodejs";
const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const subject = s(b.subject, 300), note = s(b.note, 2000);
  if (!subject || !note) return NextResponse.json({ error: "Say what's wrong first." }, { status: 400 });
  try {
    await addFeedback({ kind: s(b.kind, 20) || "flag", subject, note, answer: s(b.answer, 1000) || undefined, name: s(b.name, 60) || undefined });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't save the report." }, { status: 500 });
  }
}
