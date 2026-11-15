import { NextResponse } from "next/server";
import { currentEditor } from "@/lib/auth";

export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ name: await currentEditor() });
}
