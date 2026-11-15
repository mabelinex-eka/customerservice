import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { currentEditor } from "@/lib/auth";
import { authUrl, zohoConfigured } from "@/lib/zoho";

export const runtime = "nodejs";

/** Sends a signed-in editor to Zoho to allow read access to WorkDrive. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!(await currentEditor())) return NextResponse.redirect(origin + "/editor");
  if (!zohoConfigured()) return NextResponse.redirect(origin + "/editor?zoho=not-configured");
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(origin, state));
  res.cookies.set("zoho_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
