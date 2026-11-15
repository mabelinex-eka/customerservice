import { NextResponse } from "next/server";
import { listFeedback, resolveFeedback } from "@/lib/db";
import { withAdmin } from "../_guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withAdmin(req, async () => NextResponse.json({ items: await listFeedback() }));
}
export async function POST(req: Request) {
  return withAdmin(req, async () => {
    const b = (await req.json().catch(() => ({}))) as { key?: string; by?: string };
    if (!b.key) return NextResponse.json({ error: "Missing key." }, { status: 400 });
    await resolveFeedback(b.key, String(b.by || "nightly refresh").slice(0, 60));
    return NextResponse.json({ ok: true });
  });
}
