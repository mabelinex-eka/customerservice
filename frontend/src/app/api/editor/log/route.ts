import { NextResponse } from "next/server";
import { recentLog } from "@/lib/db";
import { withEditor } from "../_guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || undefined;
  return withEditor(async () => NextResponse.json({ items: await recentLog(id ? 50 : 100, id) }));
}
