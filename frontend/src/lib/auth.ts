import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "cs_editor";
const DAY = 24 * 60 * 60 * 1000;

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
const sign = (payload: string) => createHmac("sha256", "cs-editor:" + (process.env.EDITOR_PASSWORD || "")).update(payload).digest("base64url");

/** Checks the editor password and returns a session cookie value (valid 12 hours). */
export function createEditorSession(name: string, password: string) {
  const pass = process.env.EDITOR_PASSWORD;
  if (!pass || !safeEqual(password, pass)) return null;
  const payload = Buffer.from(JSON.stringify({ n: name.slice(0, 60), e: Date.now() + DAY / 2 })).toString("base64url");
  return { name: COOKIE, value: `${payload}.${sign(payload)}`, maxAge: DAY / 2 / 1000 };
}

/** Returns the signed-in editor's name, or null. */
export async function currentEditor(): Promise<string | null> {
  if (!process.env.EDITOR_PASSWORD) return null;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [payload, sig] = v.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const { n, e } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof n === "string" && n && Date.now() < e ? n : null;
  } catch { return null; }
}
export const EDITOR_COOKIE = COOKIE;

/** Bearer key for the nightly refresh and for Claude's direct updates. */
export function isAdminRequest(req: Request) {
  const key = process.env.ADMIN_API_KEY;
  const h = req.headers.get("authorization") || "";
  return !!key && h.startsWith("Bearer ") && safeEqual(h.slice(7), key);
}
