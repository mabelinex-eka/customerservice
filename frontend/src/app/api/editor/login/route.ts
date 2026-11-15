import { NextResponse } from "next/server";
import { createEditorSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { name?: unknown; password?: unknown };
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!process.env.EDITOR_PASSWORD) return NextResponse.json({ error: "Editing isn't set up yet (EDITOR_PASSWORD missing)." }, { status: 503 });
  const s = createEditorSession(name, typeof b.password === "string" ? b.password : "");
  if (!s) return NextResponse.json({ error: "Wrong editor password." }, { status: 401 });
  const res = NextResponse.json({ name });
  res.cookies.set(s.name, s.value, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: s.maxAge });
  return res;
}
