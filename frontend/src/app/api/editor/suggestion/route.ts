import { NextResponse } from "next/server";
import { resolveSuggestion } from "@/lib/db";
import { withEditor } from "../_guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withEditor(async (name) => {
    const b = (await req.json().catch(() => ({}))) as { id?: string; accept?: boolean; expectedVersion?: number };
    if (!b.id) return NextResponse.json({ error: "Missing entry." }, { status: 400 });
    const item = await resolveSuggestion("sop", b.id, !!b.accept, Number(b.expectedVersion) || 0, name);
    return NextResponse.json({ item });
  });
}
