// Copies the knowledge base from the repo root into frontend/data so the app can import it.
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../knowledge-base/knowledge_base.json");
const dest = resolve(here, "../data/knowledge_base.json");
if (!existsSync(src)) { console.error("Knowledge base not found at " + src); process.exit(1); }
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("Copied knowledge base -> data/knowledge_base.json");
