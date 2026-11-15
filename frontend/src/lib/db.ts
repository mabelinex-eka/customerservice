import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, BatchWriteCommand, UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import seed from "../../data/knowledge_base.json";
import type { KB, SopEntry, Playbook, Checklist, QuizQ, Meta } from "./kb";

/* ------------------------------------------------------------------ *
 * Single-table layout (key attribute names come from the Vercel
 * DynamoDB integration):
 *   KB#sop | KB#playbooks | KB#checklist | KB#quiz   sk = entry id
 *   KB#meta                                          sk = "info"
 *   LOG                                              sk = ISO time#rand
 *   FEEDBACK                                         sk = ISO time#rand
 * KB items: { data, version, updatedAt, updatedBy, humanEdited, suggestion? }
 * ------------------------------------------------------------------ */

const PK = process.env.DYNAMODB_TABLE_PARTITION_KEY || "pk";
const SK = process.env.DYNAMODB_TABLE_SORT_KEY || "sk";
const TABLE = process.env.DYNAMODB_TABLE_NAME || "cs-answer-desk";

export const COLLECTIONS = ["sop", "playbooks", "checklist", "quiz", "meta"] as const;
export type Collection = (typeof COLLECTIONS)[number];
export const isCollection = (c: string): c is Collection => (COLLECTIONS as readonly string[]).includes(c);

let doc: DynamoDBDocumentClient | null = null;
function client() {
  if (doc) return doc;
  const base = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-southeast-1",
    ...(process.env.AWS_ROLE_ARN ? { credentials: awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN }) } : {}),
    ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
  });
  doc = DynamoDBDocumentClient.from(base, { marshallOptions: { removeUndefinedValues: true } });
  return doc;
}

export type Suggestion = { data: Record<string, unknown>; reason: string; by: string; at: string };
export type KbItem<T = Record<string, unknown>> = {
  id: string; data: T; version: number; updatedAt: string; updatedBy: string; humanEdited: boolean; suggestion?: Suggestion;
};

const key = (pk: string, sk: string) => ({ [PK]: pk, [SK]: sk });
const rand = () => Math.random().toString(36).slice(2, 8);
const nowIso = () => new Date().toISOString();

async function queryAll(pk: string, opts: { limit?: number; newestFirst?: boolean } = {}) {
  const out: Record<string, unknown>[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const r = await client().send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": PK },
      ExpressionAttributeValues: { ":pk": pk },
      ExclusiveStartKey: start,
      ScanIndexForward: !opts.newestFirst,
      Limit: opts.limit,
    }));
    out.push(...((r.Items ?? []) as Record<string, unknown>[]));
    start = r.LastEvaluatedKey as Record<string, unknown> | undefined;
    if (opts.limit && out.length >= opts.limit) break;
  } while (start);
  return out;
}

function toItem<T = Record<string, unknown>>(raw: Record<string, unknown>): KbItem<T> {
  return {
    id: String(raw[SK]), data: raw.data as T, version: Number(raw.version ?? 1),
    updatedAt: String(raw.updatedAt ?? ""), updatedBy: String(raw.updatedBy ?? ""),
    humanEdited: !!raw.humanEdited, suggestion: raw.suggestion as Suggestion | undefined,
  };
}

/* ---------------------------- seeding ----------------------------- */

