import { NextResponse } from "next/server";
import { isCollection, saveItem } from "@/lib/db";
import { withAdmin } from "../_guard";

export const runtime = "nodejs";

/**
 * Body: { collection, id, data, expectedVersion, mode: "refresh"|"human", by, reason }
 * mode "refresh" never overwrites an entry a person edited; it stores a suggestion.
 */
export async function PUT(req: Request) {
  return withAdmin(req, async () => {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const c = String(b.collection || ""), id = String(b.id || "").trim();
    if (!isCollection(c) || !id || typeof b.data !== "object" || !b.data) return NextResponse.json({ error: "Need collection, id and data." }, { status: 400 });
    const r = await saveItem(c, id, b.data as Record<string, unknown>, {
      expectedVersion: Number(b.expectedVersion) || 0,
      mode: b.mode === "human" ? "human" : "refresh",
      by: String(b.by || "nightly refresh").slice(0, 60),
      reason: typeof b.reason === "string" ? b.reason.slice(0, 500) : undefined,
    });
    return NextResponse.json(r);
  });
}
