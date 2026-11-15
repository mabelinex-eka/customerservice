import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentEditor } from "@/lib/auth";
import { exchangeCode } from "@/lib/zoho";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url), origin = url.origin;
  const name = await currentEditor();
  const jar = await cookies();
  const state = jar.get("zoho_state")?.value;
  const done = (s: string) => { const r = NextResponse.redirect(`${origin}/editor?zoho=${s}`); r.cookies.set("zoho_state", "", { path: "/", maxAge: 0 }); return r; };
  if (!name) return done("signin");
  if (url.searchParams.get("error")) return done("denied");
  const code = url.searchParams.get("code");
  if (!code || !state || state !== url.searchParams.get("state")) return done("failed");
  try {
    await exchangeCode(code, origin, name, url.searchParams.get("accounts-server") || undefined);
    return done("connected");
  } catch (e) {
    console.error(e);
    return done("failed");
  }
}
