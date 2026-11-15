import "server-only";
import mammoth from "mammoth";
import { getConfig, setConfig } from "./db";

// Zoho WorkDrive access for the "Check Master SOP" button.
// Uses a server-based Zoho OAuth client; the refresh token is stored in the
// database (CONFIG#zoho), never sent to the browser.

export const ACCOUNTS = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";
const API = process.env.ZOHO_API_URL || "https://www.zohoapis.com";
export const SOP_FILE_ID = process.env.SOP_FILE_ID || "2in1r94db0f3bd1b141afb8de288baf7c38dc";
export const SCOPES = "WorkDrive.files.READ";

export class ZohoError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

type ZohoConfig = { refreshToken: string; connectedBy: string; connectedAt: string };
export const zohoConfigured = () => !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
export const redirectUri = (origin: string) => `${process.env.APP_URL || origin}/api/editor/zoho/callback`;

export function authUrl(origin: string, state: string) {
  const u = new URL(ACCOUNTS + "/oauth/v2/auth");
  u.search = new URLSearchParams({
    response_type: "code", client_id: process.env.ZOHO_CLIENT_ID || "", scope: SCOPES,
    redirect_uri: redirectUri(origin), access_type: "offline", prompt: "consent", state,
  }).toString();
  return u.toString();
}

export async function exchangeCode(code: string, origin: string, by: string, accountsServer?: string) {
  const base = accountsServer && /^https:\/\/accounts\.zoho\.[a-z.]+$/.test(accountsServer) ? accountsServer : ACCOUNTS;
  const r = await fetch(base + "/oauth/v2/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, client_id: process.env.ZOHO_CLIENT_ID || "",
      client_secret: process.env.ZOHO_CLIENT_SECRET || "", redirect_uri: redirectUri(origin),
    }),
  });
  const d = (await r.json().catch(() => ({}))) as { refresh_token?: string; error?: string };
  if (!d.refresh_token) throw new ZohoError("Zoho didn't return access" + (d.error ? ` (${d.error})` : "") + ". Try Connect again.", 400);
  await setConfig("zoho", { refreshToken: d.refresh_token, connectedBy: by, connectedAt: new Date().toISOString(), accounts: base });
  cachedToken = null;
}

let cachedToken: { token: string; exp: number } | null = null;
async function accessToken() {
  if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.token;
  const cfg = await getConfig<ZohoConfig & { accounts?: string }>("zoho");
  if (!cfg?.refreshToken) throw new ZohoError("WorkDrive isn't connected yet. Click Connect WorkDrive first.", 409);
  const r = await fetch((cfg.accounts || ACCOUNTS) + "/oauth/v2/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token", refresh_token: cfg.refreshToken,
      client_id: process.env.ZOHO_CLIENT_ID || "", client_secret: process.env.ZOHO_CLIENT_SECRET || "",
    }),
  });
  const d = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!d.access_token) throw new ZohoError("WorkDrive access has expired or was removed. Click Connect WorkDrive again." + (d.error ? ` (${d.error})` : ""), 409);
  cachedToken = { token: d.access_token, exp: Date.now() + ((d.expires_in ?? 3600) - 120) * 1000 };
  return cachedToken.token;
}

export async function zohoStatus() {
  const cfg = await getConfig<ZohoConfig>("zoho");
  return cfg ? { connected: true, connectedBy: cfg.connectedBy, connectedAt: cfg.connectedAt } : { connected: false };
}

/** Name and last-modified time of the SOP file. */
export async function sopFileInfo(): Promise<{ name: string; modified: string }> {
  const r = await fetch(`${API}/workdrive/api/v1/files/${SOP_FILE_ID}`, {
    headers: { Authorization: "Zoho-oauthtoken " + (await accessToken()), Accept: "application/vnd.api+json" },
    cache: "no-store",
  });
  if (!r.ok) throw new ZohoError(`Couldn't read the SOP file details from WorkDrive (${r.status}).`);
  const d = (await r.json()) as { data?: { attributes?: { name?: string; modified_time_in_millisecond?: number | string } } };
  const a = d.data?.attributes ?? {};
  return { name: a.name ?? "Master SOP", modified: a.modified_time_in_millisecond ? new Date(Number(a.modified_time_in_millisecond)).toISOString() : "" };
}

/** Downloads the SOP (exported as .docx by WorkDrive) and returns its text. */
export async function sopText(): Promise<string> {
  const token = await accessToken();
  const urls = [
    `${API}/workdrive/api/v1/download/${SOP_FILE_ID}`,
    `https://workdrive.zoho.com/api/v1/download/${SOP_FILE_ID}`,
    `https://download.zoho.com/v1/workdrive/download/${SOP_FILE_ID}`,
  ];
  let last = 0;
  for (const u of urls) {
    const r = await fetch(u, { headers: { Authorization: "Zoho-oauthtoken " + token }, cache: "no-store" });
    last = r.status;
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.subarray(0, 2).toString() !== "PK") continue; // not a .docx
    const { value } = await mammoth.extractRawText({ buffer: buf });
    if (value.trim().length > 500) return value;
  }
  throw new ZohoError(`Couldn't download the Master SOP from WorkDrive (${last || "unknown error"}).`);
}
