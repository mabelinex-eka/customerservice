import "server-only";

export class ClaudeError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

/** Calls the Claude Messages API and parses a JSON object from the reply. */
export async function askClaudeJson<T>(system: string, user: string): Promise<T> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ClaudeError("The AI answer service isn't set up yet (ANTHROPIC_API_KEY missing).", 503);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 1800,
      system,
      messages: [{ role: "user", content: user }],
    }),
    cache: "no-store",
  });
  if (res.status === 429) throw new ClaudeError("Too many questions at once. Wait a minute and try again.", 429);
  if (!res.ok) throw new ClaudeError(`The AI service returned an error (${res.status}).`, 502);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new ClaudeError("The AI reply couldn't be read. Try again.", 502);
  try { return JSON.parse(text.slice(start, end + 1)) as T; }
  catch { throw new ClaudeError("The AI reply couldn't be read. Try again.", 502); }
}

export const MAX_INPUT = 3000;
export function cleanInput(v: unknown) {
  return typeof v === "string" ? v.trim().slice(0, MAX_INPUT) : "";
}