let seeded = false;
/** Loads the bundled knowledge_base.json into an empty table, once. */
export async function ensureSeeded() {
  if (seeded) return;
  const meta = await client().send(new GetCommand({ TableName: TABLE, Key: key("KB#meta", "info") }));
  if (meta.Item) { seeded = true; return; }
  const s = seed as unknown as { sop: SopEntry[]; playbooks: Playbook[]; checklist: Checklist[]; quiz: QuizQ[]; meta: Meta[] | Meta };
  const at = nowIso();
  const items: Record<string, unknown>[] = [];
  for (const c of ["sop", "playbooks", "checklist", "quiz"] as const) {
    for (const d of s[c]) items.push({ ...key("KB#" + c, d.id), data: d, version: 1, updatedAt: at, updatedBy: "initial import", humanEdited: false });
  }
  for (let i = 0; i < items.length; i += 25) {
    let req: Record<string, unknown[]> | undefined = { [TABLE]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) };
    for (let tries = 0; req && Object.keys(req).length && tries < 5; tries++) {
      const r = await client().send(new BatchWriteCommand({ RequestItems: req as never }));
      req = r.UnprocessedItems as Record<string, unknown[]> | undefined;
    }
  }
  const m = Array.isArray(s.meta) ? s.meta[0] ?? {} : s.meta;
  try {
    await client().send(new PutCommand({
      TableName: TABLE, ConditionExpression: "attribute_not_exists(#pk)", ExpressionAttributeNames: { "#pk": PK },
      Item: { ...key("KB#meta", "info"), data: m, version: 1, updatedAt: at, updatedBy: "initial import", humanEdited: false },
    }));
    await log({ collection: "meta", id: "info", action: "seed", by: "initial import", note: `Imported ${items.length} items from knowledge_base.json` });
  } catch { /* another request seeded first */ }
  seeded = true;
}

/* ----------------------------- reads ------------------------------ */

export async function listCollection<T>(c: Collection): Promise<KbItem<T>[]> {
  await ensureSeeded();
  return (await queryAll("KB#" + c)).map((r) => toItem<T>(r));
}

const byOrder = <T extends { order?: number }>(a: T[]) => [...a].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));

/** The knowledge base as the agents' site uses it (retired entries removed). */
export async function loadKB(): Promise<KB> {
  await ensureSeeded();
  const [sop, playbooks, checklist, quiz, meta] = await Promise.all([
    listCollection<SopEntry>("sop"), listCollection<Playbook>("playbooks"),
    listCollection<Checklist>("checklist"), listCollection<QuizQ>("quiz"), listCollection<Meta>("meta"),
  ]);
  return {
    sop: byOrder(sop.map((i) => i.data).filter((e) => e.status !== "retired")),
    playbooks: byOrder(playbooks.map((i) => i.data)),
    checklist: byOrder(checklist.map((i) => i.data)),
    quiz: byOrder(quiz.map((i) => i.data)),
    meta: meta.find((m) => m.id === "info")?.data ?? {},
  };
}

export async function getItem<T = Record<string, unknown>>(c: Collection, id: string): Promise<KbItem<T> | null> {
  const r = await client().send(new GetCommand({ TableName: TABLE, Key: key("KB#" + c, id) }));
  return r.Item ? toItem<T>(r.Item as Record<string, unknown>) : null;
}

/* ----------------------------- writes ----------------------------- */

export class ConflictError extends Error {
  constructor(public current: KbItem | null) { super("This entry was changed by someone else. Reload it and try again."); }
}

/**
 * Saves an item. expectedVersion: the version the writer last read (0 = must be new).
 * mode "human": editor or a direct request — overwrites and marks humanEdited.
 * mode "refresh": nightly refresh — if a person edited the entry, the change is
 *   stored as a suggestion instead of overwriting.
 */
