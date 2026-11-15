import { NextResponse } from "next/server";
import { listFeedback, resolveFeedback } from "@/lib/db";
import { withEditor } from "../_guard";

export const runtime = "nodejs";

export async function GET() {
  return withEditor(async () => NextResponse.json({ items: await listFeedback() }));
}
export async function POST(req: Request) {
  return withEditor(async (name) => {
    const b = (await req.json().catch(() => ({}))) as { key?: string };
    if (!b.key) return NextResponse.json({ error: "Missing item." }, { status: 400 });
    await resolveFeedback(b.key, name);
    return NextResponse.json({ ok: true });
  });
}
