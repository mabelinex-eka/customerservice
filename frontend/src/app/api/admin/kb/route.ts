import { NextResponse } from "next/server";
import { COLLECTIONS, listCollection } from "@/lib/db";
import { withAdmin } from "../_guard";

export const runtime = "nodejs";

/** Full dump with versions, humanEdited flags and pending suggestions. */
export async function GET(req: Request) {
  return withAdmin(req, async () => {
    const out: Record<string, unknown> = {};
    for (const c of COLLECTIONS) out[c] = await listCollection(c);
    return NextResponse.json(out);
  });
}