export async function saveItem(c: Collection, id: string, data: Record<string, unknown>, opts: {
  expectedVersion: number; by: string; mode: "human" | "refresh"; reason?: string;
}): Promise<{ result: "saved" | "suggested"; item: KbItem }> {
  const current = await getItem(c, id);
  if ((current?.version ?? 0) !== opts.expectedVersion) throw new ConflictError(current);
  const at = nowIso();
  if (opts.mode === "refresh" && current?.humanEdited) {
    const suggestion: Suggestion = { data, reason: opts.reason || "Source changed", by: opts.by, at };
    await client().send(new UpdateCommand({
      TableName: TABLE, Key: key("KB#" + c, id),
      UpdateExpression: "SET suggestion = :s, version = :nv, updatedAt = :at",
      ConditionExpression: "version = :v",
      ExpressionAttributeValues: { ":s": suggestion, ":nv": current.version + 1, ":at": at, ":v": current.version },
    })).catch((e) => { if (e?.name === "ConditionalCheckFailedException") throw new ConflictError(current); throw e; });
    await log({ collection: c, id, action: "suggest", by: opts.by, before: current.data, after: data, note: opts.reason });
    return { result: "suggested", item: { ...current, suggestion, version: current.version + 1, updatedAt: at } };
  }
  const item = {
    ...key("KB#" + c, id), data, version: (current?.version ?? 0) + 1, updatedAt: at, updatedBy: opts.by,
    humanEdited: opts.mode === "human" ? true : !!current?.humanEdited,
  };
  try {
    await client().send(new PutCommand({
      TableName: TABLE, Item: item,
      ConditionExpression: current ? "version = :v" : "attribute_not_exists(#pk)",
      ExpressionAttributeNames: current ? undefined : { "#pk": PK },
      ExpressionAttributeValues: current ? { ":v": current.version } : undefined,
    }));
  } catch (e) {
    if ((e as { name?: string })?.name === "ConditionalCheckFailedException") throw new ConflictError(await getItem(c, id));
    throw e;
  }
  await log({ collection: c, id, action: current ? "update" : "create", by: opts.by, before: current?.data, after: data, note: opts.reason });
  return { result: "saved", item: toItem(item) };
}

/** Accept (apply) or reject a pending refresh suggestion. */
export async function resolveSuggestion(c: Collection, id: string, accept: boolean, expectedVersion: number, by: string) {
  const current = await getItem(c, id);
  if (!current || current.version !== expectedVersion) throw new ConflictError(current);
  if (!current.suggestion) return current;
  const at = nowIso();
  const data = accept ? current.suggestion.data : current.data;
  const item = { ...key("KB#" + c, id), data, version: current.version + 1, updatedAt: at, updatedBy: by, humanEdited: true };
  await client().send(new PutCommand({
    TableName: TABLE, Item: item, ConditionExpression: "version = :v", ExpressionAttributeValues: { ":v": current.version },
  })).catch((e) => { if (e?.name === "ConditionalCheckFailedException") throw new ConflictError(current); throw e; });
  await log({ collection: c, id, action: accept ? "accept-suggestion" : "reject-suggestion", by, before: current.data, after: data, note: current.suggestion.reason });
  return toItem(item);
}

/* --------------------------- change log --------------------------- */

export type LogEntry = { at: string; collection: string; id: string; action: string; by: string; before?: unknown; after?: unknown; note?: string };
export async function log(e: Omit<LogEntry, "at">) {
  const at = nowIso();
  await client().send(new PutCommand({ TableName: TABLE, Item: { ...key("LOG", `${at}#${rand()}`), at, ...e } }));
}
export async function recentLog(limit = 100, id?: string): Promise<LogEntry[]> {
  const rows = (await queryAll("LOG", { limit: id ? 1000 : limit, newestFirst: true })) as unknown as LogEntry[];
  return (id ? rows.filter((r) => r.id === id) : rows).slice(0, limit);
}

/* ---------------------------- feedback ---------------------------- */

export type Feedback = { key: string; at: string; kind: string; subject: string; answer?: string; note?: string; name?: string; status: "open" | "resolved"; resolvedBy?: string };
export async function addFeedback(f: Omit<Feedback, "key" | "at" | "status">) {
  const at = nowIso(); const sk = `${at}#${rand()}`;
  await client().send(new PutCommand({ TableName: TABLE, Item: { ...key("FEEDBACK", sk), at, status: "open", ...f } }));
}
export async function listFeedback(): Promise<Feedback[]> {
  return (await queryAll("FEEDBACK", { limit: 500, newestFirst: true })).map((r) => ({ ...(r as unknown as Feedback), key: String(r[SK]) }));
}
export async function resolveFeedback(sk: string, by: string) {
  await client().send(new UpdateCommand({
    TableName: TABLE, Key: key("FEEDBACK", sk), UpdateExpression: "SET #s = :r, resolvedBy = :b",
    ConditionExpression: "attribute_exists(#pk)", ExpressionAttributeNames: { "#s": "status", "#pk": PK },
    ExpressionAttributeValues: { ":r": "resolved", ":b": by },
  }));
}
