import { NextResponse } from "next/server";
import { currentEditor } from "@/lib/auth";
import { ConflictError } from "@/lib/db";

/** Runs fn with the signed-in editor's name, or returns 401. Maps conflicts to 409. */
export async function withEditor(fn: (name: string) => Promise<Response>) {
  const name = await currentEditor();
  if (!name) return NextResponse.json({ error: "Sign in as an editor first." }, { status: 401 });
  try { return await fn(name); }
  catch (e) {
    if (e instanceof ConflictError) return NextResponse.json({ error: e.message, current: e.current }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
