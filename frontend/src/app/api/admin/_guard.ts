import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { ConflictError } from "@/lib/db";

/** For the nightly refresh and Claude's direct updates: Bearer ADMIN_API_KEY. */
export async function withAdmin(req: Request, fn: () => Promise<Response>) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  try { return await fn(); }
  catch (e) {
    if (e instanceof ConflictError) return NextResponse.json({ error: e.message, current: e.current }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
